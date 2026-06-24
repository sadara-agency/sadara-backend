import https from "https";
import http from "http";
import {
  escHtml,
  fmtDate,
  getArabicFontFaceCss,
  getBrandImageDataUri,
  makeLetterheadFooterTemplate,
  makeLetterheadHeaderTemplate,
  renderFlowingHtmlToBuffer,
} from "@shared/utils/pdf";
import { streamFileBuffer } from "@shared/utils/storage";
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
${getArabicFontFaceCss()}
* { box-sizing: border-box; }
body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 0; padding: 0; }
body.rtl { direction: rtl; }
.hd { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f3460; padding-bottom: 10px; margin-bottom: 14px; }
.hd-r .lt { font-size: 14px; font-weight: 700; color: #0f3460; }
.hd-r .ls { font-size: 9px; color: #666; letter-spacing: 1px; }
.hd-l { font-size: 9px; color: #666; text-align: end; }
h1 { font-size: 18px; color: #0f3460; margin: 0 0 4px 0; }
h2 { font-size: 12px; color: #ffffff; background: #0f3460; padding: 8px 12px; margin: 18px 0 8px 0; border-radius: 4px; break-after: avoid; }
.subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
section { break-inside: auto; }
table { table-layout: fixed; width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: #e8ecf3; color: #0f3460; text-align: start; padding: 5px 6px; font-weight: 600; border-bottom: 2px solid #c9d1e0; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
td { padding: 5px 6px; border-bottom: 1px solid #eef0f4; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
tr:nth-child(even) td { background: #f8f9fb; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; margin-bottom: 10px; }
.kv .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dotted #e0e3ea; }
.kv .k { color: #666; font-size: 10px; }
.kv .v { font-weight: 600; font-size: 10px; max-width: 55%; word-break: break-word; text-align: end; }
.personal-header { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
.avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid #0f3460; flex-shrink: 0; }
.avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; background: #e8ecf3; border: 3px solid #0f3460; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.avatar-placeholder svg { width: 40px; height: 40px; fill: #0f3460; opacity: 0.4; }
.player-name { font-size: 18px; font-weight: 700; color: #0f3460; margin: 0 0 2px 0; }
.player-meta { font-size: 10px; color: #666; }
.empty { color: #999; font-style: italic; padding: 8px 0; }
.footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e0e3ea; color: #999; font-size: 9px; }
.omitted { background: #fff7e6; border-inline-start: 3px solid #d4a843; padding: 8px 12px; margin: 12px 0; font-size: 10px; }
.tag { display: inline-block; padding: 2px 7px; border-radius: 3px; background: #e8ecf3; color: #0f3460; font-size: 9px; margin-inline-end: 4px; }
`;

// ── Avatar fetch ──

/** Fetches an image URL or Supabase storage key and returns a data URI. */
async function fetchAvatarDataUri(photoUrl: string): Promise<string | null> {
  try {
    if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
      const buf = await new Promise<Buffer>((resolve, reject) => {
        const client = photoUrl.startsWith("https://") ? https : http;
        client
          .get(photoUrl, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c: Buffer) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
          })
          .on("error", reject);
      });
      const mime = photoUrl.endsWith(".webp")
        ? "image/webp"
        : photoUrl.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    }
    // Bare storage key (Supabase) or local path starting with /uploads/
    const key = photoUrl.startsWith("/uploads/")
      ? photoUrl.replace(/^\/uploads\//, "")
      : photoUrl;
    const buf = await streamFileBuffer(key);
    const mime = key.endsWith(".webp")
      ? "image/webp"
      : key.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ── Rendering ──

function t(locale: "en" | "ar", key: SectionKey): string {
  return SECTION_TITLE[key][locale];
}

const MAX_CELL_LEN = 300;

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return fmtDate(v);
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return escHtml(
      s.length > MAX_CELL_LEN ? s.slice(0, MAX_CELL_LEN) + "…" : s,
    );
  }
  const s = String(v);
  return escHtml(s.length > MAX_CELL_LEN ? s.slice(0, MAX_CELL_LEN) + "…" : s);
}

const AVATAR_PLACEHOLDER = `<div class="avatar-placeholder"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></div>`;

function renderPersonalBlock(
  player: Record<string, unknown>,
  locale: "en" | "ar",
  avatarDataUri?: string | null,
): string {
  const L = locale === "ar";
  const displayName = L
    ? `${player.firstNameAr ?? player.firstName ?? ""} ${player.lastNameAr ?? player.lastName ?? ""}`.trim()
    : `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();

  const avatarHtml = avatarDataUri
    ? `<img class="avatar" src="${avatarDataUri}" alt="player" />`
    : AVATAR_PLACEHOLDER;

  const position = [player.position, player.secondaryPosition]
    .filter(Boolean)
    .join(" · ");
  const metaLine = [player.nationality, position, player.status]
    .filter(Boolean)
    .map((v) => escHtml(String(v)))
    .join(" &nbsp;|&nbsp; ");

  const header = `<div class="personal-header">${avatarHtml}<div><p class="player-name">${escHtml(displayName)}</p><p class="player-meta">${metaLine}</p></div></div>`;

  const fields: [string, unknown][] = [
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
    [L ? "البريد" : "Email", player.email],
    [L ? "الهاتف" : "Phone", player.phone],
  ];
  const rows = fields
    .filter(([, v]) => v !== undefined && v !== null)
    .map(
      ([k, v]) =>
        `<div class="row"><span class="k">${escHtml(k)}</span><span class="v">${fmt(v)}</span></div>`,
    )
    .join("");
  return `${header}<div class="kv">${rows}</div>`;
}

function renderTableBlock(section: SectionRows, locale: "en" | "ar"): string {
  if (!section.rows.length) {
    return `<p class="empty">${locale === "ar" ? "لا توجد بيانات" : "No records."}</p>`;
  }
  // Collect union of keys across rows; drop internal, binary, and blob fields
  const BLOB_SUFFIXES = [
    "Url",
    "Id",
    "Json",
    "Html",
    "Snapshot",
    "Data",
    "Token",
    "Hash",
    "Secret",
  ];
  const BLOB_KEYS = new Set([
    "bodyJson",
    "bodyHtml",
    "bodyHtmlSnapshot",
    "bodyFrozenAt",
    "agentSignatureData",
    "playerSignatureData",
    "signatureData",
    "notes",
    "declarationText",
  ]);
  const keys = Array.from(
    new Set(section.rows.flatMap((r) => Object.keys(r))),
  ).filter(
    (k) =>
      !["id", "createdAt", "updatedAt", "deletedAt"].includes(k) &&
      !BLOB_KEYS.has(k) &&
      !BLOB_SUFFIXES.some((s) => k.endsWith(s)),
  );
  // Wide sections (>8 columns) render as stacked key-value cards to avoid
  // column-crush on A4 (~163mm usable width / 25 columns ≈ 6.5mm each).
  if (keys.length > 8) {
    const cards = section.rows
      .map((r) => {
        const pairs = keys
          .filter((k) => r[k] !== null && r[k] !== undefined && r[k] !== "")
          .map(
            (k) =>
              `<div class="row"><span class="k">${escHtml(labelize(k))}</span><span class="v">${fmt(r[k])}</span></div>`,
          )
          .join("");
        return `<div class="kv" style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e0e3ea;">${pairs}</div>`;
      })
      .join("");
    return cards;
  }

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

/**
 * Builds a single full-document HTML string.
 * @param forPdf When true the in-body letterhead bar is omitted because the PDF
 *   path renders the letterhead via Puppeteer running header/footer. The offline
 *   HTML export (forPdf=false) keeps a self-contained header bar.
 */
export function renderHtml(
  data: AggregatedPlayerExport,
  forPdf = false,
  avatarDataUri?: string | null,
): string {
  const locale: "en" | "ar" = data.locale;
  const L = locale === "ar";
  const player = data.player;
  const displayName = L
    ? `${player.firstNameAr ?? player.firstName ?? ""} ${player.lastNameAr ?? player.lastName ?? ""}`.trim()
    : `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();

  const header = forPdf
    ? ""
    : `<div class="hd"><div class="hd-r"><div class="lt">شـركــة صـــدارة الـريـاضـيـة</div><div class="ls">SADARA SPORTS COMPANY</div></div><div class="hd-l">${escHtml(
        L ? "ملف اللاعب" : "Player Profile Export",
      )}<br>Generated: ${fmtDate(data.generatedAt)}</div></div>`;

  const sectionKeys = Object.keys(data.sections) as SectionKey[];
  const body = sectionKeys
    .map((key) => {
      const section = data.sections[key]!;
      const block =
        key === "personal"
          ? renderPersonalBlock(data.player, locale, avatarDataUri)
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
${
  forPdf
    ? ""
    : `<div class="footer">${escHtml(
        L
          ? "تم إنشاؤه بواسطة منصة صدارة"
          : "Generated by Sadara Sports platform",
      )}</div>`
}`;

  return `<!DOCTYPE html><html lang="${locale}" dir="${L ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>Player Profile</title><style>${CSS}</style></head><body class="${bodyClass}">${inner}</body></html>`;
}

/** HTML export: returns the renderHtml() output as a Buffer. */
export function renderHtmlBuffer(data: AggregatedPlayerExport): Buffer {
  return Buffer.from(renderHtml(data), "utf-8");
}

/**
 * PDF export: Puppeteer paginates the report and stamps the Sadara letterhead
 * (logo header + ID/date, address/pattern footer) on every page.
 */
export async function renderPdfBuffer(
  data: AggregatedPlayerExport,
): Promise<Buffer> {
  const photoUrl = data.player.photoUrl as string | null | undefined;
  const avatarDataUri = photoUrl ? await fetchAvatarDataUri(photoUrl) : null;

  const html = renderHtml(data, true, avatarDataUri);

  const displayId =
    (data.player.displayId as string) ||
    String(data.player.id ?? "").slice(0, 8);
  const rightText = `${displayId} · ${fmtDate(data.generatedAt)}`;

  const headerHtml = makeLetterheadHeaderTemplate({
    logoDataUri: getBrandImageDataUri("sadara-logo.png"),
    rightText,
  });
  const footerHtml = makeLetterheadFooterTemplate({
    patternDataUri: getBrandImageDataUri("footer-pattern.png"),
  });

  const buf = await renderFlowingHtmlToBuffer(html, {
    headerHtml,
    footerHtml,
    // top clears the logo header, bottom clears address line + pattern strip.
    margin: { top: "32mm", bottom: "26mm", left: "16mm", right: "16mm" },
  });
  return Buffer.from(buf);
}
