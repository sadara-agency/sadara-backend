import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";

const TMP = path.resolve(process.cwd(), "tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

const ASSETS_DIR = path.resolve(process.cwd(), "src", "assets", "pdf");
const COVER_PDF = path.join(ASSETS_DIR, "cover_page.pdf");
const BACK_PDF = path.join(ASSETS_DIR, "back_page.pdf");

// ── Helpers ──

function fmtDate(s: string | Date | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return String(s);
  }
}

function calcAge(dob: string | null): number {
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

// ── CSS ──

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1a1a2e;background:#fff;width:595px;font-size:9pt;line-height:1.5}
.pg{width:595px;min-height:842px;position:relative;padding:20px 30px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f3460;padding-bottom:10px;margin-bottom:12px}
.hd-r{text-align:right}.hd-r .lt{font-size:13pt;font-weight:700;color:#0f3460}.hd-r .ls{font-size:7pt;color:#666}
.hd-l{text-align:left;direction:ltr;font-size:7pt;color:#666}
.title{text-align:center;font-size:16pt;font-weight:700;color:#0f3460;margin:8px 0 14px;letter-spacing:1px}
.sub{font-size:10pt;font-weight:700;background:#0f3460;color:#fff;display:inline-block;padding:2px 12px;margin:10px 0 6px;border-radius:2px}
.bio-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:8.5pt;margin-bottom:10px}
.bio-grid .label{color:#666;font-weight:600}.bio-grid .val{font-weight:700}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.stat-card{background:#f0f4ff;border:1px solid #d0d8ef;border-radius:4px;padding:6px 8px;text-align:center}
.stat-card .num{font-size:16pt;font-weight:700;color:#0f3460}.stat-card .lbl{font-size:7pt;color:#666}
.bar-wrap{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:8pt}
.bar-label{width:70px;color:#666;font-weight:600;text-align:right}
.bar-track{flex:1;height:10px;background:#e8ebf0;border-radius:5px;overflow:hidden}
.bar-fill{height:100%;border-radius:5px;background:#0f3460}
.bar-val{width:24px;font-weight:700;text-align:left;color:#0f3460}
table{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:8px}
th{background:#0f3460;color:#fff;padding:5px 8px;text-align:right;font-weight:600}
td{border-bottom:1px solid #e0e0e0;padding:4px 8px}
tr:nth-child(even){background:#f8f9fc}
.ok{color:#22c55e;font-weight:700}.nok{color:#ef4444;font-weight:700}.pend{color:#f59e0b;font-weight:700}
.note-box{background:#fffbe6;border:1px solid #fde68a;border-radius:4px;padding:6px 10px;font-size:8pt;margin-top:8px}
.footer{text-align:center;font-size:7pt;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:12px}
.radar-wrap{display:flex;justify-content:center;margin:10px 0}
`;

const HD = `<div class="hd">
  <div class="hd-r"><div class="lt">شـركــة صـــدارة الـريـاضـيـة</div><div class="ls">SADARA SPORTS COMPANY</div></div>
  <div class="hd-l">Scouting Pack Report<br>Generated: ${new Date().toISOString().split("T")[0]}</div>
</div>`;

const FOOTER = `<div class="footer">شركة صدارة المواهب الرياضية المحدودة — ملف استكشاف سري — Sadara Sports Company — Confidential Scouting Pack</div>`;

// ── SVG Radar Chart ──

function buildRadarSvg(
  ratings: { label: string; labelAr: string; value: number }[],
): string {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const n = ratings.length;

  function polar(i: number, r: number): [number, number] {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Grid circles
  const gridLines = [2, 4, 6, 8, 10]
    .map((v) => {
      const r = (v / 10) * maxR;
      const pts = ratings.map((_, i) => polar(i, r).join(",")).join(" ");
      return `<polygon points="${pts}" fill="none" stroke="#ddd" stroke-width="0.5"/>`;
    })
    .join("");

  // Axes
  const axes = ratings
    .map((_, i) => {
      const [x, y] = polar(i, maxR);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>`;
    })
    .join("");

  // Data polygon
  const dataPts = ratings
    .map((r, i) => polar(i, (Math.min(r.value, 10) / 10) * maxR).join(","))
    .join(" ");
  const dataPolygon = `<polygon points="${dataPts}" fill="rgba(15,52,96,0.2)" stroke="#0f3460" stroke-width="1.5"/>`;

  // Labels
  const labels = ratings
    .map((r, i) => {
      const [x, y] = polar(i, maxR + 18);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="#333">${r.labelAr} ${r.value || "—"}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}${axes}${dataPolygon}${labels}
  </svg>`;
}

// ── Page 1: Prospect Profile ──

function buildProfilePage(watchlist: any): string {
  const name = watchlist.prospectNameAr || watchlist.prospectName || "—";
  const nameEn = watchlist.prospectName || "";
  const age = watchlist.dateOfBirth ? calcAge(watchlist.dateOfBirth) : "—";

  const ratings = [
    {
      label: "Technical",
      labelAr: "تقني",
      value: watchlist.technicalRating || 0,
    },
    {
      label: "Physical",
      labelAr: "بدني",
      value: watchlist.physicalRating || 0,
    },
    { label: "Mental", labelAr: "ذهني", value: watchlist.mentalRating || 0 },
    {
      label: "Potential",
      labelAr: "إمكانية",
      value: watchlist.potentialRating || 0,
    },
  ];

  const ratingBars = ratings
    .map(
      (r) => `
    <div class="bar-wrap">
      <span class="bar-label">${r.labelAr}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.value / 10) * 100}%"></div></div>
      <span class="bar-val">${r.value || "—"}</span>
    </div>`,
    )
    .join("");

  const vals = ratings.filter((r) => r.value > 0);
  const avg =
    vals.length > 0
      ? (vals.reduce((s, r) => s + r.value, 0) / vals.length).toFixed(1)
      : "—";

  const radarSvg = buildRadarSvg(ratings);

  return `<div class="pg">${HD}
    <div class="title">ملف الاستكشاف — ${name}</div>
    <div class="sub">بيانات المرشح — Prospect Bio</div>
    <div class="bio-grid">
      <div><span class="label">الاسم:</span> <span class="val">${name}</span></div>
      <div><span class="label">Name:</span> <span class="val">${nameEn}</span></div>
      <div><span class="label">العمر:</span> <span class="val">${age}</span></div>
      <div><span class="label">الجنسية:</span> <span class="val">${watchlist.nationality || "—"}</span></div>
      <div><span class="label">المركز:</span> <span class="val">${watchlist.position || "—"}</span></div>
      <div><span class="label">النادي:</span> <span class="val">${watchlist.currentClub || "—"}</span></div>
      <div><span class="label">الدوري:</span> <span class="val">${watchlist.currentLeague || "—"}</span></div>
      <div><span class="label">الأولوية:</span> <span class="val">${watchlist.priority || "—"}</span></div>
    </div>

    <div class="sub">التقييمات — Ratings</div>
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex:1">${ratingBars}
        <div class="bar-wrap" style="margin-top:6px;border-top:1px solid #ddd;padding-top:4px">
          <span class="bar-label" style="font-weight:700">المتوسط</span>
          <div class="bar-track"><div class="bar-fill" style="width:${avg !== "—" ? (Number(avg) / 10) * 100 : 0}%;background:#22c55e"></div></div>
          <span class="bar-val" style="color:#22c55e">${avg}</span>
        </div>
      </div>
      <div class="radar-wrap">${radarSvg}</div>
    </div>

    ${watchlist.notes ? `<div class="note-box"><strong>ملاحظات الكشاف:</strong> ${watchlist.notes}</div>` : ""}
    ${FOOTER}
  </div>`;
}

// ── Page 2: Screening Report ──

function buildScreeningPage(screening: any, watchlist: any): string {
  const name = watchlist.prospectNameAr || watchlist.prospectName || "—";

  const boolCell = (v: boolean) =>
    v ? '<span class="ok">✓ نعم</span>' : '<span class="nok">✗ لا</span>';
  const identityCell = (v: string) =>
    v === "Verified"
      ? '<span class="ok">✓ تم التحقق</span>'
      : v === "Failed"
        ? '<span class="nok">✗ فشل</span>'
        : '<span class="pend">⏳ معلق</span>';
  const fitCell = (v: string) =>
    v === "Fit"
      ? '<span class="ok">✓ لائق</span>'
      : v === "ConditionallyFit"
        ? '<span class="pend">⚠ لائق بشروط</span>'
        : v === "Unfit"
          ? '<span class="nok">✗ غير لائق</span>'
          : '<span class="pend">⏳ معلق</span>';
  const riskCell = (v: string) =>
    v === "Low"
      ? '<span class="ok">منخفض</span>'
      : v === "Medium"
        ? '<span class="pend">متوسط</span>'
        : v === "High"
          ? '<span class="nok">مرتفع</span>'
          : '<span class="nok">حرج</span>';

  const preparerName =
    screening.preparer?.fullNameAr || screening.preparer?.fullName || "—";

  return `<div class="pg">${HD}
    <div class="title">تقرير الفحص — ${name}</div>
    <div class="sub">بيانات الفحص — Screening Summary</div>
    <div class="bio-grid">
      <div><span class="label">رقم القضية:</span> <span class="val">${screening.caseNumber}</span></div>
      <div><span class="label">الحالة:</span> <span class="val">${screening.status === "PackReady" ? "جاهز للاختيار" : screening.status === "Closed" ? "مغلق" : "قيد التنفيذ"}</span></div>
      <div><span class="label">تاريخ التجهيز:</span> <span class="val">${fmtDate(screening.packPreparedAt)}</span></div>
      <div><span class="label">أعدّه:</span> <span class="val">${preparerName}</span></div>
    </div>

    <div class="sub">قائمة الفحوصات — Verification Checklist</div>
    <table>
      <thead><tr><th style="width:40%">البند</th><th>Item</th><th style="width:25%">النتيجة</th></tr></thead>
      <tbody>
        <tr><td>التحقق من الهوية</td><td>Identity Verification</td><td>${identityCell(screening.identityCheck)}</td></tr>
        <tr><td>التحقق من جواز السفر</td><td>Passport Verification</td><td>${boolCell(screening.passportVerified)}</td></tr>
        <tr><td>التحقق من العمر</td><td>Age Verification</td><td>${boolCell(screening.ageVerified)}</td></tr>
        <tr><td>الموافقة الطبية</td><td>Medical Clearance</td><td>${boolCell(screening.medicalClearance)}</td></tr>
        <tr><td>تقييم اللياقة</td><td>Fitness Assessment</td><td>${fitCell(screening.fitAssessment || "Pending")}</td></tr>
        <tr><td>تقييم المخاطر</td><td>Risk Assessment</td><td>${riskCell(screening.riskAssessment || "Low")}</td></tr>
      </tbody>
    </table>

    ${screening.notes ? `<div class="note-box"><strong>ملاحظات الفحص:</strong> ${screening.notes}</div>` : ""}
    ${FOOTER}
  </div>`;
}

// ── Main PDF Generator ──

export async function generateScoutingPackPdf(
  watchlist: any,
  screening: any,
): Promise<Buffer> {
  const wrap = (body: string) =>
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>${body}</body></html>`;

  const pages = [
    wrap(buildProfilePage(watchlist)),
    wrap(buildScreeningPage(screening, watchlist)),
  ];

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
        "--font-render-hinting=none",
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

    // ── Merge pages ──
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

    const finalBytes = await merged.save();
    return Buffer.from(finalBytes);
  } catch (err: any) {
    if (browser)
      try {
        await browser.close();
      } catch {}
    throw err;
  }
}
