import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import { uploadFile, deleteFile } from "@shared/utils/storage";
import { Document } from "@modules/documents/document.model";
import { Player } from "@modules/players/player.model";
import { sequelize } from "@config/database";
import {
  MedicalReport,
  MedicalLabResult,
  ParseStatus,
  LabFlag,
} from "./medicalReports.model";
import type {
  ListQuery,
  UpdateReportInput,
  LabResultInput,
} from "./medicalReports.validation";

// ── Types ────────────────────────────────────────────────

export interface UploadReportInput {
  playerId: string;
  provider?: string;
  reportType?: string;
  reportDate?: string;
  collectedDate?: string;
  summaryNotes?: string;
}

export interface ParsedLabResult {
  category: string | null;
  name: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  flag: LabFlag;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  refRangeText: string | null;
  comment: string | null;
}

export type LabProvider = "delta" | "quest" | "unknown";

// ── List / Get / Update / Delete ─────────────────────────

export async function listReports(query: ListQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;

  const { rows, count } = await MedicalReport.findAndCountAll({
    where,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    order: [
      ["reportDate", "DESC NULLS LAST"],
      ["createdAt", "DESC"],
    ],
    include: [
      {
        model: MedicalLabResult,
        as: "labResults",
        attributes: ["id"], // counts only; caller hits GET /:id for full values
      },
    ],
  });

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / query.limit)),
    },
  };
}

export async function getReport(id: string) {
  const report = await MedicalReport.findByPk(id, {
    include: [
      {
        model: MedicalLabResult,
        as: "labResults",
        separate: true,
        order: [["sortOrder", "ASC"]],
      },
      { model: Document, as: "document" },
    ],
  });
  if (!report) throw new AppError("Medical report not found", 404);
  return report;
}

export async function updateReport(id: string, input: UpdateReportInput) {
  const report = await MedicalReport.findByPk(id);
  if (!report) throw new AppError("Medical report not found", 404);
  await report.update(input);
  return getReport(id);
}

export async function updateLabResults(
  id: string,
  labResults: LabResultInput[],
) {
  const report = await MedicalReport.findByPk(id);
  if (!report) throw new AppError("Medical report not found", 404);

  await sequelize.transaction(async (tx) => {
    // Simple strategy: delete all, re-insert. Small row counts per report
    // (usually < 50), so this is cheap and avoids diff logic complexity.
    await MedicalLabResult.destroy({
      where: { medicalReportId: id },
      transaction: tx,
    });

    if (labResults.length > 0) {
      await MedicalLabResult.bulkCreate(
        labResults.map((r, idx) => ({
          medicalReportId: id,
          category: r.category ?? null,
          name: r.name,
          valueNumeric: r.valueNumeric ?? null,
          valueText: r.valueText ?? null,
          unit: r.unit ?? null,
          flag: r.flag ?? null,
          refRangeLow: r.refRangeLow ?? null,
          refRangeHigh: r.refRangeHigh ?? null,
          refRangeText: r.refRangeText ?? null,
          comment: r.comment ?? null,
          sortOrder: r.sortOrder ?? idx,
        })),
        { transaction: tx },
      );
    }

    await report.update(
      { parseStatus: "manual" as ParseStatus },
      { transaction: tx },
    );
  });

  return getReport(id);
}

export async function deleteReport(id: string) {
  const report = await MedicalReport.findByPk(id, {
    include: [{ model: Document, as: "document" }],
  });
  if (!report) throw new AppError("Medical report not found", 404);

  const doc = report.get("document") as Document | undefined;
  const gcsKey = doc?.fileUrl ?? null;

  // Cascade deletes lab_results (ON DELETE CASCADE) + documents (FK)
  await report.destroy();

  // Best-effort GCS cleanup — the DB row is already gone, so failures
  // here just leave an orphan blob. Don't throw.
  if (gcsKey && !gcsKey.startsWith("http")) {
    deleteFile(gcsKey).catch((err) => {
      logger.warn(
        `[medicalReports] Failed to delete PDF blob ${gcsKey}: ${err?.message ?? err}`,
      );
    });
  }

  return { id };
}

// ── Upload + parse ───────────────────────────────────────

export async function uploadReport(
  file: Express.Multer.File,
  input: UploadReportInput,
  uploadedBy: string,
) {
  // Sanity: player must exist
  const player = await Player.findByPk(input.playerId, { attributes: ["id"] });
  if (!player) throw new AppError("Player not found", 404);

  // 1. Upload PDF to storage
  const result = await uploadFile({
    folder: "documents",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: false,
  }).catch((err) => {
    logger.error("[medicalReports] PDF storage upload failed", err);
    throw new AppError("Failed to store PDF", 502);
  });

  // 2. Create Document + MedicalReport in a transaction
  const { report } = await sequelize.transaction(async (tx) => {
    const doc = await Document.create(
      {
        name: file.originalname,
        type: "Medical",
        status: "Active",
        fileUrl: result.url,
        fileSize: result.size,
        mimeType: result.mimeType,
        entityType: "Player",
        entityId: input.playerId,
        uploadedBy,
      },
      { transaction: tx },
    );

    const report = await MedicalReport.create(
      {
        playerId: input.playerId,
        documentId: doc.id,
        provider: input.provider ?? null,
        reportType: input.reportType ?? null,
        reportDate: input.reportDate ?? null,
        collectedDate: input.collectedDate ?? null,
        summaryNotes: input.summaryNotes ?? null,
        parseStatus: "pending",
        uploadedBy,
      },
      { transaction: tx },
    );

    return { doc, report };
  });

  // 3. Parse PDF text (outside the transaction — safe to fail)
  let parseStatus: ParseStatus = "failed";
  let parsedCount = 0;
  try {
    const parsed = await parsePdfBuffer(file.buffer);
    if (parsed.labResults.length > 0) {
      await MedicalLabResult.bulkCreate(
        parsed.labResults.map((r, idx) => ({
          medicalReportId: report.id,
          category: r.category,
          name: r.name,
          valueNumeric: r.valueNumeric,
          valueText: r.valueText,
          unit: r.unit,
          flag: r.flag,
          refRangeLow: r.refRangeLow,
          refRangeHigh: r.refRangeHigh,
          refRangeText: r.refRangeText,
          comment: r.comment,
          sortOrder: idx,
        })),
      );
      parseStatus = "parsed";
      parsedCount = parsed.labResults.length;
    }

    // If admin didn't pass metadata, enrich from parsed header
    const patch: Partial<UpdateReportInput> & {
      provider?: string | null;
      reportDate?: string | null;
      collectedDate?: string | null;
      reservationId?: string | null;
    } = {};
    if (!input.provider && parsed.provider) patch.provider = parsed.provider;
    if (!input.reportDate && parsed.reportDate)
      patch.reportDate = parsed.reportDate;
    if (!input.collectedDate && parsed.collectedDate)
      patch.collectedDate = parsed.collectedDate;
    if (parsed.reservationId) patch.reservationId = parsed.reservationId;
    if (Object.keys(patch).length > 0) await report.update(patch);
  } catch (err) {
    logger.warn(
      `[medicalReports] PDF parse failed for report ${report.id}: ${(err as Error)?.message ?? err}`,
    );
  }

  await report.update({ parseStatus });

  logger.info(
    `[medicalReports] Uploaded report ${report.id} for player ${input.playerId} — parsed ${parsedCount} rows`,
  );

  return getReport(report.id);
}

// ── PDF parser ───────────────────────────────────────────

interface ParsedPdf {
  provider: string | null;
  reportDate: string | null;
  collectedDate: string | null;
  reservationId: string | null;
  labResults: ParsedLabResult[];
}

/**
 * Parse a PDF buffer and extract lab values. Falls back gracefully on unknown
 * layouts — an unparseable PDF returns `{ labResults: [] }` with provider set
 * where detectable, and the caller marks the report as `parseStatus='failed'`
 * so the admin can type values manually.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdf> {
  // Dynamic import — pdf-parse's top-level module tries to open a test file
  // at require-time in some setups, so deferring to runtime avoids boot issues.
  const pdfParseModule = (await import("pdf-parse")) as unknown as {
    default?: (buf: Buffer) => Promise<{ text?: string }>;
  } & ((buf: Buffer) => Promise<{ text?: string }>);
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const parsed = await pdfParse(buffer);
  const text: string = typeof parsed?.text === "string" ? parsed.text : "";

  const provider = detectProvider(text);
  let labResults: ParsedLabResult[] = [];
  if (provider === "delta") labResults = parseDelta(text);
  else if (provider === "quest") labResults = parseQuest(text);
  else labResults = parseGeneric(text); // fallback for any other structured PDF

  return {
    provider:
      provider === "delta"
        ? "Delta Medical Labs"
        : provider === "quest"
          ? "Quest Diagnostics"
          : null,
    reportDate: extractReportDate(text),
    collectedDate: extractCollectedDate(text),
    reservationId: extractReservationId(text),
    labResults,
  };
}

export function detectProvider(text: string): LabProvider {
  const lower = text.toLowerCase();
  if (
    lower.includes("delta medical") ||
    lower.includes("delta-medlab") ||
    lower.includes("دلتا")
  ) {
    return "delta";
  }
  if (lower.includes("quest diagnostics") || lower.includes("questquantum")) {
    return "quest";
  }
  return "unknown";
}

// ── Delta Medical parser ────────────────────────────────
//
// Delta Medical reports follow a predictable text layout when extracted by
// pdf-parse. Example lines (each test spans ~3 consecutive lines):
//
//   Creatine Kinase (CK - Total), Serum 476.91 U/L H
//   Reference Range : 30 - 200
//   Reported At 03/03/26 00:04 Validated by ...
//
// The parser walks lines, detects category headers, then captures test rows
// by matching <name> <value> <unit> [H|L|N] on one line, followed by an
// optional Reference Range line and an optional Comment line.

const DELTA_CATEGORY_HEADERS = new Set([
  "Blood Tests",
  "Hormones",
  "Vitamins",
  "Anemia",
  "Liver Function",
  "Kidney Function",
  "Electrolytes and Minerals",
  "Thyroid Profile",
  "Diabetes Profile",
]);

const FLAGS: ReadonlySet<string> = new Set(["H", "L", "N"]);

// Match e.g. "Creatine Kinase (CK - Total), Serum 476.91 U/L H"
// Groups: (name) (value with optional sign/decimal) (unit tail) (flag?)
const DELTA_TEST_ROW =
  /^(.+?)\s+(-?\d+(?:[.,]\d+)?)\s*([A-Za-zµμ/%^0-9\s.-]*?)\s*(H|L|N)?\s*$/;

// "Reference Range : 30 - 200"  or  "Reference Range : ≤ 55"  or  "Reference Range : 0.38 - 19.64"
const DELTA_REF_RANGE_LINE = /^Reference\s*Range\s*:\s*(.+)$/i;

export function parseDelta(text: string): ParsedLabResult[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: ParsedLabResult[] = [];
  let currentCategory: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip header/footer noise
    if (
      line.startsWith("Patient") ||
      line.startsWith("Registered At") ||
      line.startsWith("Reported At") ||
      line.startsWith("Collected At") ||
      line.startsWith("Received At") ||
      line.startsWith("Validated by") ||
      line.startsWith("Approved by") ||
      line.startsWith("Page ") ||
      /^\d+\s*\/\s*\d+$/.test(line)
    ) {
      i++;
      continue;
    }

    // Category header
    if (DELTA_CATEGORY_HEADERS.has(line)) {
      currentCategory = line;
      i++;
      continue;
    }

    // Try to match a test row
    const testMatch = line.match(DELTA_TEST_ROW);
    if (testMatch) {
      const [, rawName, rawValue, rawUnit, rawFlag] = testMatch;
      const name = rawName.trim();

      // Guard against catching stray numeric lines that aren't tests
      // (e.g. short names < 3 chars are unlikely to be real test names)
      if (name.length >= 3 && !/^\d/.test(name)) {
        const valueNumeric = Number(rawValue.replace(",", "."));
        const unit = rawUnit.trim() || null;
        const flag: LabFlag =
          rawFlag && FLAGS.has(rawFlag) ? (rawFlag as LabFlag) : null;

        // Look ahead for reference range line
        let refRangeLow: number | null = null;
        let refRangeHigh: number | null = null;
        let refRangeText: string | null = null;
        let comment: string | null = null;

        if (i + 1 < lines.length) {
          const next = lines[i + 1];
          const refMatch = next.match(DELTA_REF_RANGE_LINE);
          if (refMatch) {
            const range = refMatch[1].trim();
            const numericRange = range.match(
              /^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)/,
            );
            if (numericRange) {
              refRangeLow = Number(numericRange[1].replace(",", "."));
              refRangeHigh = Number(numericRange[2].replace(",", "."));
            } else {
              refRangeText = range;
            }
            i++; // consume the range line
          }
        }

        // Optional comment block
        if (i + 1 < lines.length && lines[i + 1].startsWith("Comment")) {
          // Gather subsequent lines until we hit "Reported At" or a blank
          const parts: string[] = [];
          let j = i + 2;
          while (
            j < lines.length &&
            !lines[j].startsWith("Reported At") &&
            !lines[j].startsWith("Validated by") &&
            !lines[j].startsWith("Approved by") &&
            !DELTA_CATEGORY_HEADERS.has(lines[j]) &&
            !lines[j].match(DELTA_TEST_ROW)
          ) {
            parts.push(lines[j]);
            j++;
          }
          comment = parts.join(" ").trim() || null;
          i = j - 1;
        }

        if (Number.isFinite(valueNumeric)) {
          out.push({
            category: currentCategory,
            name,
            valueNumeric,
            valueText: `${rawValue}${unit ? ` ${unit}` : ""}`.trim(),
            unit,
            flag,
            refRangeLow,
            refRangeHigh,
            refRangeText,
            comment,
          });
        }
      }
    }

    i++;
  }

  return out;
}

// ── Quest Diagnostics parser ────────────────────────────
//
// Quest layout is looser (single-page summary table with rows like):
//   EPA+DPA+DHA        4.7
//   Reference Range: >5.4 % by wt
// or:
//   DHA                3.3
//   Reference Range: 1.4-5.1 % by wt
//
// We capture "name value" pairs on one line and look ahead for a Reference
// Range line. Lower fidelity than Delta — rows with comment blocks or
// multi-line names may be missed, which is acceptable per plan.

const QUEST_NAME_VALUE =
  /^([A-Za-z][A-Za-z0-9\s\-+/,()]+?)\s+(-?\d+(?:[.,]\d+)?)\s*$/;
const QUEST_REF_RANGE =
  /^Reference\s*Range:\s*(?:>=|>|<=|<|≥|≤)?\s*(-?\d+(?:[.,]\d+)?)\s*(?:-\s*(-?\d+(?:[.,]\d+)?))?\s*(.*)$/i;

export function parseQuest(text: string): ParsedLabResult[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: ParsedLabResult[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip noise
    if (
      line.startsWith("DOB:") ||
      line.startsWith("Sex:") ||
      line.startsWith("Patient ID") ||
      line.startsWith("Specimen:") ||
      line.startsWith("Requisition:") ||
      line.startsWith("Report Status") ||
      line.startsWith("Collected:") ||
      line.startsWith("Received:") ||
      line.startsWith("Reported:") ||
      line.startsWith("Client #") ||
      line.startsWith("FINAL") ||
      line.startsWith("Historical") ||
      line.startsWith("No Historical")
    ) {
      i++;
      continue;
    }

    const match = line.match(QUEST_NAME_VALUE);
    if (match) {
      const [, rawName, rawValue] = match;
      const name = rawName.trim();
      if (name.length < 3 || /^\d/.test(name)) {
        i++;
        continue;
      }

      const valueNumeric = Number(rawValue.replace(",", "."));
      let unit: string | null = null;
      let refRangeLow: number | null = null;
      let refRangeHigh: number | null = null;
      let refRangeText: string | null = null;

      // Look ahead for reference range
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        const refMatch = next.match(QUEST_REF_RANGE);
        if (refMatch) {
          refRangeLow = Number(refMatch[1].replace(",", "."));
          if (refMatch[2]) {
            refRangeHigh = Number(refMatch[2].replace(",", "."));
          }
          if (refMatch[3]) {
            unit = refMatch[3].trim() || null;
          }
          i++; // consume the range line
        }
      }

      if (Number.isFinite(valueNumeric)) {
        out.push({
          category: "OmegaCheck",
          name,
          valueNumeric,
          valueText: `${rawValue}${unit ? ` ${unit}` : ""}`.trim(),
          unit,
          flag: null, // Quest doesn't use H/L/N flags the same way
          refRangeLow,
          refRangeHigh,
          refRangeText,
          comment: null,
        });
      }
    }

    i++;
  }

  return out;
}

// ── Generic fallback parser ─────────────────────────────
//
// Applied when the provider is unrecognised. Uses the same test-row regex as
// Delta but without requiring known category headers — any line matching
// <name> <numeric> [unit] [H|L|N] is captured, with the optional
// "Reference Range : …" lookahead. Enough to extract values from most
// structured lab PDFs that have a text layer.

// Common noise prefixes found across many lab systems
const GENERIC_NOISE_PREFIXES = [
  "Patient",
  "Registered",
  "Reported",
  "Collected",
  "Received",
  "Validated",
  "Approved",
  "Page ",
  "DOB",
  "Sex:",
  "Specimen",
  "Requisition",
  "Report Status",
  "Client #",
  "FINAL",
  "Historical",
  "Lab ID",
  "Order #",
  "Physician",
  "Accession",
  "Fax",
  "Tel",
  "Phone",
  "Address",
  "Date of",
];

export function parseGeneric(text: string): ParsedLabResult[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: ParsedLabResult[] = [];
  let currentCategory: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip noise
    if (GENERIC_NOISE_PREFIXES.some((p) => line.startsWith(p))) {
      i++;
      continue;
    }

    // Short all-caps or title-case lines with no numbers → likely category headers
    if (
      line.length < 80 &&
      !/\d/.test(line) &&
      /^[A-Za-zÀ-ÿ\s\-/()&,]+$/.test(line) &&
      line.length > 3
    ) {
      // Could be a section header — track it but don't break
      currentCategory = line;
      i++;
      continue;
    }

    const testMatch = line.match(DELTA_TEST_ROW);
    if (testMatch) {
      const [, rawName, rawValue, rawUnit, rawFlag] = testMatch;
      const name = rawName.trim();

      if (name.length >= 3 && !/^\d/.test(name)) {
        const valueNumeric = Number(rawValue.replace(",", "."));
        const unit = rawUnit.trim() || null;
        const flag: LabFlag =
          rawFlag && FLAGS.has(rawFlag) ? (rawFlag as LabFlag) : null;

        let refRangeLow: number | null = null;
        let refRangeHigh: number | null = null;
        let refRangeText: string | null = null;

        if (i + 1 < lines.length) {
          const next = lines[i + 1];
          const refMatch = next.match(DELTA_REF_RANGE_LINE);
          if (refMatch) {
            const range = refMatch[1].trim();
            const numericRange = range.match(
              /^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)/,
            );
            if (numericRange) {
              refRangeLow = Number(numericRange[1].replace(",", "."));
              refRangeHigh = Number(numericRange[2].replace(",", "."));
            } else {
              refRangeText = range;
            }
            i++;
          }
        }

        if (Number.isFinite(valueNumeric)) {
          out.push({
            category: currentCategory,
            name,
            valueNumeric,
            valueText: `${rawValue}${unit ? ` ${unit}` : ""}`.trim(),
            unit,
            flag,
            refRangeLow,
            refRangeHigh,
            refRangeText,
            comment: null,
          });
        }
      }
    }

    i++;
  }

  return out;
}

// ── Header metadata extractors ──────────────────────────

function extractReportDate(text: string): string | null {
  // "Reported At 03/03/26 00:04"
  const m = text.match(/Reported\s*At[:\s]*(\d{2})\/(\d{2})\/(\d{2,4})/i);
  if (!m) return null;
  const [, dd, mm, yyRaw] = m;
  const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
  return `${yy}-${mm}-${dd}`;
}

function extractCollectedDate(text: string): string | null {
  const m = text.match(/Collected\s*At[:\s]*(\d{2})\/(\d{2})\/(\d{2,4})/i);
  if (!m) return null;
  const [, dd, mm, yyRaw] = m;
  const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
  return `${yy}-${mm}-${dd}`;
}

function extractReservationId(text: string): string | null {
  const m = text.match(/Reservation\s*ID[:\s]*(\d+)/i);
  return m ? m[1] : null;
}
