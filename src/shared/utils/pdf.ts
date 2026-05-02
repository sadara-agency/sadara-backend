import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { AppError } from "@middleware/errorHandler";
import { env } from "@config/env";

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
