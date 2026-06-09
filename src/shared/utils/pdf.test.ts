import { getArabicFontFaceCss } from "./pdf";

describe("getArabicFontFaceCss", () => {
  it("returns @font-face rules embedding the Arabic font as base64", () => {
    const css = getArabicFontFaceCss();
    expect(css).toContain("@font-face");
    expect(css).toContain("IBM Plex Sans Arabic");
    expect(css).toContain("data:font/ttf;base64,");
    expect(css).toContain("font-weight: 400");
    expect(css).toContain("font-weight: 700");
  });

  it("caches the result so fonts are read from disk only once", () => {
    const a = getArabicFontFaceCss();
    const b = getArabicFontFaceCss();
    expect(a).toBe(b);
  });
});
