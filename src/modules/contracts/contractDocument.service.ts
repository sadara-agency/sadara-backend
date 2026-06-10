import {
  renderFlowingHtmlToBuffer,
  mergeWithBrandPages,
  wrapHtml,
} from "@shared/utils/pdf";
import { logger } from "@config/logger";
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

// Re-exported from the registry — kept as a named export so existing import
// sites stay stable. The real logic now lives in contractMergeTags.
export { resolveMergeTags as applyMinimalTags } from "./contractMergeTags";

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
  // Time the brand-merge hop separately — it loads two ~780KB brand PDFs from
  // disk and runs a pdf-lib merge, which is a candidate slow step on the cold
  // path. Remove alongside the flow-render timings once the 504 is resolved.
  const mergeStart = process.hrtime.bigint();
  const merged = await mergeWithBrandPages([content]);
  logger.info("[pdf] brand merge timing", {
    mergeMs:
      Math.round(Number(process.hrtime.bigint() - mergeStart) / 1e5) / 10,
    outBytes: merged.length,
  });
  return merged;
}
