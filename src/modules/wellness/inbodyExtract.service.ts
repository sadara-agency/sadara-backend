import { logger } from "@config/logger";

// ── Public types ───────────────────────────────────────────────────────────

export type ExtractSource = "pdf-text" | "ocr";

/**
 * Subset of CreateScanPayload that the extractor can populate. Fields the
 * extractor cannot identify with confidence are omitted entirely (caller
 * treats missing keys as "needs manual entry").
 */
export interface ExtractedInBody {
  scanDate?: string | null;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  leanBodyMassKg?: number | null;
  skeletalMuscleMassKg?: number | null;
  totalBodyWaterKg?: number | null;
  proteinKg?: number | null;
  mineralKg?: number | null;
  segLeanRightArmKg?: number | null;
  segLeanLeftArmKg?: number | null;
  segLeanTrunkKg?: number | null;
  segLeanRightLegKg?: number | null;
  segLeanLeftLegKg?: number | null;
  segFatRightArmKg?: number | null;
  segFatLeftArmKg?: number | null;
  segFatTrunkKg?: number | null;
  segFatRightLegKg?: number | null;
  segFatLeftLegKg?: number | null;
  measuredBmrKcal?: number | null;
  visceralFatLevel?: number | null;
  waistHipRatio?: number | null;
  metabolicAge?: number | null;
}

export type ExtractFailReason = "image-pdf" | "ocr-failed" | "unknown";

export interface ParseResult {
  extracted: ExtractedInBody;
  source: ExtractSource;
  extractedCount: number;
  /**
   * Set when extractedCount === 0. Lets the caller surface a specific UX
   * hint — e.g. "Your PDF is an image. Please upload it as PNG instead."
   */
  failReason?: ExtractFailReason;
}

// ── Buffer parser (top-level) ──────────────────────────────────────────────

/**
 * Parse an uploaded InBody report (PDF, PNG, or JPEG) and extract numeric
 * values.
 *
 *   • PDF inputs are passed through `pdf-parse` (free, fast). Image-only
 *     PDFs (e.g. scanned printouts exported as PDF) yield empty text and
 *     are reported back with `failReason = 'image-pdf'`, so the UI can ask
 *     the user to re-upload as PNG.
 *
 *   • PNG / JPEG inputs are run through `tesseract.js` (free, on-server)
 *     with English + Arabic language data. The OCR'd text is then run
 *     through the same regex extractor as the text-PDF path.
 *
 * Always resolves — never throws on a parse failure. If nothing useful was
 * extracted, `extractedCount === 0` and the caller should signal an
 * "unreadable file" error to the user.
 */
export async function parseInBodyBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ParseResult> {
  let text = "";
  let source: ExtractSource = "ocr";
  let failReason: ExtractFailReason | undefined;

  if (mimeType === "application/pdf") {
    const pdfText = await safePdfParse(buffer);
    if (!pdfText) {
      // pdf-parse returned nothing usable. Almost always means the PDF is
      // a scanned image with no text layer — we can't OCR it without a
      // PDF→PNG rasterizer (which requires native deps we're avoiding).
      return {
        extracted: {},
        source: "pdf-text",
        extractedCount: 0,
        failReason: "image-pdf",
      };
    }
    text = pdfText;
    source = "pdf-text";
  } else if (mimeType.startsWith("image/")) {
    try {
      text = await runTesseract(buffer);
      source = "ocr";
    } catch (err) {
      logger.warn(
        `[inbodyExtract] OCR failed: ${(err as Error)?.message ?? err}`,
      );
      return {
        extracted: {},
        source: "ocr",
        extractedCount: 0,
        failReason: "ocr-failed",
      };
    }
  } else {
    return {
      extracted: {},
      source: "ocr",
      extractedCount: 0,
      failReason: "unknown",
    };
  }

  const extracted = extractInBodyValues(text);
  const extractedCount = Object.values(extracted).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  if (extractedCount === 0) failReason = "unknown";

  return { extracted, source, extractedCount, failReason };
}

// ── pdf-parse wrapper ──────────────────────────────────────────────────────

async function safePdfParse(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import — pdf-parse's top-level module tries to open a test
    // file at require-time in some setups, so deferring to runtime avoids
    // boot issues. Same pattern as medicalReports.service.ts.
    const pdfParseModule = (await import("pdf-parse")) as unknown as {
      default?: (buf: Buffer) => Promise<{ text?: string }>;
    } & ((buf: Buffer) => Promise<{ text?: string }>);
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const parsed = await pdfParse(buffer);
    const text = typeof parsed?.text === "string" ? parsed.text : "";
    if (text.trim().length < 50) return "";
    return text;
  } catch (err) {
    logger.warn(
      `[inbodyExtract] pdf-parse failed: ${(err as Error)?.message ?? err}`,
    );
    return "";
  }
}

// ── Tesseract wrapper ──────────────────────────────────────────────────────

async function runTesseract(imageBuffer: Buffer): Promise<string> {
  const tesseract = (await import("tesseract.js")) as unknown as {
    recognize: (
      img: Buffer,
      langs: string,
    ) => Promise<{ data: { text: string } }>;
  };
  const result = await tesseract.recognize(imageBuffer, "eng+ara");
  return result.data.text ?? "";
}

// ── InBody marker detection ────────────────────────────────────────────────

const INBODY_MARKERS: RegExp[] = [
  /InBody/i,
  /Body Composition Analysis/i,
  /Total Body Water/i,
  /Skeletal Muscle Mass/i,
  /Percent Body Fat/i,
  /إجمالي\s*ا?لمياه/,
  /كتلة\s*ا?لهيكل\s*ا?لعضلي/,
  /النسبة\s*ا?لمئوية\s*للدهون/,
];

export function containsInBodyMarkers(text: string): boolean {
  return INBODY_MARKERS.some((rx) => rx.test(text));
}

// ── Field extractor ────────────────────────────────────────────────────────
//
// Strategy: for each output field we define one or more (label, magnitude
// range) pattern groups. We scan the input text line by line; for each line
// containing a label, we look in a small window (±2 lines, plus the same
// line) for the first numeric token whose magnitude falls inside the field's
// expected range. This handles three real-world input shapes:
//
//   1.  "Weight  73.1 kg"             — value follows label
//   2.  "73.1 الوزن"                   — RTL: value precedes label after OCR linearization
//   3.  "Skeletal Muscle Mass\n35.0"  — value on next line (PDF text reflow)
//
// Magnitude ranges keep us from picking up reference-range numbers (e.g.
// "55 ~ 90") or % deltas as the actual measurement.

interface FieldSpec {
  labels: RegExp[];
  /** [min, max] inclusive. Reject candidates outside this range. */
  range: [number, number];
  /** Round to integer (visceralFatLevel, metabolicAge, BMR). */
  integer?: boolean;
}

const FIELDS: Record<keyof ExtractedInBody, FieldSpec | null> = {
  weightKg: {
    labels: [/\bweight\b/i, /الوزن/],
    range: [25, 250],
  },
  bodyFatPct: {
    labels: [
      /percent\s*body\s*fat/i,
      /\bbody\s*fat\b(?!\s*mass)/i,
      /\bPBF\b/,
      /النسبة\s*ا?لمئوية\s*للدهون/,
    ],
    range: [2, 70],
  },
  leanBodyMassKg: {
    labels: [/lean\s*body\s*mass/i, /\bLBM\b/, /كتلة\s*ا?لجسم\s*ا?لنحيلة/],
    range: [20, 150],
  },
  skeletalMuscleMassKg: {
    labels: [
      /skeletal\s*muscle\s*mass/i,
      /\bSMM\b/,
      /كتلة\s*ا?لهيكل\s*ا?لعضلي/,
      /كتلة\s*ا?لعضلات\s*ا?لهيكلية/,
    ],
    range: [10, 80],
  },
  totalBodyWaterKg: {
    labels: [/total\s*body\s*water/i, /\bTBW\b/, /إجمالي\s*ا?لمياه/],
    range: [15, 100],
  },
  proteinKg: {
    labels: [/\bprotein\b/i, /البروتين/],
    range: [3, 30],
  },
  mineralKg: {
    labels: [/\bminerals?\b/i, /المعادن/],
    range: [1, 10],
  },
  segLeanRightArmKg: {
    labels: [/right\s*arm.*lean/i, /lean.*right\s*arm/i],
    range: [0.5, 8],
  },
  segLeanLeftArmKg: {
    labels: [/left\s*arm.*lean/i, /lean.*left\s*arm/i],
    range: [0.5, 8],
  },
  segLeanTrunkKg: {
    labels: [/trunk.*lean/i, /lean.*trunk/i],
    range: [10, 50],
  },
  segLeanRightLegKg: {
    labels: [/right\s*leg.*lean/i, /lean.*right\s*leg/i],
    range: [3, 20],
  },
  segLeanLeftLegKg: {
    labels: [/left\s*leg.*lean/i, /lean.*left\s*leg/i],
    range: [3, 20],
  },
  segFatRightArmKg: {
    labels: [/right\s*arm.*fat/i, /fat.*right\s*arm/i],
    range: [0.05, 5],
  },
  segFatLeftArmKg: {
    labels: [/left\s*arm.*fat/i, /fat.*left\s*arm/i],
    range: [0.05, 5],
  },
  segFatTrunkKg: {
    labels: [/trunk.*fat/i, /fat.*trunk/i],
    range: [0.5, 30],
  },
  segFatRightLegKg: {
    labels: [/right\s*leg.*fat/i, /fat.*right\s*leg/i],
    range: [0.2, 12],
  },
  segFatLeftLegKg: {
    labels: [/left\s*leg.*fat/i, /fat.*left\s*leg/i],
    range: [0.2, 12],
  },
  measuredBmrKcal: {
    labels: [
      /\bBMR\b/i,
      /basal\s*metabolic\s*rate/i,
      /معدل\s*ا?لأيض\s*ا?لأساسي/,
    ],
    range: [600, 4000],
    integer: true,
  },
  visceralFatLevel: {
    labels: [/visceral\s*fat\s*level/i, /مستوى\s*ا?لدهون\s*ا?لحشوية/],
    range: [1, 30],
    integer: true,
  },
  waistHipRatio: {
    labels: [
      /waist[- ]?hip\s*ratio/i,
      /\bWHR\b/,
      /حجم\s*ا?لخصر[\s\S]{0,6}الورك/,
    ],
    range: [0.5, 1.5],
  },
  metabolicAge: {
    labels: [/metabolic\s*age/i, /ا?لعمر\s*ا?لأيضي/],
    range: [10, 120],
    integer: true,
  },
  scanDate: null, // handled separately
};

const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g;

export function extractInBodyValues(text: string): ExtractedInBody {
  if (!text) return {};

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ExtractedInBody = {};

  (Object.keys(FIELDS) as (keyof ExtractedInBody)[]).forEach((key) => {
    const spec = FIELDS[key];
    if (!spec) return;

    const match = findValueForLabels(lines, spec);
    if (match !== null) {
      result[key] = (spec.integer ? Math.round(match) : match) as never;
    }
  });

  const date = extractScanDate(text);
  if (date) result.scanDate = date;

  return result;
}

function findValueForLabels(lines: string[], spec: FieldSpec): number | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!spec.labels.some((rx) => rx.test(line))) continue;

    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length - 1, i + 2);

    // Prefer same-line, then forward proximity (label-then-value is the most
    // common shape both in text PDFs and in RTL OCR linearization), then
    // backward.
    const windowOrder: number[] = [i];
    for (let d = 1; d <= 2; d++) {
      if (i + d <= end) windowOrder.push(i + d);
      if (i - d >= start) windowOrder.push(i - d);
    }

    for (const idx of windowOrder) {
      const candidate = pickNumberInRange(lines[idx]!, spec.range);
      if (candidate !== null) return candidate;
    }
  }
  return null;
}

// Strip tokens that often live next to InBody labels but are not measurements
// (timestamps in HH:MM[:SS] form, percent signs, parens). Keeps the line's
// remaining numeric tokens intact so the in-range scanner can pick the right
// one.
const TIME_RE = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

function pickNumberInRange(
  line: string,
  range: [number, number],
): number | null {
  const cleaned = line.replace(TIME_RE, " ");
  const matches = cleaned.match(NUMBER_RE);
  if (!matches) return null;
  for (const raw of matches) {
    const n = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(n)) continue;
    if (n >= range[0] && n <= range[1]) return n;
  }
  return null;
}

// ── Scan date ──────────────────────────────────────────────────────────────

const DATE_PATTERNS: RegExp[] = [
  // 2023.10.04 / 2023-10-04 / 2023/10/04
  /\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/,
  // 04.10.2023 / 04-10-2023 / 04/10/2023 (DMY — common on Arabic/EU printouts)
  /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})\b/,
];

function extractScanDate(text: string): string | null {
  for (const rx of DATE_PATTERNS) {
    const m = text.match(rx);
    if (!m) continue;

    let year: number;
    let month: number;
    let day: number;
    if (m[1]!.length === 4) {
      year = parseInt(m[1]!, 10);
      month = parseInt(m[2]!, 10);
      day = parseInt(m[3]!, 10);
    } else {
      day = parseInt(m[1]!, 10);
      month = parseInt(m[2]!, 10);
      year = parseInt(m[3]!, 10);
    }
    if (!isValidYmd(year, month, day)) continue;
    return `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }
  return null;
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}
