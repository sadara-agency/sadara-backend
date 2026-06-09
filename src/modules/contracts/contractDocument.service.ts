import {
  renderFlowingHtmlToBuffer,
  mergeWithBrandPages,
  wrapHtml,
  escHtml,
} from "@shared/utils/pdf";
import {
  buildFormalSadaraCss,
  SADARA_RUNNING_HEADER,
  SADARA_PAGE_FOOTER,
} from "./contractStyles";

export interface BodySource {
  bodyHtmlSnapshot: string | null;
  bodyHtml: string | null;
}

/**
 * Body-source priority:
 *   1. frozen snapshot (signed contracts — immutable)
 *   2. editable body   (unsigned draft)
 *   3. null            -> caller falls back to the legacy pg2/pg3 generator
 */
export function selectBodyHtml(src: BodySource): string | null {
  if (src.bodyHtmlSnapshot && src.bodyHtmlSnapshot.trim().length > 0) {
    return src.bodyHtmlSnapshot;
  }
  if (src.bodyHtml && src.bodyHtml.trim().length > 0) {
    return src.bodyHtml;
  }
  return null;
}

/**
 * MINIMAL merge-tag substitution — Session 3 replaces this with the shared
 * registry resolver (contractMergeTags.ts). Until then, this fills the handful
 * of tags the preview needs and leaves unknown tags visible.
 * NOTE: superseded by Session 3 — do not extend here; extend the registry.
 */
export function applyMinimalTags(
  html: string,
  data: Record<string, string>,
): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const val = data[key];
    if (val === undefined) return match; // unknown tag stays visible
    return val === "" ? '<span class="blank"></span>' : escHtml(val);
  });
}

/** Wrap a resolved contract body in the Formal Sadara document shell. */
export function buildContractHtml(resolvedBodyHtml: string): string {
  return wrapHtml(resolvedBodyHtml, buildFormalSadaraCss());
}

/**
 * Render a resolved contract body to a full branded PDF buffer
 * (cover + flowing content pages + back).
 */
export async function renderContractPdf(
  resolvedBodyHtml: string,
): Promise<Buffer> {
  const html = buildContractHtml(resolvedBodyHtml);
  const content = await renderFlowingHtmlToBuffer(html, {
    headerHtml: SADARA_RUNNING_HEADER,
    footerHtml: SADARA_PAGE_FOOTER,
  });
  return mergeWithBrandPages([content]);
}
