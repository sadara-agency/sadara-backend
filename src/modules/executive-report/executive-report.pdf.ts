/**
 * Renders the Executive Player Report as a branded 1-page PDF.
 * Reuses the shared Puppeteer pipeline (Arabic font embedding, brand cover/back).
 * Direction (RTL/LTR) follows the report locale.
 */
import {
  escHtml,
  wrapHtml,
  makeSadaraHeader,
  getArabicFontFaceCss,
  renderPagesToBuffers,
  mergeWithBrandPages,
} from "@shared/utils/pdf";
import type {
  ExecutiveReport,
  ReportLocale,
} from "@modules/executive-report/executive-report.types";

function t(locale: ReportLocale, ar: string, en: string): string {
  return locale === "ar" ? ar : en;
}

function fmtMoney(
  value: number | null,
  currency: string,
  locale: ReportLocale,
): string {
  if (value === null) return "—";
  const grouped = new Intl.NumberFormat(
    locale === "ar" ? "ar-SA" : "en-US",
  ).format(value);
  return `${grouped} ${currency}`;
}

const RECOMMENDATION_COLOR: Record<string, string> = {
  RENEW_URGENT_WITH_OFFERS: "#FF453A",
  RENEW_EARLY_SECURE: "#FF9F0A",
  HOLD_AND_MONITOR: "#34C759",
  REVIEW_PERFORMANCE_FIRST: "#FF9F0A",
  MONITOR: "#3C3CFA",
};

function buildCss(locale: ReportLocale): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const hdLeftAlign = locale === "ar" ? "left" : "right";
  return `
${getArabicFontFaceCss()}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;direction:${dir};text-align:${align};color:#11132B;background:#fff;width:595px;font-size:10pt;line-height:1.7}
.pg{width:595px;min-height:842px;position:relative;padding:24px 32px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #11132B;padding-bottom:10px;margin-bottom:16px}
.hd-r{text-align:${align}}.hd-r .lt{font-size:13pt;font-weight:700;color:#11132B}.hd-r .ls{font-size:7pt;color:#666}
.hd-l{font-size:7pt;color:#666;direction:ltr;text-align:${hdLeftAlign}}
.title{text-align:center;font-size:17pt;font-weight:700;color:#11132B;margin:6px 0 4px}
.subtitle{text-align:center;font-size:9.5pt;color:#555;margin-bottom:16px}
.bio-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 16px;font-size:9pt;background:#E4E5F3;border-radius:6px;padding:10px 14px;margin-bottom:16px}
.bio-grid .label{color:#555;font-weight:600;font-size:8pt}
.bio-grid .val{font-weight:700;color:#11132B}
.section{margin-bottom:14px}
.sec-title{font-size:10pt;font-weight:700;background:#11132B;color:#fff;display:inline-block;padding:3px 14px;border-radius:3px;margin-bottom:8px}
.sec-body{font-size:10pt;line-height:1.8;color:#222;padding:0 2px}
.rec-banner{border-radius:8px;padding:14px 16px;margin-top:6px;color:#fff}
.rec-banner .rec-label{font-size:8.5pt;opacity:.85;font-weight:600;margin-bottom:4px}
.rec-banner .rec-text{font-size:11pt;font-weight:700;line-height:1.7}
.footer{text-align:center;font-size:7.5pt;color:#999;border-top:1px solid #ddd;padding-top:8px;margin-top:24px;position:absolute;bottom:20px;left:32px;right:32px}
`;
}

export async function generateExecutiveReportPdf(
  report: ExecutiveReport,
): Promise<{ buffer: Buffer; playerName: string }> {
  const { locale, data, narrative } = report;
  const name =
    locale === "ar"
      ? (data.player.nameAr ?? data.player.nameEn)
      : data.player.nameEn;
  const club =
    locale === "ar"
      ? (data.player.clubNameAr ?? data.player.clubNameEn ?? "—")
      : (data.player.clubNameEn ?? "—");

  const header = makeSadaraHeader(
    t(locale, "تقرير قيادي للاعب", "Executive Player Report"),
  );
  const recColor =
    RECOMMENDATION_COLOR[narrative.recommendationKey] ?? "#3C3CFA";

  const bio = `
    <div class="bio-grid">
      <div><div class="label">${t(locale, "اللاعب", "Player")}</div><div class="val">${escHtml(name)}</div></div>
      <div><div class="label">${t(locale, "المركز", "Position")}</div><div class="val">${escHtml(data.player.position ?? "—")}</div></div>
      <div><div class="label">${t(locale, "العمر", "Age")}</div><div class="val">${data.player.age ?? "—"}</div></div>
      <div><div class="label">${t(locale, "النادي", "Club")}</div><div class="val">${escHtml(club)}</div></div>
      <div><div class="label">${t(locale, "القيمة السوقية", "Market Value")}</div><div class="val">${escHtml(fmtMoney(data.player.marketValue, data.player.marketValueCurrency, locale))}</div></div>
      <div><div class="label">${t(locale, "العروض القائمة", "Active Offers")}</div><div class="val">${data.offers.activeCount}</div></div>
    </div>`;

  const body = `<div class="pg">${header}
    <div class="title">${escHtml(name)}</div>
    <div class="subtitle">${t(locale, "ملخص تنفيذي لاتخاذ القرار", "Executive Decision Brief")}${data.season.label ? ` — ${escHtml(data.season.label)}` : ""}</div>
    ${bio}
    <div class="section">
      <div class="sec-title">${t(locale, "الموسم الحالي", "Current Season")}</div>
      <div class="sec-body">${escHtml(narrative.seasonSummary)}</div>
    </div>
    <div class="section">
      <div class="sec-title">${t(locale, "الوضع الراهن", "Current Situation")}</div>
      <div class="sec-body">${escHtml(narrative.currentSituation)}</div>
    </div>
    <div class="section">
      <div class="sec-title">${t(locale, "التوصية الأساسية", "Primary Recommendation")}</div>
      <div class="rec-banner" style="background:${recColor}">
        <div class="rec-label">${t(locale, "قرار القيادة", "Leadership Call")}</div>
        <div class="rec-text">${escHtml(narrative.recommendation)}</div>
      </div>
    </div>
    <div class="footer">${t(locale, "شركة صدارة الرياضية", "Sadara Sports Company")} — ${escHtml(report.generatedAt.split("T")[0])} — ${t(locale, "سري — للقيادة فقط", "Confidential — Leadership Only")}</div>
  </div>`;

  const html = wrapHtml(body, buildCss(locale));
  const pageBuffers = await renderPagesToBuffers([html]);
  const buffer = await mergeWithBrandPages(pageBuffers);
  return { buffer, playerName: name };
}
