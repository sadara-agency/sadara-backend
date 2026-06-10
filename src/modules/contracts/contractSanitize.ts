import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitizer for editable contract bodies. The body is authored by
 * trusted leadership/Legal and rendered server-side in Puppeteer, so this is
 * defense-in-depth: strip script/style/iframe/event-handlers while keeping the
 * formatting, lists, tables, and the limited inline text-direction styling a
 * bilingual (RTL/LTR) contract needs. Merge-tag placeholders ({{...}}) are
 * plain text and pass through untouched.
 */
export function sanitizeContractHtml(html: string): string {
  if (typeof html !== "string" || html.length === 0) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "br",
      "hr",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "span",
      "div",
      "blockquote",
      "img",
    ],
    allowedAttributes: {
      span: ["class", "style"],
      div: ["class", "style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      li: ["style"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      table: ["class"],
      // Embedded logo/images. src is restricted to data: URIs below; width/
      // height let the author size the image inline.
      img: ["src", "alt", "width", "height", "style"],
      "*": ["dir"],
    },
    // Safe inline styles only: directional/alignment plus an explicit font-size
    // (number + px/pt/em/rem) for the font-size control. No positioning, no
    // url(), no expressions.
    allowedStyles: {
      "*": {
        direction: [/^(ltr|rtl)$/],
        "text-align": [/^(left|right|center|start|end)$/],
        "font-size": [/^\d{1,3}(\.\d+)?(px|pt|em|rem)$/],
      },
    },
    // No remote/script schemes anywhere; images may only use base64 data URIs
    // (the editor embeds picked files as data: URIs, keeping the body
    // self-contained).
    allowedSchemes: [],
    allowedSchemesByTag: { img: ["data"] },
    disallowedTagsMode: "discard",
    // sanitize-html only filters explicit schemes; a bare/relative src passes
    // through. Strip any img src that is not a data: URI to close that gap.
    transformTags: {
      img: (tagName, attribs) => {
        const safe = { ...attribs };
        if (safe.src && !safe.src.startsWith("data:")) {
          delete safe.src;
        }
        return { tagName, attribs: safe };
      },
    },
  });
}
