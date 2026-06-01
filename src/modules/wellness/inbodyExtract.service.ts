import path from "path";
import fs from "fs";
import sharp from "sharp";
import { env } from "@config/env";
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
 * values. Fully deterministic — no AI/LLM/vision-API is used.
 *
 *   • PDF inputs are first passed through `pdf-parse` text extraction (free,
 *     fast). Image-only PDFs (scanned printouts exported as PDF) yield no
 *     text layer — these are RASTERIZED to PNG via pdf-parse's bundled
 *     renderer and then run through the same OCR path as images.
 *
 *   • PNG / JPEG inputs (incl. `.jfif`, which is a JPEG) are pre-processed
 *     with `sharp` (auto-orient, grayscale, upscale, contrast, sharpen) and
 *     then OCR'd with `tesseract.js` (free, on-server) using English + Arabic
 *     language data. We OCR both the cleaned and the raw image and merge the
 *     extracted fields, maximising coverage on noisy phone photos.
 *
 * Always resolves — never throws on a parse failure. If nothing useful was
 * extracted, `extractedCount === 0` and the caller should signal an
 * "unreadable file" error to the user.
 */
export async function parseInBodyBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ParseResult> {
  if (mimeType === "application/pdf") {
    return parsePdf(buffer);
  }
  if (mimeType.startsWith("image/")) {
    return parseImage(buffer);
  }
  return {
    extracted: {},
    source: "ocr",
    extractedCount: 0,
    failReason: "unknown",
  };
}

// ── PDF path ────────────────────────────────────────────────────────────────

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // 1. Fast path: text-layer PDFs (clean InBody desktop exports).
  const pdfText = await safePdfParse(buffer);
  if (pdfText) {
    return finalize(extractInBodyValues(pdfText), "pdf-text");
  }

  // 2. Image-only / scanned PDF: rasterize pages to PNG and OCR them.
  let pages: Buffer[];
  try {
    pages = await rasterizePdfFirstPages(buffer, MAX_PDF_PAGES);
  } catch (err) {
    logger.warn(
      `[inbodyExtract] PDF rasterize failed: ${(err as Error)?.message ?? err}`,
    );
    return {
      extracted: {},
      source: "pdf-text",
      extractedCount: 0,
      failReason: "image-pdf",
    };
  }

  if (pages.length === 0) {
    return {
      extracted: {},
      source: "pdf-text",
      extractedCount: 0,
      failReason: "image-pdf",
    };
  }

  // OCR each rasterized page and merge field-by-field across pages.
  let merged: ExtractedInBody = {};
  for (const page of pages) {
    const pageResult = await ocrImageToFields(page);
    if (pageResult.failReason === "ocr-failed" && pages.length === 1) {
      return {
        extracted: {},
        source: "ocr",
        extractedCount: 0,
        failReason: "ocr-failed",
      };
    }
    merged = mergeExtracted(merged, pageResult.extracted);
  }

  return finalize(merged, "ocr");
}

// ── Image path ────────────────────────────────────────────────────────────

async function parseImage(buffer: Buffer): Promise<ParseResult> {
  const result = await ocrImageToFields(buffer);
  if (result.failReason === "ocr-failed") {
    return {
      extracted: {},
      source: "ocr",
      extractedCount: 0,
      failReason: "ocr-failed",
    };
  }
  return finalize(result.extracted, "ocr");
}

/**
 * Dual-pass OCR of a single image buffer. We run OCR twice — once on a
 * sharp-preprocessed copy (primary) and once on the raw bytes (secondary) —
 * and merge the extracted fields. The two engines disagree on different
 * fields depending on contrast/orientation, so merging recovers more values
 * than either pass alone. Passes run sequentially to bound peak memory on the
 * slim production VM.
 */
async function ocrImageToFields(
  buffer: Buffer,
): Promise<{ extracted: ExtractedInBody; failReason?: ExtractFailReason }> {
  if (env.ocr.disabled) {
    return { extracted: {}, failReason: "ocr-failed" };
  }

  let prepText = "";
  let rawText = "";
  let anySucceeded = false;

  try {
    const prep = await preprocessForOcr(buffer);
    prepText = await recognizeWithTimeout(prep, env.ocr.timeoutMs);
    anySucceeded = true;
  } catch (err) {
    logger.warn(
      `[inbodyExtract] OCR (preprocessed) failed: ${(err as Error)?.message ?? err}`,
    );
  }

  try {
    rawText = await recognizeWithTimeout(buffer, env.ocr.timeoutMs);
    anySucceeded = true;
  } catch (err) {
    logger.warn(
      `[inbodyExtract] OCR (raw) failed: ${(err as Error)?.message ?? err}`,
    );
  }

  if (!anySucceeded) {
    return { extracted: {}, failReason: "ocr-failed" };
  }

  const primary = extractInBodyValues(prepText);
  const secondary = extractInBodyValues(rawText);
  return { extracted: mergeExtracted(primary, secondary) };
}

// ── Image preprocessing (deterministic, sharp) ──────────────────────────────

// Target width that gives Tesseract roughly 300-dpi-equivalent input. Small
// phone photos benefit most from upscaling; we cap the width so OCR time and
// memory stay bounded on the production VM.
const OCR_TARGET_WIDTH = 2000;
const OCR_MIN_WIDTH = 1500;
const OCR_MAX_WIDTH = 3000;

async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  // failOn:"none" tolerates slightly-malformed phone JPEGs (incl. .jfif).
  const pipeline = sharp(buffer, { failOn: "none" })
    .rotate() // auto-orient from EXIF before any geometry
    .flatten({ background: "#ffffff" }); // drop alpha → no black backgrounds

  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  if (width > 0 && width < OCR_MIN_WIDTH) {
    const factor = OCR_TARGET_WIDTH / width;
    const targetWidth = Math.min(OCR_MAX_WIDTH, Math.round(width * factor));
    pipeline.resize({ width: targetWidth });
  } else if (width > OCR_MAX_WIDTH) {
    pipeline.resize({ width: OCR_MAX_WIDTH });
  }

  return pipeline
    .grayscale() // colour charts confuse OCR
    .normalize() // contrast-stretch so faint digits separate from background
    .sharpen() // light unsharp to crisp digit edges
    .png() // lossless — no JPEG artefacts feeding OCR
    .toBuffer();
}

// ── Tesseract wrapper (configured + time-boxed) ─────────────────────────────

// Where the eng/ara .traineddata live. Bundled under src/assets/tessdata and
// copied to dist/assets/tessdata by the build step, so production never has to
// download language data from a CDN at runtime (which can time out on Fly).
function resolveLangPath(): string | undefined {
  if (env.ocr.langPath) return env.ocr.langPath;
  const candidates = [
    path.join(__dirname, "..", "..", "assets", "tessdata"), // dist/assets/tessdata
    path.join(process.cwd(), "dist", "assets", "tessdata"),
    path.join(process.cwd(), "src", "assets", "tessdata"), // ts-node / dev
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {
      // ignore — fall through to CDN default
    }
  }
  return undefined; // tesseract.js falls back to its CDN default
}

interface TesseractModule {
  createWorker: (
    langs?: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<{
    setParameters: (params: Record<string, unknown>) => Promise<unknown>;
    recognize: (img: Buffer) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<unknown>;
  }>;
  OEM: { LSTM_ONLY: number };
  PSM: { SPARSE_TEXT: string };
}

async function recognizeWithTimeout(
  img: Buffer,
  timeoutMs: number,
): Promise<string> {
  const tesseract =
    (await import("tesseract.js")) as unknown as TesseractModule;
  const langPath = resolveLangPath();

  // Our bundled .traineddata are RAW (uncompressed) → gzip:false. When we fall
  // back to the tesseract.js CDN (langPath undefined) the files are gzipped →
  // gzip:true. Mismatching this throws ENOENT on `<lang>.traineddata.gz`.
  const worker = await tesseract.createWorker(
    "eng+ara",
    tesseract.OEM.LSTM_ONLY,
    {
      ...(langPath ? { langPath } : {}),
      cachePath: path.join(process.cwd(), "tmp"),
      gzip: !langPath,
    },
  );

  let timer: NodeJS.Timeout | undefined;
  try {
    // PSM 11 (sparse text) suits a scattered multi-column InBody sheet far
    // better than the default single-block assumption.
    await worker.setParameters({
      tessedit_pageseg_mode: tesseract.PSM.SPARSE_TEXT,
    });

    const recognized = worker.recognize(img).then((r) => r.data.text ?? "");
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`OCR timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    return await Promise.race([recognized, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    await worker.terminate().catch(() => undefined);
  }
}

// ── PDF rasterization (deterministic, via pdf-parse's bundled renderer) ─────

const MAX_PDF_PAGES = 2;

interface ScreenshotPage {
  data?: Uint8Array;
  pageNumber: number;
}
interface PdfParseInstance {
  getText: () => Promise<{ text?: string }>;
  getScreenshot: (params: {
    first?: number;
    desiredWidth?: number;
    imageBuffer?: boolean;
    imageDataUrl?: boolean;
  }) => Promise<{ pages: ScreenshotPage[] }>;
  destroy: () => Promise<void>;
}
interface PdfParseModule {
  PDFParse: new (opts: { data: Uint8Array }) => PdfParseInstance;
}

// pdf-parse v2 is an ESM module whose public surface is the `PDFParse` class
// (no default export, not itself callable). Both the text fast-path and the
// rasterizer go through it via this single dynamic import.
async function loadPdfParse(): Promise<PdfParseModule> {
  const mod = (await import("pdf-parse")) as unknown as PdfParseModule;
  if (typeof mod.PDFParse !== "function") {
    throw new Error("pdf-parse PDFParse class unavailable");
  }
  return mod;
}

/**
 * Render the first pages of an image-only PDF to PNG buffers using pdf-parse's
 * built-in `getScreenshot()` (which uses its bundled pdfjs-dist + canvas — no
 * extra dependency, no native build deps). Returns one PNG buffer per page.
 */
async function rasterizePdfFirstPages(
  buffer: Buffer,
  maxPages: number,
): Promise<Buffer[]> {
  const mod = await loadPdfParse();
  const parser = new mod.PDFParse({ data: new Uint8Array(buffer) });
  try {
    const shot = await parser.getScreenshot({
      first: maxPages,
      desiredWidth: OCR_TARGET_WIDTH,
      imageBuffer: true,
      imageDataUrl: false,
    });
    return (shot.pages ?? [])
      .filter((p): p is ScreenshotPage & { data: Uint8Array } => !!p.data)
      .map((p) => Buffer.from(p.data));
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

// ── pdf-parse text wrapper ──────────────────────────────────────────────────

async function safePdfParse(buffer: Buffer): Promise<string> {
  let parser: PdfParseInstance | undefined;
  try {
    const mod = await loadPdfParse();
    parser = new mod.PDFParse({ data: new Uint8Array(buffer) });
    const parsed = await parser.getText();
    const text = typeof parsed?.text === "string" ? parsed.text : "";
    // < 50 chars means no real text layer (image-only PDF) → caller OCRs it.
    if (text.trim().length < 50) return "";
    return text;
  } catch (err) {
    logger.warn(
      `[inbodyExtract] pdf-parse text failed: ${(err as Error)?.message ?? err}`,
    );
    return "";
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

// ── Result helpers ───────────────────────────────────────────────────────────

function finalize(
  extracted: ExtractedInBody,
  source: ExtractSource,
): ParseResult {
  const extractedCount = Object.values(extracted).filter(
    (v) => v !== null && v !== undefined,
  ).length;
  return {
    extracted,
    source,
    extractedCount,
    failReason: extractedCount === 0 ? "unknown" : undefined,
  };
}

/**
 * Merge two extraction results field-by-field. `primary` wins on conflict;
 * `secondary` fills in any field the primary left null/undefined. scanDate is
 * taken from whichever result has it (primary first).
 */
export function mergeExtracted(
  primary: ExtractedInBody,
  secondary: ExtractedInBody,
): ExtractedInBody {
  const out: ExtractedInBody = { ...secondary, ...primary };
  (
    Object.keys({ ...primary, ...secondary }) as (keyof ExtractedInBody)[]
  ).forEach((key) => {
    if (out[key] === null || out[key] === undefined) {
      const fallback = secondary[key] ?? primary[key];
      if (fallback !== null && fallback !== undefined) {
        out[key] = fallback as never;
      }
    }
  });
  return out;
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
  /**
   * When true, prefer a numeric token OUTSIDE any parentheses on the same
   * line. InBody rows render the measured value first, then a parenthetical
   * reference range — e.g. "73.1 ( 56.6~76.6 )". Without this, the first
   * in-range token could be a reference-range bound.
   */
  preferOutsideParens?: boolean;
}

const FIELDS: Record<keyof ExtractedInBody, FieldSpec | null> = {
  weightKg: {
    labels: [/\bweight\b/i, /الوزن/],
    range: [25, 250],
    preferOutsideParens: true,
  },
  bodyFatPct: {
    labels: [
      /percent\s*body\s*fat/i,
      /\bbody\s*fat\b(?!\s*mass)/i,
      /\bPBF\b/,
      /النسبة\s*ا?لمئوية\s*للدهون/,
    ],
    range: [2, 70],
    preferOutsideParens: true,
  },
  leanBodyMassKg: {
    labels: [/lean\s*body\s*mass/i, /\bLBM\b/, /كتلة\s*ا?لجسم\s*ا?لنحيلة/],
    range: [20, 150],
    preferOutsideParens: true,
  },
  skeletalMuscleMassKg: {
    labels: [
      /skeletal\s*muscle\s*mass/i,
      /\bSMM\b/,
      /كتلة\s*ا?لهيكل\s*ا?لعضلي/,
      /كتلة\s*ا?لعضلات\s*ا?لهيكلية/,
    ],
    range: [10, 80],
    preferOutsideParens: true,
  },
  totalBodyWaterKg: {
    labels: [/total\s*body\s*water/i, /\bTBW\b/, /إجمالي\s*ا?لمياه/],
    range: [15, 100],
    preferOutsideParens: true,
  },
  proteinKg: {
    labels: [/\bprotein\b/i, /البروتين/],
    range: [3, 30],
    preferOutsideParens: true,
  },
  mineralKg: {
    labels: [/\bminerals?\b/i, /المعادن/],
    range: [1, 10],
    preferOutsideParens: true,
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

// Labels for values that appear on an InBody report but are NOT stored
// fields. We skip these lines as value sources so their numbers (BMI ~24,
// height ~174cm, age ~30, score X/100) can't be mistaken for a real field.
const NEGATIVE_LABELS: RegExp[] = [
  /\bBMI\b/i,
  /body\s*mass\s*index/i,
  /مؤشر\s*كتلة\s*ا?لجسم/,
  /\bheight\b/i,
  /الطول/,
  /InBody\s*score/i,
  /درجة\s*اختبار/,
];

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
    // Don't trust a line that also matches a non-stored label (e.g. a row
    // that reads "BMI" near "Weight" after OCR linearization).
    if (NEGATIVE_LABELS.some((rx) => rx.test(line))) continue;

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
      const candidateLine = lines[idx]!;
      // Skip neighbouring lines owned by a non-stored label.
      if (idx !== i && NEGATIVE_LABELS.some((rx) => rx.test(candidateLine))) {
        continue;
      }
      const candidate = spec.preferOutsideParens
        ? pickNumberPreferOutsideParens(candidateLine, spec.range)
        : pickNumberInRange(candidateLine, spec.range);
      if (candidate !== null) return candidate;
    }
  }
  return null;
}

// Strip tokens that often live next to InBody labels but are not measurements
// (timestamps in HH:MM[:SS] form, "X/100" InBody scores). Keeps the line's
// remaining numeric tokens intact so the in-range scanner can pick the right
// one.
const TIME_RE = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
const SCORE_RE = /\b\d{1,3}\s*\/\s*100\b/g;

function cleanLine(line: string): string {
  return line.replace(TIME_RE, " ").replace(SCORE_RE, " ");
}

function pickNumberInRange(
  line: string,
  range: [number, number],
): number | null {
  const cleaned = cleanLine(line);
  return firstInRange(cleaned, range);
}

/**
 * Prefer the measured value, which on an InBody row sits OUTSIDE the
 * parenthetical reference range — e.g. "73.1 ( 56.6~76.6 )". We scan the
 * text with the (...) segments removed first; only if nothing in range is
 * found there do we fall back to the full line.
 */
function pickNumberPreferOutsideParens(
  line: string,
  range: [number, number],
): number | null {
  const cleaned = cleanLine(line);
  const outsideParens = cleaned.replace(/\([^)]*\)/g, " ");
  const outside = firstInRange(outsideParens, range);
  if (outside !== null) return outside;
  return firstInRange(cleaned, range);
}

function firstInRange(text: string, range: [number, number]): number | null {
  const matches = text.match(NUMBER_RE);
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
