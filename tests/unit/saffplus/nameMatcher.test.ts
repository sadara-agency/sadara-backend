/// <reference types="jest" />

// Tests for the SAFF+ Phase 2 pure-function helpers used by the
// player matcher: Arabic name normalization and age-category
// normalization. The fuzzy-match SQL query lives in saffplus.service.ts
// and is exercised by integration tests against the dev DB
// (skipped here because Postgres isn't available in the unit harness).

import {
  normalizeArabicName,
  normalizeAgeCategory,
} from "../../../src/modules/saffplus/saffplus.provider";

describe("normalizeArabicName", () => {
  it("collapses alef variants (أ إ آ) to bare alef (ا)", () => {
    expect(normalizeArabicName("أحمد")).toBe("احمد");
    expect(normalizeArabicName("إبراهيم")).toBe("ابراهيم");
    expect(normalizeArabicName("آمنة")).toBe("امنه");
  });

  it("normalizes alef maksura (ى) to ya (ي)", () => {
    expect(normalizeArabicName("مصطفى")).toBe("مصطفي");
  });

  it("normalizes tah marbuta (ة) to ha (ه)", () => {
    expect(normalizeArabicName("فاطمة")).toBe("فاطمه");
  });

  it("strips tashkeel diacritics", () => {
    // مَحْمُود with diacritics → محمود without
    expect(normalizeArabicName("مَحْمُود")).toBe("محمود");
  });

  it("strips kashida (tatweel)", () => {
    expect(normalizeArabicName("محـمـد")).toBe("محمد");
  });

  it("collapses internal whitespace and trims", () => {
    expect(normalizeArabicName("  محمد   صالح  ")).toBe("محمد صالح");
  });

  it("makes two spelling variants of the same name match exactly", () => {
    // "أحمد عبدالعزيز" with diacritics vs canonical form
    const variant1 = "أَحْمَد عَبْدُالْعَزِيز";
    const variant2 = "احمد عبدالعزيز";
    expect(normalizeArabicName(variant1)).toBe(normalizeArabicName(variant2));
  });

  it("is idempotent", () => {
    const once = normalizeArabicName("أحمد");
    expect(normalizeArabicName(once)).toBe(once);
  });

  it("returns empty string for empty/null input", () => {
    expect(normalizeArabicName("")).toBe("");
    // typed as string but defensive against null at runtime
    expect(normalizeArabicName(null as unknown as string)).toBe("");
  });

  it("leaves Latin text intact", () => {
    expect(normalizeArabicName("Ahmed Saleh")).toBe("Ahmed Saleh");
  });
});

describe("normalizeAgeCategory", () => {
  // ── English variants ──

  it("recognizes u17 / U-17 / U17 / u-17", () => {
    for (const v of ["u17", "U-17", "U17", "u-17", "U 17"]) {
      expect(normalizeAgeCategory(v)).toBe("u17");
    }
  });

  it("recognizes 'Under 18' / 'under-18'", () => {
    expect(normalizeAgeCategory("Under 18")).toBe("u18");
    expect(normalizeAgeCategory("under-18")).toBe("u18");
    expect(normalizeAgeCategory("UNDER15")).toBe("u15");
  });

  it("recognizes Senior / First Team", () => {
    expect(normalizeAgeCategory("Senior")).toBe("senior");
    expect(normalizeAgeCategory("senior team")).toBe("senior");
    expect(normalizeAgeCategory("First Team")).toBe("senior");
  });

  // ── Arabic variants ──

  it("recognizes Arabic 'تحت N' age categories", () => {
    expect(normalizeAgeCategory("تحت 18")).toBe("u18");
    expect(normalizeAgeCategory("تحت17")).toBe("u17");
    expect(normalizeAgeCategory("تحت 21")).toBe("u21");
  });

  it("recognizes Arabic age-tier nicknames", () => {
    expect(normalizeAgeCategory("ناشئين")).toBe("u17");
    expect(normalizeAgeCategory("أشبال")).toBe("u15");
    expect(normalizeAgeCategory("اشبال")).toBe("u15");
    expect(normalizeAgeCategory("براعم")).toBe("u13");
  });

  it("recognizes Arabic 'first team' (الفريق الأول)", () => {
    expect(normalizeAgeCategory("الفريق الأول")).toBe("senior");
    expect(normalizeAgeCategory("الفريق الاول")).toBe("senior");
  });

  // ── Defaults / edge cases ──

  it("defaults to 'senior' for null/empty/unknown input", () => {
    expect(normalizeAgeCategory(null)).toBe("senior");
    expect(normalizeAgeCategory(undefined)).toBe("senior");
    expect(normalizeAgeCategory("")).toBe("senior");
    expect(normalizeAgeCategory("???")).toBe("senior");
  });
});
