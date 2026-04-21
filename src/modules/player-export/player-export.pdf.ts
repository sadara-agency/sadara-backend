import {
  escHtml,
  fmtDate,
  makeSadaraHeader,
  renderPagesToBuffers,
  mergeWithBrandPages,
} from "@shared/utils/pdf";
import type {
  AggregatedPlayerExport,
  SectionRows,
} from "./player-export.service";
import type { SectionKey } from "./player-export.validation";

// ── Section labels (bilingual) ──

const SECTION_TITLE: Record<SectionKey, { en: string; ar: string }> = {
  personal: { en: "Personal Information", ar: "المعلومات الشخصية" },
  stats: { en: "Career Statistics", ar: "إحصائيات المسيرة" },
  contracts: { en: "Contract History", ar: "سجل العقود" },
  injuries: { en: "Injuries & Medical", ar: "الإصابات والحالة الطبية" },
  training: { en: "Training & Development", ar: "التدريب والتطوير" },
  sessions: { en: "Coaching Sessions", ar: "جلسات التدريب" },
  wellness: { en: "Wellness & Performance", ar: "العافية والأداء" },
  reports: { en: "Technical Reports", ar: "التقارير الفنية" },
  finance: { en: "Finance", ar: "المالية" },
  documents: { en: "Documents", ar: "المستندات" },
  notes: { en: "Notes", ar: "الملاحظات" },
  offers: { en: "Offers & Transfers", ar: "العروض والانتقالات" },
};

// ── CSS — inline, self-contained (HTML export must open offline) ──

const CSS = `
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; padding: 18px 22px; }
body.rtl { direction: rtl; }
.hd { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f3460; padding-bottom: 8px; margin-bottom: 12px; }
.hd-r .lt { font-size: 13px; font-weight: 700; color: #0f3460; }
.hd-r .ls { font-size: 9px; color: #666; letter-spacing: 1px; }
.hd-l { font-size: 8px; color: #666; text-align: end; }
h1 { font-size: 16px; color: #0f3460; margin: 0 0 4px 0; }
h2 { font-size: 12px; color: #ffffff; background: #0f3460; padding: 6px 10px; margin: 16px 0 6px 0; border-radius: 3px; }
.subtitle { font-size: 10px; color: #666; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9px; }
th { background: #e8ecf3; color: #0f3460; text-align: start; padding: 5px 6px; font-weight: 600; border-bottom: 1px solid #c9d1e0; }
td { padding: 4px 6px; border-bottom: 1px solid #eef0f4; vertical-align: top; }
tr:nth-child(even) td { background: #f8f9fb; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 8px; }
.kv .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #e0e3ea; }
.kv .k { color: #666; font-size: 9px; }
.kv .v { font-weight: 600; font-size: 9px; }
.empty { color: #999; font-style: italic; padding: 6px 0; }
.footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #e0e3ea; color: #999; font-size: 8px; }
.omitted { background: #fff7e6; border-inline-start: 3px solid #d4a843; padding: 6px 10px; margin: 10px 0; font-size: 9px; }
.tag { display: inline-block; padding: 1px 6px; border-radius: 3px; background: #e8ecf3; color: #0f3460; font-size: 8px; margin-inline-end: 4px; }
`;

// ── Rendering ──

function t(locale: "en" | "ar", key: SectionKey): string {
  return SECTION_TITLE[key][locale];
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return fmtDate(v);
  if (typeof v === "object") return escHtml(JSON.stringify(v));
  return escHtml(String(v));
}

function renderPersonalBlock(
  player: Record<string, unknown>,
  locale: "en" | "ar",
): string {
  const L = locale === "ar";
  const displayName = L
    ? `${player.firstNameAr ?? player.firstName ?? ""} ${player.lastNameAr ?? player.lastName ?? ""}`.trim()
    : `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();

  const fields: [string, unknown][] = [
    [L ? "الاسم الكامل" : "Full Name", displayName],
    [L ? "تاريخ الميلاد" : "Date of Birth", player.dateOfBirth],
    [L ? "الجنسية" : "Nationality", player.nationality],
    [L ? "الرقم القومي" : "National ID", player.nationalId],
    [L ? "المركز" : "Position", player.position],
    [L ? "المركز الثانوي" : "Secondary Position", player.secondaryPosition],
    [L ? "القدم المفضلة" : "Preferred Foot", player.preferredFoot],
    [L ? "الرقم" : "Jersey #", player.jerseyNumber],
    [L ? "الطول" : "Height (cm)", player.heightCm],
    [L ? "الوزن" : "Weight (kg)", player.weightKg],
    [L ? "النوع" : "Player Type", player.playerType],
    [L ? "الباقة" : "Package", player.playerPackage],
    [L ? "القيمة السوقية" : "Market Value", player.marketValue],
    [L ? "العملة" : "Currency", player.marketValueCurrency],
    [L ? "الحالة" : "Status", player.status],
    [L ? "البريد" : "Email", player.email],
    [L ? "الهاتف" : "Phone", player.phone],
  ];
  const rows = fields
    .filter(([, v]) => v !== undefined)
    .map(
      ([k, v]) =>
        `<div class="row"><span class="k">${escHtml(k)}</span><span class="v">${fmt(v)}</span></div>`,
    )
    .join("");
  return `<div class="kv">${rows}</div>`;
}

function renderTableBlock(section: SectionRows, locale: "en" | "ar"): string {
  if (!section.rows.length) {
    return `<p class="empty">${locale === "ar" ? "لا توجد بيانات" : "No records."}</p>`;
  }
  // Collect union of keys across rows; drop noisy internal fields
  const keys = Array.from(
    new Set(section.rows.flatMap((r) => Object.keys(r))),
  ).filter(
    (k) =>
      !["id", "createdAt", "updatedAt", "deletedAt"].includes(k) &&
      !k.endsWith("Url") &&
      !k.endsWith("Id"),
  );
  const header = keys.map((k) => `<th>${escHtml(labelize(k))}</th>`).join("");
  const rowsHtml = section.rows
    .map((r) => `<tr>${keys.map((k) => `<td>${fmt(r[k])}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function labelize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Builds a single full-document HTML string (used for both HTML export and as Puppeteer source). */
export function renderHtml(data: AggregatedPlayerExport): string {
  const locale: "en" | "ar" = data.locale;
  const L = locale === "ar";
  const player = data.player;
  const displayName = L
    ? `${player.firstNameAr ?? player.firstName ?? ""} ${player.lastNameAr ?? player.lastName ?? ""}`.trim()
    : `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();

  const header = makeSadaraHeader(L ? "ملف اللاعب" : "Player Profile Export");

  const sectionKeys = Object.keys(data.sections) as SectionKey[];
  const body = sectionKeys
    .map((key) => {
      const section = data.sections[key]!;
      const block =
        key === "personal"
          ? renderPersonalBlock(data.player, locale)
          : renderTableBlock(section, locale);
      const noteHtml = section.note
        ? `<p class="omitted">${escHtml(section.note)}</p>`
        : "";
      return `<section><h2>${escHtml(t(locale, key))}</h2>${noteHtml}${block}</section>`;
    })
    .join("");

  const omittedBlock = data.omitted.length
    ? `<div class="omitted">${escHtml(
        L
          ? "تم استبعاد بعض الأقسام بسبب صلاحيات المستخدم: "
          : "Some sections were omitted due to your role permissions: ",
      )}${data.omitted.map((k) => escHtml(t(locale, k))).join(", ")}</div>`
    : "";

  const bodyClass = L ? "rtl" : "ltr";
  const subtitle = L
    ? `اللاعب: ${escHtml(displayName)}`
    : `Subject: ${escHtml(displayName)}`;

  const inner = `
${header}
<h1>${L ? "ملف اللاعب" : "Player Profile"}</h1>
<p class="subtitle">${subtitle} · ${fmtDate(data.generatedAt)}</p>
${omittedBlock}
${body}
<div class="footer">${escHtml(
    L ? "تم إنشاؤه بواسطة منصة صدارة" : "Generated by Sadara Sports platform",
  )}</div>`;

  return `<!DOCTYPE html><html lang="${locale}" dir="${L ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>Player Profile</title><style>${CSS}</style></head><body class="${bodyClass}">${inner}</body></html>`;
}

/** HTML export: returns the renderHtml() output as a Buffer. */
export function renderHtmlBuffer(data: AggregatedPlayerExport): Buffer {
  return Buffer.from(renderHtml(data), "utf-8");
}

/** PDF export: Puppeteer → pdf-lib merge with cover/back brand pages. */
export async function renderPdfBuffer(
  data: AggregatedPlayerExport,
): Promise<Buffer> {
  const html = renderHtml(data);
  // renderHtml() already emits a full <!DOCTYPE html> doc with inline CSS;
  // Puppeteer paginates long content automatically.
  const bufs = await renderPagesToBuffers([html], {});
  return mergeWithBrandPages(bufs);
}
