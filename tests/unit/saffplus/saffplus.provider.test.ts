/// <reference types="jest" />

// Tests for the women's-league filter helper — the only piece of
// non-trivial pure logic added in SAFF+ Phase 1. Covers all four
// detection signals (gender field, slug fragment, English name
// fragment, Arabic name fragment) plus negative cases for men's and
// youth competitions that should NOT trigger the filter.

import { isWomensCompetition } from "../../../src/modules/saffplus/saffplus.provider";

describe("isWomensCompetition", () => {
  // ── Positive cases ──

  it("flags an explicit female gender field", () => {
    expect(
      isWomensCompetition({ gender: "female", slug: "spl", name: "SPL" }),
    ).toBe(true);
  });

  it("flags 'women' / 'ladies' / 'w' gender values", () => {
    for (const g of ["women", "Women", "WOMEN", "ladies", "w", "girls"]) {
      expect(isWomensCompetition({ gender: g })).toBe(true);
    }
  });

  it("flags slugs containing 'women'", () => {
    expect(
      isWomensCompetition({
        slug: "saudi-womens-premier-league",
        name: "SWPL",
      }),
    ).toBe(true);
  });

  it("flags slugs containing 'wsl'", () => {
    expect(isWomensCompetition({ slug: "wsl-2025-26" })).toBe(true);
  });

  it("flags English names containing 'ladies' or 'girls'", () => {
    expect(isWomensCompetition({ name: "Saudi Ladies Cup" })).toBe(true);
    expect(isWomensCompetition({ name: "U17 Girls League" })).toBe(true);
  });

  it("flags Arabic names with women keywords", () => {
    expect(isWomensCompetition({ nameAr: "دوري السيدات" })).toBe(true);
    expect(isWomensCompetition({ nameAr: "البطولة النسائية" })).toBe(true);
    expect(isWomensCompetition({ nameAr: "كأس الفتيات" })).toBe(true);
  });

  // ── Negative cases (must NOT trigger filter) ──

  it("does not flag the men's senior leagues", () => {
    expect(
      isWomensCompetition({
        gender: "male",
        slug: "saudi-pro-league",
        name: "Saudi Pro League",
        nameAr: "دوري روشن السعودي",
      }),
    ).toBe(false);
  });

  it("does not flag youth men's competitions", () => {
    expect(
      isWomensCompetition({
        slug: "u17-premier-league",
        name: "U17 Premier League",
        nameAr: "دوري الناشئين",
      }),
    ).toBe(false);
  });

  it("does not flag empty/missing input", () => {
    expect(isWomensCompetition({})).toBe(false);
    expect(
      isWomensCompetition({
        gender: "",
        slug: "",
        name: "",
        nameAr: "",
      }),
    ).toBe(false);
  });

  it("treats null fields as absent (not as a match)", () => {
    expect(
      isWomensCompetition({
        gender: null,
        slug: null,
        name: null,
        nameAr: null,
      }),
    ).toBe(false);
  });
});
