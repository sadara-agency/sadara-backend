import {
  escHtml,
  fmtDate,
  calcAge,
  wrapHtml,
  makeSadaraHeader,
  renderPagesToBuffers,
  mergeWithBrandPages,
} from "@shared/utils/pdf";

// ── Translation Maps ──

const NATIONALITY_AR: Record<string, string> = {
  "Saudi Arabia": "السعودية",
  Egypt: "مصر",
  Jordan: "الأردن",
  UAE: "الإمارات",
  Kuwait: "الكويت",
  Qatar: "قطر",
  Bahrain: "البحرين",
  Oman: "عُمان",
  Iraq: "العراق",
  Morocco: "المغرب",
  Algeria: "الجزائر",
  Tunisia: "تونس",
  Brazil: "البرازيل",
  Argentina: "الأرجنتين",
  France: "فرنسا",
  Spain: "إسبانيا",
  Portugal: "البرتغال",
  Nigeria: "نيجيريا",
  Senegal: "السنغال",
  Japan: "اليابان",
  "South Korea": "كوريا الجنوبية",
  Colombia: "كولومبيا",
  Germany: "ألمانيا",
  Italy: "إيطاليا",
  England: "إنجلترا",
  Netherlands: "هولندا",
  Croatia: "كرواتيا",
  Uruguay: "الأوروغواي",
  Ghana: "غانا",
  "Ivory Coast": "ساحل العاج",
};

const POSITION_AR: Record<string, string> = {
  Goalkeeper: "حارس مرمى",
  "Center Back": "قلب دفاع",
  "Right Back": "ظهير أيمن",
  "Left Back": "ظهير أيسر",
  "Defensive Mid": "وسط دفاعي",
  Midfielder: "وسط",
  "Attacking Mid": "وسط هجومي",
  "Right Winger": "جناح أيمن",
  "Left Winger": "جناح أيسر",
  Striker: "مهاجم",
  "Center Forward": "مهاجم صريح",
};

const PRIORITY_AR: Record<string, string> = {
  High: "عالية",
  Medium: "متوسطة",
  Low: "منخفضة",
};

function natAr(en: string): string {
  return NATIONALITY_AR[en] || en;
}
function posAr(en: string): string {
  return POSITION_AR[en] || en;
}
function prioAr(en: string): string {
  return PRIORITY_AR[en] || en;
}

// ── CSS ──

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1a1a2e;background:#fff;width:595px;font-size:9pt;line-height:1.5}
.pg{width:595px;min-height:842px;position:relative;padding:20px 30px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f3460;padding-bottom:10px;margin-bottom:12px}
.hd-r{text-align:right}.hd-r .lt{font-size:13pt;font-weight:700;color:#0f3460}.hd-r .ls{font-size:7pt;color:#666}
.hd-l{text-align:left;direction:ltr;font-size:7pt;color:#666}
.title{text-align:center;font-size:16pt;font-weight:700;color:#0f3460;margin:8px 0 14px;letter-spacing:1px;word-break:break-word;overflow-wrap:break-word}
.sub{font-size:10pt;font-weight:700;background:#0f3460;color:#fff;display:inline-block;padding:2px 12px;margin:10px 0 6px;border-radius:2px}
.bio-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:8.5pt;margin-bottom:10px}
.bio-grid .label{color:#666;font-weight:600}.bio-grid .val{font-weight:700;word-break:break-word;overflow-wrap:break-word}
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
td{border-bottom:1px solid #e0e0e0;padding:4px 8px;word-break:break-word;overflow-wrap:break-word}
tr:nth-child(even){background:#f8f9fc}
.ok{color:#22c55e;font-weight:700}.nok{color:#ef4444;font-weight:700}.pend{color:#f59e0b;font-weight:700}
.note-box{background:#fffbe6;border:1px solid #fde68a;border-radius:4px;padding:6px 10px;font-size:8pt;margin-top:8px;word-break:break-word;overflow-wrap:break-word}
.footer{text-align:center;font-size:7pt;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:12px}
.radar-wrap{display:flex;justify-content:center;margin:10px 0}
`;

const HD = () => makeSadaraHeader("Scouting Pack Report");

const FOOTER = `<div class="footer">شركة صدارة المواهب الرياضية المحدودة — ملف استكشاف سري — Sadara Sports Company — Confidential Scouting Pack</div>`;

const dateFmt = (s: string | Date | null) => fmtDate(s, { fallback: "\u2014" });

// ── SVG Radar Chart ──

function buildRadarSvg(
  ratings: { label: string; labelAr: string; value: number }[],
): string {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 75;
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
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="#333">${escHtml(r.labelAr)} ${r.value || "\u2014"}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}${axes}${dataPolygon}${labels}
  </svg>`;
}

// ── Page 1: Prospect Profile ──

function buildProfilePage(watchlist: any): string {
  const name = watchlist.prospectNameAr || watchlist.prospectName || "\u2014";
  const nameEn = watchlist.prospectName || "";
  const age = watchlist.dateOfBirth ? calcAge(watchlist.dateOfBirth) : "\u2014";

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
      <span class="bar-val">${r.value || "\u2014"}</span>
    </div>`,
    )
    .join("");

  const vals = ratings.filter((r) => r.value > 0);
  const avg =
    vals.length > 0
      ? (vals.reduce((s, r) => s + r.value, 0) / vals.length).toFixed(1)
      : "\u2014";

  const radarSvg = buildRadarSvg(ratings);

  return `<div class="pg">${HD()}
    <div class="title">ملف الاستكشاف — ${escHtml(name)}</div>
    <div class="sub">بيانات المرشح — Prospect Bio</div>
    <div class="bio-grid">
      <div><span class="label">الاسم:</span> <span class="val">${escHtml(name)}</span></div>
      <div><span class="label">Name:</span> <span class="val">${escHtml(nameEn)}</span></div>
      <div><span class="label">العمر:</span> <span class="val">${escHtml(age)}</span></div>
      <div><span class="label">الجنسية:</span> <span class="val">${escHtml(natAr(watchlist.nationality || "\u2014"))}</span></div>
      <div><span class="label">المركز:</span> <span class="val">${escHtml(posAr(watchlist.position || "\u2014"))}</span></div>
      <div><span class="label">النادي:</span> <span class="val">${escHtml(watchlist.currentClub || "\u2014")}</span></div>
      <div><span class="label">الدوري:</span> <span class="val">${escHtml(watchlist.currentLeague || "\u2014")}</span></div>
      <div><span class="label">الأولوية:</span> <span class="val">${escHtml(prioAr(watchlist.priority || "\u2014"))}</span></div>
    </div>

    <div class="sub">التقييمات — Ratings</div>
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex:1">${ratingBars}
        <div class="bar-wrap" style="margin-top:6px;border-top:1px solid #ddd;padding-top:4px">
          <span class="bar-label" style="font-weight:700">المتوسط</span>
          <div class="bar-track"><div class="bar-fill" style="width:${avg !== "\u2014" ? (Number(avg) / 10) * 100 : 0}%;background:#22c55e"></div></div>
          <span class="bar-val" style="color:#22c55e">${avg}</span>
        </div>
      </div>
      <div class="radar-wrap">${radarSvg}</div>
    </div>

    ${watchlist.notes ? `<div class="note-box"><strong>ملاحظات الكشاف:</strong> ${escHtml(watchlist.notes)}</div>` : ""}
    ${FOOTER}
  </div>`;
}

// ── Page 2: Screening Report ──

function buildScreeningPage(screening: any, watchlist: any): string {
  const name = watchlist.prospectNameAr || watchlist.prospectName || "\u2014";

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
    screening.preparer?.fullNameAr || screening.preparer?.fullName || "\u2014";

  return `<div class="pg">${HD()}
    <div class="title">تقرير الفحص — ${escHtml(name)}</div>
    <div class="sub">بيانات الفحص — Screening Summary</div>
    <div class="bio-grid">
      <div><span class="label">رقم القضية:</span> <span class="val">${escHtml(screening.caseNumber)}</span></div>
      <div><span class="label">الحالة:</span> <span class="val">${screening.status === "PackReady" ? "جاهز للاختيار" : screening.status === "Closed" ? "مغلق" : "قيد التنفيذ"}</span></div>
      <div><span class="label">تاريخ التجهيز:</span> <span class="val">${dateFmt(screening.packPreparedAt)}</span></div>
      <div><span class="label">أعدّه:</span> <span class="val">${escHtml(preparerName)}</span></div>
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

    ${screening.notes ? `<div class="note-box"><strong>ملاحظات الفحص:</strong> ${escHtml(screening.notes)}</div>` : ""}
    ${FOOTER}
  </div>`;
}

// ── Main PDF Generator ──

export async function generateScoutingPackPdf(
  watchlist: any,
  screening: any,
): Promise<Buffer> {
  const pages = [
    wrapHtml(buildProfilePage(watchlist), CSS),
    wrapHtml(buildScreeningPage(screening, watchlist), CSS),
  ];

  const contentBuffers = await renderPagesToBuffers(pages, {
    extraArgs: ["--font-render-hinting=none"],
  });
  return mergeWithBrandPages(contentBuffers);
}
