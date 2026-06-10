import { getArabicFontFaceCss } from "@shared/utils/pdf";

/**
 * Formal Sadara contract stylesheet — faithful to the agency's approved PDF:
 * navy full-width clause banners, readable ~10.5pt IBM Plex Sans Arabic body,
 * uniform padding, RTL. Embeds the Arabic font so Puppeteer shapes Arabic
 * correctly (the legacy Tahoma stylesheet mangled diacritics).
 */
export function buildFormalSadaraCss(): string {
  return `
${getArabicFontFaceCss()}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "IBM Plex Sans Arabic", Tahoma, Arial, sans-serif;
  direction: rtl;
  color: #1a1a1a;
  font-size: 10.5pt;
  line-height: 1.85;
}
/* Bare h1/h2/h3 fallbacks so un-classed bodies (e.g. seeded skeleton
   templates and TipTap output before classes are applied) still get the
   formal look. The explicit .contract-title / .clause selectors below have
   the same specificity and come later in source, so classed elements win. */
h1, h1.contract-title {
  text-align: center;
  font-size: 16pt;
  font-weight: 700;
  color: #11132B;
  letter-spacing: 1px;
  margin: 6px 0 14px;
}
h2, h3, h2.clause, h3.clause {
  background: #11132B;
  color: #fff;
  font-weight: 700;
  font-size: 11pt;
  padding: 4px 12px;
  border-radius: 2px;
  margin: 14px 0 8px;
  break-after: avoid;
}
.clause-block { break-inside: avoid; }
p { margin: 6px 0; }
/* Embedded logo/images never overflow the printable width; preserve aspect
   ratio when only one dimension is given. */
img { max-width: 100%; height: auto; }
ol, ul { margin: 6px 22px 6px 0; padding: 0; }
li { margin: 3px 0; }
table.party {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 10pt;
}
table.party th {
  background: #11132B;
  color: #fff;
  text-align: center;
  padding: 4px;
  font-weight: 700;
}
table.party td {
  border: 1px solid #ccc;
  padding: 4px 8px;
}
table.party td.value { color: #3C3CFA; font-weight: 600; }
.merge-tag { color: #3C3CFA; font-weight: 600; }
.blank { display: inline-block; min-width: 110px; border-bottom: 1px solid #555; }
.sign-grid {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
  break-inside: avoid;
}
.sign-grid td { width: 50%; vertical-align: top; padding: 0 8px; }
.sign-line {
  border-bottom: 1px solid #000;
  display: inline-block;
  min-width: 140px;
  height: 14px;
}
`;
}

/** Repeated letterhead at the top of every contract page. */
export const SADARA_RUNNING_HEADER = `
<div style="width:100%; font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;
  font-size:7px; color:#11132B; padding:0 18mm; display:flex;
  justify-content:space-between; border-bottom:1px solid #11132B; padding-bottom:3px;">
  <span style="font-weight:700;">شركة صدارة الرياضية &nbsp; SADARA SPORTS COMPANY</span>
  <span style="direction:ltr; color:#666;">N.N/ 7052143646</span>
</div>`;

/** Page-number footer (formal). */
export const SADARA_PAGE_FOOTER = `
<div style="width:100%; font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;
  font-size:7px; color:#666; padding:0 18mm; text-align:center;">
  صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>
</div>`;
