import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { AppError } from "@middleware/errorHandler";
import { env } from "@config/env";
import { logger } from "@config/logger";

/** Milliseconds elapsed since an hrtime mark, rounded to 0.1ms. */
function msSince(mark: bigint): number {
  return Math.round(Number(process.hrtime.bigint() - mark) / 1e5) / 10;
}

// ── Helpers ──

export function escHtml(v: unknown): string {
  const s = v === null || v === undefined ? "-" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface FmtDateOpts {
  fallback?: string;
  suffix?: string;
  separator?: string;
}

export function fmtDate(s: string | Date | null, opts?: FmtDateOpts): string {
  const { fallback = "-", suffix = "", separator = "/" } = opts || {};
  if (!s) return fallback;
  try {
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}${separator}${mm}${separator}${d.getFullYear()}${suffix}`;
  } catch {
    return String(s);
  }
}

export function calcAge(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age--;
  return age;
}

// ── Asset resolution (dist/ first for production, src/ for dev) ──

function resolveAssetDir(): string {
  const distPath = path.resolve(__dirname, "..", "..", "assets", "pdf");
  const srcPath = path.resolve(process.cwd(), "src", "assets", "pdf");
  if (fs.existsSync(distPath)) return distPath;
  return srcPath;
}

const ASSETS_DIR = resolveAssetDir();
export const COVER_PDF_PATH = path.join(ASSETS_DIR, "cover_page.pdf");
export const BACK_PDF_PATH = path.join(ASSETS_DIR, "back_page.pdf");

// ── Arabic font embedding (Puppeteer needs base64 data URIs; file:// is
//    unreliable in the Chromium sandbox) ──────────────────────────────────
function resolveFontDir(): string {
  const distPath = path.resolve(__dirname, "..", "..", "assets", "font");
  const srcPath = path.resolve(process.cwd(), "src", "assets", "font");
  if (fs.existsSync(distPath)) return distPath;
  return srcPath;
}

let cachedFontFaceCss: string | null = null;

/**
 * Returns @font-face CSS embedding IBM Plex Sans Arabic (regular + bold) as
 * base64 data URIs so Puppeteer shapes Arabic correctly. Cached after first read.
 */
export function getArabicFontFaceCss(): string {
  if (cachedFontFaceCss !== null) return cachedFontFaceCss;
  const dir = resolveFontDir();
  const toDataUri = (file: string): string => {
    const full = path.join(dir, file);
    try {
      const buf = fs.readFileSync(full);
      return `data:font/ttf;base64,${buf.toString("base64")}`;
    } catch {
      throw new AppError(
        `Arabic font asset missing: ${file}. Place IBM Plex Sans Arabic ttf files in src/assets/font/`,
        500,
      );
    }
  };
  const regular = toDataUri("IBMPlexSansArabic-Medium.ttf");
  const bold = toDataUri("IBMPlexSansArabic-Bold.ttf");
  cachedFontFaceCss = `
@font-face {
  font-family: "IBM Plex Sans Arabic";
  font-weight: 400;
  font-style: normal;
  src: url("${regular}") format("truetype");
}
@font-face {
  font-family: "IBM Plex Sans Arabic";
  font-weight: 700;
  font-style: normal;
  src: url("${bold}") format("truetype");
}`;
  return cachedFontFaceCss;
}

// ── Brand image assets (base64 data URIs; file:// is unreliable in Chromium) ──

function resolveImgDir(): string {
  const distPath = path.resolve(__dirname, "..", "..", "assets", "img");
  const srcPath = path.resolve(process.cwd(), "src", "assets", "img");
  if (fs.existsSync(distPath)) return distPath;
  return srcPath;
}

const cachedImgDataUris: Record<string, string> = {};

/**
 * Returns a `data:image/png;base64,...` URI for a file in assets/img.
 * Cached after first read. Throws AppError if the asset is missing.
 */
export function getBrandImageDataUri(file: string): string {
  if (cachedImgDataUris[file]) return cachedImgDataUris[file];
  const full = path.join(resolveImgDir(), file);
  try {
    const buf = fs.readFileSync(full);
    const uri = `data:image/png;base64,${buf.toString("base64")}`;
    cachedImgDataUris[file] = uri;
    return uri;
  } catch {
    throw new AppError(
      `Brand image asset missing: ${file}. Place it in src/assets/img/`,
      500,
    );
  }
}

// ── Letterhead header/footer (Puppeteer running header/footer templates) ──
// These render as isolated mini-documents: page CSS does NOT apply, default
// font-size is 0, and only inline styles + data-URI images work. Keep all
// styling inline.

/** Company contact line for report footers. */
export const SADARA_ADDRESS_LINE =
  "'Irqah Dist., Riyadh 12534, Saudi Arabia   M - info@sadarasport.sa   W - www.sadarasport.sa   P - +966533919155";

/** Top-of-page letterhead: logo left, reference text right. */
export function makeLetterheadHeaderTemplate(opts: {
  logoDataUri: string;
  rightText: string;
}): string {
  return `<div style="width:100%;font-size:8px;color:#1a1a1a;font-family:Arial,sans-serif;padding:6mm 16mm 0 16mm;box-sizing:border-box;-webkit-print-color-adjust:exact;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <img src="${opts.logoDataUri}" style="height:50px;width:auto;" />
    <span style="font-size:9px;font-weight:bold;color:#0f3460;">${escHtml(opts.rightText)}</span>
  </div>
</div>`;
}

/** Bottom-of-page letterhead: address line above the geometric pattern strip. */
export function makeLetterheadFooterTemplate(opts: {
  patternDataUri: string;
  addressLine?: string;
}): string {
  const addr = opts.addressLine ?? SADARA_ADDRESS_LINE;
  return `<div style="width:100%;font-size:8px;color:#1a1a1a;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;box-sizing:border-box;">
  <div style="font-size:8px;font-weight:bold;text-align:center;padding:0 16mm 2mm 16mm;">${escHtml(addr)}</div>
  <img src="${opts.patternDataUri}" style="display:block;width:100%;height:auto;" />
</div>`;
}

// ── HTML utilities ──

export function wrapHtml(body: string, css: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${body}</body></html>`;
}

export function makeSadaraHeader(subtitle: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `<div class="hd">
  <div class="hd-r"><div class="lt">شـركــة صـــدارة الـريـاضـيـة</div><div class="ls">SADARA SPORTS COMPANY</div></div>
  <div class="hd-l">${escHtml(subtitle)}<br>Generated: ${today}</div>
</div>`;
}

// ── Shared browser pool ──
// Reuse a single Puppeteer browser instance to avoid cold-start overhead
// (~2-3s per launch). Auto-closes after 5 min of inactivity.

let sharedBrowser: any = null;
let browserIdleTimer: ReturnType<typeof setTimeout> | null = null;
const BROWSER_IDLE_MS = 5 * 60 * 1000; // 5 minutes

async function getSharedBrowser(extraArgs: string[] = []): Promise<any> {
  if (browserIdleTimer) {
    clearTimeout(browserIdleTimer);
    browserIdleTimer = null;
  }

  if (sharedBrowser) {
    try {
      // Verify browser is still alive
      await sharedBrowser.version();
      scheduleBrowserClose();
      return sharedBrowser;
    } catch {
      sharedBrowser = null;
    }
  }

  sharedBrowser = await puppeteer.launch({
    headless: true,
    executablePath: env.puppeteer.executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      ...extraArgs,
    ],
  });

  scheduleBrowserClose();
  return sharedBrowser;
}

function scheduleBrowserClose() {
  if (browserIdleTimer) clearTimeout(browserIdleTimer);
  browserIdleTimer = setTimeout(async () => {
    if (sharedBrowser) {
      try {
        await sharedBrowser.close();
      } catch {}
      sharedBrowser = null;
    }
    browserIdleTimer = null;
  }, BROWSER_IDLE_MS);
}

// ── Puppeteer rendering ──

export interface RenderOptions {
  extraArgs?: string[];
  settleMs?: number;
  /** Timeout for the entire render operation (default 30s) */
  timeoutMs?: number;
}

export async function renderPagesToBuffers(
  htmlPages: string[],
  options?: RenderOptions,
): Promise<Uint8Array[]> {
  const { extraArgs = [], settleMs = 200, timeoutMs = 30_000 } = options || {};

  const renderWork = async (): Promise<Uint8Array[]> => {
    const browser = await getSharedBrowser(extraArgs);
    const page = await browser.newPage();
    const buffers: Uint8Array[] = [];

    try {
      for (const html of htmlPages) {
        await page.setContent(html, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        await page.evaluate(`new Promise(r => setTimeout(r, ${settleMs}))`);
        buffers.push(
          await page.pdf({
            width: "595px",
            height: "842px",
            margin: { top: "0", bottom: "0", left: "0", right: "0" },
            printBackground: true,
          }),
        );
      }
      return buffers;
    } finally {
      await page.close().catch(() => {});
    }
  };

  // Race against timeout to prevent indefinite hangs
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new AppError("PDF render timed out", 504)),
      timeoutMs,
    ),
  );

  return Promise.race([renderWork(), timeout]);
}

export interface FlowRenderOptions extends RenderOptions {
  /** HTML for the repeated page header (Puppeteer headerTemplate). */
  headerHtml?: string;
  /** HTML for the repeated page footer (Puppeteer footerTemplate). */
  footerHtml?: string;
  /** Page margins (CSS units). Defaults give breathing room + header space. */
  margin?: { top: string; bottom: string; left: string; right: string };
}

/**
 * Render ONE tall HTML document and let Puppeteer paginate it across as many
 * A4 pages as needed. Used for editable contracts whose length is unknown.
 * Distinct from renderPagesToBuffers (which forces one fixed page per string).
 */
export async function renderFlowingHtmlToBuffer(
  html: string,
  options?: FlowRenderOptions,
): Promise<Uint8Array> {
  const {
    extraArgs = ["--font-render-hinting=none"],
    settleMs = 300,
    // 60s (not 30s): a cold Chromium launch on the shared-CPU/1GB Fly machine
    // plus a font-embedded flow render can exceed 30s when the browser pool is
    // cold (after Fly autostop or the 5-min idle close). Warm renders finish in
    // ~1-2s; this margin only matters for the cold path. Matches the frontend's
    // 60s axios timeout and the legacy PDF endpoints.
    timeoutMs = 60_000,
    headerHtml,
    footerHtml,
    margin = { top: "22mm", bottom: "20mm", left: "18mm", right: "18mm" },
  } = options || {};

  const renderWork = async (): Promise<Uint8Array> => {
    // Per-hop timing so prod logs pinpoint which step blows the budget on the
    // cold path (browser launch vs setContent vs page.pdf). Remove once the
    // intermittent 504 is confirmed resolved.
    const t0 = process.hrtime.bigint();
    const wasWarm = sharedBrowser !== null;
    const browser = await getSharedBrowser(extraArgs);
    const tBrowser = msSince(t0);
    const page = await browser.newPage();
    const tNewPage = msSince(t0);
    try {
      // domcontentloaded (not networkidle0): the body embeds its Arabic fonts as
      // inline base64 data URIs and references no external resources, so there
      // is nothing to wait on the network for. networkidle0 only adds its 500ms
      // quiet-window latency and can stall under shared-CPU load. The settleMs
      // delay below gives the embedded fonts time to apply before page.pdf().
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      const tSetContent = msSince(t0);
      await page.evaluate(`new Promise(r => setTimeout(r, ${settleMs}))`);
      const pdf = await page.pdf({
        format: "A4",
        margin,
        printBackground: true,
        displayHeaderFooter: Boolean(headerHtml || footerHtml),
        headerTemplate: headerHtml ?? "<span></span>",
        footerTemplate: footerHtml ?? "<span></span>",
      });
      const tPdf = msSince(t0);
      logger.info("[pdf] flow render timings", {
        wasWarm,
        launchMs: tBrowser,
        newPageMs: Math.round((tNewPage - tBrowser) * 10) / 10,
        setContentMs: Math.round((tSetContent - tNewPage) * 10) / 10,
        pdfMs: Math.round((tPdf - tSetContent) * 10) / 10,
        totalMs: tPdf,
        htmlBytes: html.length,
      });
      return pdf;
    } finally {
      await page.close().catch(() => {});
    }
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new AppError("Contract PDF render timed out", 504)),
      timeoutMs,
    ),
  );
  return Promise.race([renderWork(), timeout]);
}

// ── PDF-lib merge ──

export interface MergeOptions {
  coverPath?: string;
  /**
   * In-memory cover PDF buffer (e.g. produced by `renderCoverPageBuffer`).
   * When supplied, overrides `coverPath` so callers can build dynamic covers
   * without writing a temp file. Falls back to `coverPath` (then `COVER_PDF_PATH`)
   * if not provided.
   */
  coverBuffer?: Uint8Array;
  backPath?: string;
  requireBrandPages?: boolean;
}

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

async function addPageNormalizedToA4(
  merged: PDFDocument,
  sourceBytes: Uint8Array,
  pageIndex: number,
): Promise<void> {
  const sourceDoc = await PDFDocument.load(sourceBytes);
  const [srcPage] = await merged.copyPages(sourceDoc, [pageIndex]);
  const { width, height } = srcPage.getSize();

  if (Math.abs(width - A4_WIDTH) < 0.5 && Math.abs(height - A4_HEIGHT) < 0.5) {
    merged.addPage(srcPage);
    return;
  }

  const [embedded] = await merged.embedPdf(sourceBytes, [pageIndex]);
  const a4 = merged.addPage([A4_WIDTH, A4_HEIGHT]);
  const scale = Math.min(A4_WIDTH / width, A4_HEIGHT / height);
  const drawW = width * scale;
  const drawH = height * scale;
  a4.drawPage(embedded, {
    x: (A4_WIDTH - drawW) / 2,
    y: (A4_HEIGHT - drawH) / 2,
    xScale: scale,
    yScale: scale,
  });
}

export async function mergeWithBrandPages(
  contentBuffers: Uint8Array[],
  opts?: MergeOptions,
): Promise<Buffer> {
  const coverPath = opts?.coverPath ?? COVER_PDF_PATH;
  const backPath = opts?.backPath ?? BACK_PDF_PATH;
  const required = opts?.requireBrandPages ?? false;

  const merged = await PDFDocument.create();

  if (opts?.coverBuffer) {
    await addPageNormalizedToA4(merged, opts.coverBuffer, 0);
  } else if (fs.existsSync(coverPath)) {
    await addPageNormalizedToA4(merged, fs.readFileSync(coverPath), 0);
  } else if (required) {
    throw new AppError(`Brand asset not found: ${coverPath}`, 500);
  }

  for (const buf of contentBuffers) {
    const doc = await PDFDocument.load(buf);
    for (const i of doc.getPageIndices()) {
      await addPageNormalizedToA4(merged, buf, i);
    }
  }

  if (fs.existsSync(backPath)) {
    await addPageNormalizedToA4(merged, fs.readFileSync(backPath), 0);
  } else if (required) {
    throw new AppError(`Brand asset not found: ${backPath}`, 500);
  }

  return Buffer.from(await merged.save());
}

// ── Async enqueue helpers ──

export async function enqueueReportPdf(
  input: Record<string, unknown>,
  requestedBy: string,
): Promise<{ jobId: string }> {
  // Dynamic import avoids circular-dependency risk between queues module and pdf util.
  const { enqueue, QueueName } = await import("@modules/queues/queues");
  const jobId = await enqueue(QueueName.PdfGeneration, "render-report", {
    kind: "report",
    input,
    requestedBy,
  });
  return { jobId };
}

export async function enqueueContractPdfRegen(
  contractId: string,
  requestedBy: string,
): Promise<{ jobId: string }> {
  const { enqueue, QueueName } = await import("@modules/queues/queues");
  const jobId = await enqueue(
    QueueName.PdfGeneration,
    `contract-regen-${contractId}`,
    { kind: "contract-regen", input: { contractId }, requestedBy },
  );
  return { jobId };
}
