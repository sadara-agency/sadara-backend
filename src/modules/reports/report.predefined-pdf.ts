import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";

const ASSETS_DIR = path.resolve(process.cwd(), "src", "assets", "pdf");
const COVER_PDF = path.join(ASSETS_DIR, "cover_page.pdf");
const BACK_PDF = path.join(ASSETS_DIR, "back_page.pdf");

// ── CSS (reuses same styling as technical reports) ──
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;color:#1a1a2e;background:#fff;width:595px;font-size:9pt;line-height:1.5}
.pg{width:595px;min-height:842px;position:relative;padding:20px 30px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f3460;padding-bottom:10px;margin-bottom:12px}
.hd-r{text-align:right}.hd-r .lt{font-size:13pt;font-weight:700;color:#0f3460}.hd-r .ls{font-size:7pt;color:#666}
.hd-l{text-align:left;direction:ltr;font-size:7pt;color:#666}
.title{text-align:center;font-size:14pt;font-weight:700;color:#0f3460;margin:8px 0 14px;letter-spacing:1px}
.sub{font-size:10pt;font-weight:700;background:#0f3460;color:#fff;display:inline-block;padding:2px 12px;margin:10px 0 6px;border-radius:2px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px}
.stat-card{background:#f0f4ff;border:1px solid #d0d8ef;border-radius:4px;padding:8px;text-align:center}
.stat-card .num{font-size:14pt;font-weight:700;color:#0f3460}.stat-card .lbl{font-size:7pt;color:#666}
table{width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:8px}
th{background:#0f3460;color:#fff;padding:4px 6px;text-align:left;font-weight:600}
td{border-bottom:1px solid #e0e0e0;padding:3px 6px}
tr:nth-child(even){background:#f8f9fc}
.footer{text-align:center;font-size:7pt;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:12px}
`;

const HD = (title: string) => `<div class="hd">
  <div class="hd-r"><div class="lt">شـركــة صـــدارة الـريـاضـيـة</div><div class="ls">SADARA SPORTS COMPANY</div></div>
  <div class="hd-l">${title}<br>Generated: ${new Date().toISOString().split("T")[0]}</div>
</div>`;

const FOOTER = `<div class="footer">شركة صدارة المواهب الرياضية المحدودة — Sadara Sports Company — Confidential Report</div>`;

interface PredefinedPdfOptions {
  reportTitle: string;
  summary: Record<string, unknown>;
  dataSections: { sectionTitle: string; rows: Record<string, unknown>[] }[];
}

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function escHtml(v: unknown): string {
  const s = v === null || v === undefined ? "-" : String(v);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSummaryPage(
  title: string,
  summary: Record<string, unknown>,
): string {
  const entries = Object.entries(summary);
  const kpiHtml = entries
    .map(
      ([k, v]) =>
        `<div class="stat-card"><div class="num">${escHtml(v)}</div><div class="lbl">${escHtml(formatLabel(k))}</div></div>`,
    )
    .join("");

  return `<div class="pg">
    ${HD(title)}
    <div class="title">${escHtml(title)}</div>
    <div class="sub">Summary</div>
    <div class="stats-grid">${kpiHtml}</div>
    ${FOOTER}
  </div>`;
}

function buildDataPage(
  title: string,
  sectionTitle: string,
  rows: Record<string, unknown>[],
): string {
  if (!rows?.length) return "";
  const cols = Object.keys(rows[0]).filter(
    (k) => !k.endsWith("_id") && k !== "id" && !k.endsWith("_url"),
  );

  const ths = cols.map((c) => `<th>${escHtml(formatLabel(c))}</th>`).join("");
  const trs = rows
    .slice(0, 60)
    .map(
      (r) =>
        `<tr>${cols.map((c) => `<td>${escHtml(r[c])}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<div class="pg">
    ${HD(title)}
    <div class="sub">${escHtml(sectionTitle)}</div>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    ${rows.length > 60 ? `<p style="font-size:7pt;color:#999;text-align:center">Showing 60 of ${rows.length} rows</p>` : ""}
    ${FOOTER}
  </div>`;
}

export async function generatePredefinedReportPdf(
  options: PredefinedPdfOptions,
): Promise<Buffer> {
  const wrap = (body: string) =>
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>${body}</body></html>`;

  const pages: string[] = [];

  // Summary page
  if (options.summary) {
    pages.push(wrap(buildSummaryPage(options.reportTitle, options.summary)));
  }

  // Data pages
  for (const section of options.dataSections) {
    if (section.rows?.length) {
      pages.push(
        wrap(
          buildDataPage(
            options.reportTitle,
            section.sectionTitle,
            section.rows,
          ),
        ),
      );
    }
  }

  if (pages.length === 0) {
    pages.push(
      wrap(
        buildSummaryPage(options.reportTitle, { note: "No data available" }),
      ),
    );
  }

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
      ],
    });

    const page = await browser.newPage();
    const contentBuffers: Uint8Array[] = [];

    for (const html of pages) {
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));
      const buf = await page.pdf({
        width: "595px",
        height: "842px",
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
        printBackground: true,
      });
      contentBuffers.push(buf);
    }

    await page.close();
    await browser.close();
    browser = null;

    // Merge with brand pages
    const merged = await PDFDocument.create();

    if (fs.existsSync(COVER_PDF)) {
      const coverDoc = await PDFDocument.load(fs.readFileSync(COVER_PDF));
      const [coverPage] = await merged.copyPages(coverDoc, [0]);
      merged.addPage(coverPage);
    }

    for (const buf of contentBuffers) {
      const doc = await PDFDocument.load(buf);
      const docPages = await merged.copyPages(doc, doc.getPageIndices());
      docPages.forEach((p) => merged.addPage(p));
    }

    if (fs.existsSync(BACK_PDF)) {
      const backDoc = await PDFDocument.load(fs.readFileSync(BACK_PDF));
      const [backPage] = await merged.copyPages(backDoc, [0]);
      merged.addPage(backPage);
    }

    return Buffer.from(await merged.save());
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
