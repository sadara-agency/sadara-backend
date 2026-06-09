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
    ],
    allowedAttributes: {
      span: ["class", "style"],
      div: ["class", "style"],
      p: ["style"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      table: ["class"],
      "*": ["dir"],
    },
    // Only safe directional/alignment inline styles survive — no positioning,
    // no url(), no expressions.
    allowedStyles: {
      "*": {
        direction: [/^(ltr|rtl)$/],
        "text-align": [/^(left|right|center|start|end)$/],
      },
    },
    allowedSchemes: [],
    disallowedTagsMode: "discard",
  });
}
