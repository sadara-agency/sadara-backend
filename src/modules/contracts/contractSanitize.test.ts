import { sanitizeContractHtml } from "./contractSanitize";

describe("sanitizeContractHtml", () => {
  it("keeps allowed formatting and table tags", () => {
    const input =
      "<h1>عقد</h1><h2>المادة</h2><p><strong>x</strong></p><table><tr><td>a</td></tr></table><ul><li>i</li></ul>";
    const out = sanitizeContractHtml(input);
    expect(out).toContain("<h1>");
    expect(out).toContain("<h2>");
    expect(out).toContain("<table>");
    expect(out).toContain("<li>");
    expect(out).toContain("<strong>");
  });

  it("strips script and style tags", () => {
    const out = sanitizeContractHtml(
      "<p>ok</p><script>alert(1)</script><style>p{}</style>",
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<style");
    expect(out).toContain("<p>ok</p>");
  });

  it("strips on* event handler attributes", () => {
    const out = sanitizeContractHtml('<p onclick="evil()">hi</p>');
    expect(out).not.toContain("onclick");
    expect(out).toContain("hi");
  });

  it("preserves merge-tag placeholders untouched", () => {
    const out = sanitizeContractHtml("<p>{{player.name}}</p>");
    expect(out).toContain("{{player.name}}");
  });

  it("keeps span class=merge-tag (editor chip serialization)", () => {
    const out = sanitizeContractHtml(
      '<p><span class="merge-tag">{{player.name}}</span></p>',
    );
    expect(out).toContain('class="merge-tag"');
  });

  it("keeps a safe inline text-direction style on paragraphs", () => {
    const out = sanitizeContractHtml(
      '<p style="direction:ltr;text-align:left">Ahmed</p>',
    );
    expect(out).toContain("Ahmed");
    expect(out).toContain("direction");
  });

  it("strips anchor tags and strips unsafe img src schemes (no url vectors)", () => {
    const out = sanitizeContractHtml(
      '<p>x</p><a href="javascript:alert(1)">link</a><img src="x" onerror="evil()">',
    );
    expect(out).not.toContain("<a");
    // img tag is allowed but src must be a data: URI; http/relative src is stripped
    expect(out).not.toContain('src="x"');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("onerror");
  });

  it("allows img with base64 data URI src (editor-embedded images)", () => {
    const out = sanitizeContractHtml(
      '<img src="data:image/png;base64,abc123" alt="logo" width="100">',
    );
    expect(out).toContain("<img");
    expect(out).toContain('src="data:image/png;base64,abc123"');
  });

  it("drops unsafe inline style values (css injection)", () => {
    const out = sanitizeContractHtml(
      '<p style="position:fixed;direction:expression(alert(1))">x</p>',
    );
    expect(out).not.toContain("position");
    expect(out).not.toContain("expression");
    expect(out).toContain("x");
  });

  it("returns empty string for non-string input", () => {
    // @ts-expect-error — exercising the runtime guard for callers passing through unknown
    expect(sanitizeContractHtml(undefined)).toBe("");
    // @ts-expect-error — exercising the runtime guard
    expect(sanitizeContractHtml(null)).toBe("");
  });
});
