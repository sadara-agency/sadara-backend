import { renderPagesToBuffers, wrapHtml, escHtml } from "./pdf";

export type CoverKind = "report" | "scouting" | "mediakit" | "predefined";

export interface CoverOpts {
  kind: CoverKind;
  titleAr: string;
  titleEn: string;
  subjectAr?: string;
  subjectEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  meta?: { label: string; value: string }[];
}

const KIND_LABEL_AR: Record<CoverKind, string> = {
  report: "تقرير",
  scouting: "كشافة",
  mediakit: "ملف إعلامي",
  predefined: "تقرير",
};

const KIND_LABEL_EN: Record<CoverKind, string> = {
  report: "Report",
  scouting: "Scouting Pack",
  mediakit: "Media Kit",
  predefined: "Report",
};

const SADARA_MARK_SVG = `<svg width="120" height="120" viewBox="0 0 71 72" xmlns="http://www.w3.org/2000/svg">
  <path fill="#ffffff" d="M68.4451 35.1082V36.4741C52.4595 37.659 39.8649 51.0033 39.8649 67.2906C39.8649 67.8852 39.8821 68.4798 39.9166 69.0658C39.9166 69.1218 39.9209 69.1778 39.9252 69.2338H38.6627C38.6627 69.2338 38.6627 69.2166 38.6627 69.208C38.7489 68.273 38.792 67.325 38.792 66.3599C38.792 49.2927 24.9564 35.4529 7.8893 35.4529C6.0753 35.4529 4.30009 35.6124 2.57227 35.914V34.8282C18.769 33.8587 31.6049 20.4196 31.6049 3.98156C31.6049 3.92554 31.6049 3.86953 31.6049 3.8092H32.8415C32.8372 4.0548 32.8329 4.30471 32.8329 4.55032C32.8329 21.6174 46.6685 35.4529 63.7399 35.4529C65.3385 35.4529 66.9112 35.3323 68.4494 35.0996L68.4451 35.1082Z"/>
  <path fill="#ffffff" d="M70.9615 24.5687C66.9759 12.293 56.7209 2.8438 43.9712 0C47.513 12.5472 57.9662 22.1946 70.9615 24.5687Z"/>
  <path fill="#ffffff" d="M0 44.2169C3.18851 58.13 14.2492 69.0398 28.2485 72C25.6373 57.7724 14.3052 46.5954 0 44.2169Z"/>
  <path fill="#ffffff" d="M51.3911 69.4014C60.2715 65.2865 67.2389 57.7375 70.5825 48.4564C61.5383 52.3386 54.4891 59.9738 51.3911 69.4014Z"/>
  <path fill="#ffffff" d="M20.2987 2.58069C11.8621 6.53615 5.17056 13.5896 1.69336 22.2848C10.2765 18.5404 17.0413 11.4094 20.2987 2.58069Z"/>
</svg>`;

const COVER_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:595px;height:842px}
body{
  font-family: 'Tahoma', 'Arial', sans-serif;
  background:#11132B;
  color:#ffffff;
  position:relative;
  overflow:hidden;
}
.bg-glow-tr{position:absolute;top:-180px;right:-180px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle, rgba(60,60,250,0.30) 0%, rgba(60,60,250,0) 70%);}
.bg-glow-bl{position:absolute;bottom:-220px;left:-220px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle, rgba(212,168,67,0.10) 0%, rgba(212,168,67,0) 70%);}
.cover{
  position:relative;
  width:595px;
  height:842px;
  padding:80px 60px 60px;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.brand-row{display:flex;align-items:center;gap:14px;margin-bottom:6px;}
.brand-tile{
  width:64px;height:64px;border-radius:18px;
  background:linear-gradient(135deg, #3C3CFA 0%, #5A5AFF 100%);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 24px rgba(60,60,250,0.35);
}
.brand-tile svg{width:36px;height:36px;}
.brand-text-block{display:flex;flex-direction:column;line-height:1;}
.brand-name{font-size:22pt;font-weight:700;letter-spacing:-0.4px;color:#ffffff;}
.brand-tag{font-size:7.5pt;color:rgba(228,229,243,0.55);letter-spacing:3px;text-transform:uppercase;margin-top:6px;}
.kind-pill{
  margin-top:80px;
  font-size:9pt;
  letter-spacing:4px;
  text-transform:uppercase;
  color:#3C3CFA;
  font-weight:700;
  padding:6px 16px;
  border:1px solid rgba(60,60,250,0.40);
  border-radius:999px;
  background:rgba(60,60,250,0.08);
}
.title-block{
  margin-top:42px;
  text-align:center;
  width:100%;
}
.title-ar{
  font-size:28pt;
  font-weight:700;
  color:#ffffff;
  line-height:1.2;
  letter-spacing:-0.5px;
  direction:rtl;
}
.title-divider{
  width:80px;height:2px;
  background:linear-gradient(90deg, rgba(228,229,243,0) 0%, #3C3CFA 50%, rgba(228,229,243,0) 100%);
  margin:18px auto;
}
.title-en{
  font-size:18pt;
  font-weight:500;
  color:rgba(228,229,243,0.85);
  letter-spacing:0.5px;
}
.subject-block{
  margin-top:54px;
  text-align:center;
  width:100%;
  padding:0 30px;
}
.subject-line{
  font-size:14pt;
  font-weight:600;
  color:#ffffff;
  line-height:1.5;
}
.subject-line bdi{display:inline-block;}
.subtitle-line{
  font-size:10pt;
  color:rgba(228,229,243,0.55);
  margin-top:10px;
  line-height:1.5;
}
.spacer{flex:1;}
.footer-rule{
  width:100%;height:1px;
  background:linear-gradient(90deg, rgba(228,229,243,0) 0%, rgba(228,229,243,0.20) 50%, rgba(228,229,243,0) 100%);
  margin-bottom:18px;
}
.footer-row{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  width:100%;
  font-size:8pt;
  color:rgba(228,229,243,0.45);
  letter-spacing:0.4px;
}
.footer-row .meta-block{display:flex;flex-direction:column;gap:4px;}
.footer-row .meta-row{display:flex;gap:6px;}
.footer-row .meta-label{color:rgba(228,229,243,0.30);text-transform:uppercase;letter-spacing:1.5px;font-size:7pt;}
.footer-row .meta-value{color:rgba(228,229,243,0.75);font-weight:600;}
.kind-arabic{font-size:9pt;color:rgba(228,229,243,0.45);direction:rtl;}
`;

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function buildCoverHtml(opts: CoverOpts): string {
  const subjectAr = opts.subjectAr ? escHtml(opts.subjectAr) : "";
  const subjectEn = opts.subjectEn ? escHtml(opts.subjectEn) : "";
  let subjectLine = "";
  if (subjectAr && subjectEn) {
    subjectLine = `<bdi dir="rtl">${subjectAr}</bdi> <span style="opacity:0.5;margin:0 8px;">/</span> <bdi dir="ltr">${subjectEn}</bdi>`;
  } else if (subjectAr) {
    subjectLine = `<bdi dir="rtl">${subjectAr}</bdi>`;
  } else if (subjectEn) {
    subjectLine = `<bdi dir="ltr">${subjectEn}</bdi>`;
  }

  const subtitleParts: string[] = [];
  if (opts.subtitleAr)
    subtitleParts.push(`<bdi dir="rtl">${escHtml(opts.subtitleAr)}</bdi>`);
  if (opts.subtitleEn)
    subtitleParts.push(`<bdi dir="ltr">${escHtml(opts.subtitleEn)}</bdi>`);
  const subtitleLine = subtitleParts.join(
    ' <span style="opacity:0.4;margin:0 6px;">·</span> ',
  );

  const metaRows = (opts.meta ?? [])
    .map(
      (m) =>
        `<div class="meta-row"><span class="meta-label">${escHtml(m.label)}</span><span class="meta-value">${escHtml(m.value)}</span></div>`,
    )
    .join("");

  const body = `
    <div class="bg-glow-tr"></div>
    <div class="bg-glow-bl"></div>
    <div class="cover">
      <div class="brand-row">
        <div class="brand-tile">${SADARA_MARK_SVG}</div>
        <div class="brand-text-block">
          <span class="brand-name">SADARA</span>
          <span class="brand-tag">Sports Management</span>
        </div>
      </div>

      <div class="kind-pill">${escHtml(KIND_LABEL_EN[opts.kind])}</div>

      <div class="title-block">
        <div class="title-ar">${escHtml(opts.titleAr)}</div>
        <div class="title-divider"></div>
        <div class="title-en">${escHtml(opts.titleEn)}</div>
      </div>

      ${
        subjectLine
          ? `<div class="subject-block">
        <div class="subject-line">${subjectLine}</div>
        ${subtitleLine ? `<div class="subtitle-line">${subtitleLine}</div>` : ""}
      </div>`
          : ""
      }

      <div class="spacer"></div>

      <div class="footer-rule"></div>
      <div class="footer-row">
        <div class="meta-block">
          ${metaRows || `<div class="meta-row"><span class="meta-label">Generated</span><span class="meta-value">${todayIso()}</span></div>`}
        </div>
        <div class="kind-arabic">شركة صدارة الرياضية &nbsp;·&nbsp; ${escHtml(KIND_LABEL_AR[opts.kind])}</div>
      </div>
    </div>
  `;

  return wrapHtml(body, COVER_CSS);
}

/**
 * Render a Sadara-branded cover page for a non-contract PDF as a single-page
 * PDF buffer. Combine with `mergeWithBrandPages({ coverBuffer })`.
 */
export async function renderCoverPageBuffer(
  opts: CoverOpts,
): Promise<Uint8Array> {
  const html = buildCoverHtml(opts);
  const [buf] = await renderPagesToBuffers([html], { settleMs: 200 });
  return buf;
}
