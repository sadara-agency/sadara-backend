import { selectBodyHtml } from "./contractDocument.service";

describe("selectBodyHtml — body source priority", () => {
  it("prefers the frozen snapshot when present", () => {
    const html = selectBodyHtml({
      bodyHtmlSnapshot: "<p>frozen</p>",
      bodyHtml: "<p>editable</p>",
    });
    expect(html).toBe("<p>frozen</p>");
  });

  it("falls back to the editable body when no snapshot", () => {
    const html = selectBodyHtml({
      bodyHtmlSnapshot: null,
      bodyHtml: "<p>editable</p>",
    });
    expect(html).toBe("<p>editable</p>");
  });

  it("returns null when neither body exists (caller uses legacy generator)", () => {
    const html = selectBodyHtml({ bodyHtmlSnapshot: null, bodyHtml: null });
    expect(html).toBeNull();
  });
});
