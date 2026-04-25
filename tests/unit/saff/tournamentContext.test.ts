/// <reference types="jest" />

// Pure tests for the Phase-1 tournament-context resolver. No DB or
// network — just exercising inferTournamentContext + resolveTournamentContext
// against curated and ad-hoc inputs.

import {
  inferTournamentContext,
  resolveTournamentContext,
} from "../../../src/modules/saff/saff.service";

describe("inferTournamentContext (regex fallback)", () => {
  it("flags women's tournaments as unsupported", () => {
    expect(
      inferTournamentContext("Women's Premier League", "الدوري الممتاز للسيدات")
        .isSupported,
    ).toBe(false);
    expect(inferTournamentContext("Saudi Women League").isSupported).toBe(
      false,
    );
  });

  it("flags futsal tournaments as unsupported", () => {
    expect(
      inferTournamentContext(
        "Saudi Futsal League 1st Division",
        "دوري الدرجة الأولى لكرة قدم الصالات",
      ).isSupported,
    ).toBe(false);
  });

  it("flags beach soccer tournaments as unsupported", () => {
    expect(
      inferTournamentContext(
        "Beach Soccer 1st Div. League",
        "دوري الدرجة الأولى لكرة القدم الشاطئية",
      ).isSupported,
    ).toBe(false);
  });

  it("classifies premier-keyword leagues correctly and defaults to null division otherwise", () => {
    // "Premier" appears explicitly → division = premier
    const explicitPremier = inferTournamentContext("Saudi U-17 Premier League");
    expect(explicitPremier.ageCategory).toBe("u17");
    expect(explicitPremier.division).toBe("premier");
    expect(explicitPremier.competitionType).toBe("league");

    // Brand-name league without "Premier" keyword → division stays null
    // (the curated JSON is what flags Roshn Saudi League as premier)
    const brandedLeague = inferTournamentContext(
      "Roshn Saudi League",
      "دوري روشن السعودي",
    );
    expect(brandedLeague.ageCategory).toBe("senior");
    expect(brandedLeague.division).toBeNull();
    expect(brandedLeague.competitionType).toBe("league");
    expect(brandedLeague.isSupported).toBe(true);
  });

  it("extracts age category from U-XX patterns (English)", () => {
    expect(inferTournamentContext("Saudi U-17 Premier League").ageCategory).toBe(
      "u17",
    );
    expect(inferTournamentContext("League U13").ageCategory).toBe("u13");
    expect(inferTournamentContext("Saudi U-21 League Div.1").ageCategory).toBe(
      "u21",
    );
  });

  it("extracts age category from Arabic 'تحت N' patterns", () => {
    expect(
      inferTournamentContext("League", "دوري تحت 14").ageCategory,
    ).toBe("u14");
  });

  it("extracts division from textual hints", () => {
    expect(
      inferTournamentContext("Saudi League 1st Division").division,
    ).toBe("1st-division");
    expect(
      inferTournamentContext("Saudi U-17 League Div.2").division,
    ).toBe("2nd-division");
    expect(
      inferTournamentContext("Saudi League 3rd Division").division,
    ).toBe("3rd-division");
  });

  it("classifies cup competitions and clears division", () => {
    const ctx = inferTournamentContext("King Cup", "كأس الملك");
    expect(ctx.competitionType).toBe("cup");
    expect(ctx.division).toBeNull();
  });

  it("classifies super-cup competitions", () => {
    expect(
      inferTournamentContext("Saudi Super Cup", "كأس السوبر السعودي")
        .competitionType,
    ).toBe("super-cup");
  });

  it("falls back to senior/null/league for ambiguous input", () => {
    const ctx = inferTournamentContext("Some Random Football Event");
    expect(ctx.ageCategory).toBe("senior");
    expect(ctx.competitionType).toBe("league");
    expect(ctx.isSupported).toBe(true);
  });
});

describe("resolveTournamentContext (curated JSON wins)", () => {
  it("returns curated entry for known saffIds", () => {
    // 333 = Roshn Saudi League → senior/premier/league
    const ctx = resolveTournamentContext(333, "doesn't matter", "");
    expect(ctx).toEqual({
      ageCategory: "senior",
      division: "premier",
      competitionType: "league",
      isSupported: true,
    });
  });

  it("returns curated entry for U-17 1st Division (saffId 356)", () => {
    const ctx = resolveTournamentContext(356, "Saudi U-17 League Div.1", "");
    expect(ctx.ageCategory).toBe("u17");
    expect(ctx.division).toBe("1st-division");
    expect(ctx.isSupported).toBe(true);
  });

  it("falls back to inference for unknown saffIds", () => {
    // Unseen id → regex fallback against the title
    const ctx = resolveTournamentContext(99999, "Saudi U-19 Premier League");
    expect(ctx.ageCategory).toBe("u19");
    expect(ctx.division).toBe("premier");
  });

  it("flags an unknown women's saffId as unsupported via fallback", () => {
    const ctx = resolveTournamentContext(
      99998,
      "Women's Saudi Premier League",
      "",
    );
    expect(ctx.isSupported).toBe(false);
  });
});
