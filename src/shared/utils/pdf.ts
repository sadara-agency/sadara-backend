import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";

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

// ── Puppeteer rendering ──

export interface RenderOptions {
  extraArgs?: string[];
  settleMs?: number;
}

export async function renderPagesToBuffers(
  htmlPages: string[],
  options?: RenderOptions,
): Promise<Uint8Array[]> {
  const { extraArgs = [], settleMs = 200 } = options || {};
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        ...extraArgs,
      ],
    });

    const page = await browser.newPage();
    const buffers: Uint8Array[] = [];

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

    await page.close();
    return buffers;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

// ── PDF-lib merge ──

export interface MergeOptions {
  coverPath?: string;
  backPath?: string;
  requireBrandPages?: boolean;
}

export async function mergeWithBrandPages(
  contentBuffers: Uint8Array[],
  opts?: MergeOptions,
): Promise<Buffer> {
  const coverPath = opts?.coverPath ?? COVER_PDF_PATH;
  const backPath = opts?.backPath ?? BACK_PDF_PATH;
  const required = opts?.requireBrandPages ?? false;

  const merged = await PDFDocument.create();

  if (fs.existsSync(coverPath)) {
    const coverDoc = await PDFDocument.load(fs.readFileSync(coverPath));
    const [coverPage] = await merged.copyPages(coverDoc, [0]);
    merged.addPage(coverPage);
  } else if (required) {
    throw new Error(`Brand asset not found: ${coverPath}`);
  }

  for (const buf of contentBuffers) {
    const doc = await PDFDocument.load(buf);
    const docPages = await merged.copyPages(doc, doc.getPageIndices());
    docPages.forEach((p) => merged.addPage(p));
  }

  if (fs.existsSync(backPath)) {
    const backDoc = await PDFDocument.load(fs.readFileSync(backPath));
    const [backPage] = await merged.copyPages(backDoc, [0]);
    merged.addPage(backPage);
  } else if (required) {
    throw new Error(`Brand asset not found: ${backPath}`);
  }

  return Buffer.from(await merged.save());
}
