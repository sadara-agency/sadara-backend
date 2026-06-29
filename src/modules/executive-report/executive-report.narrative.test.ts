import {
  decideRecommendation,
  buildNarrative,
} from "@modules/executive-report/executive-report.narrative";
import type { ExecutiveReportData } from "@modules/executive-report/executive-report.types";

/** Minimal valid data object; override per test. */
function makeData(
  overrides: Partial<{
    monthsRemaining: number | null;
    endDate: string | null;
    activeCount: number;
    interestedClubsEn: string[];
    interestedClubsAr: string[];
    valuationDirection: "up" | "down" | "stable" | null;
    valuationChangePct: number | null;
    ratingDeclining: boolean;
    injuredFlag: boolean;
    matchesPlayed: number | null;
    rating: number | null;
    biggestImprovement: { metric: string; deltaPct: number } | null;
  }> = {},
): ExecutiveReportData {
  return {
    player: {
      id: "p1",
      nameEn: "Hossam Ali",
      nameAr: "حسام علي",
      age: 21,
      position: "CM",
      clubNameEn: "Al Nassr U21",
      clubNameAr: "النصر تحت 21",
      marketValue: 1_000_000,
      marketValueCurrency: "SAR",
      injuredFlag: overrides.injuredFlag ?? false,
    },
    season: {
      label: "2024-2025",
      matchesPlayed:
        overrides.matchesPlayed === undefined ? 18 : overrides.matchesPlayed,
      goals: 4,
      assists: 6,
      minutesPlayed: 1500,
      rating: overrides.rating === undefined ? 7.4 : overrides.rating,
      ratingTrendPct: null,
      ratingDeclining: overrides.ratingDeclining ?? false,
      biggestImprovement:
        overrides.biggestImprovement === undefined
          ? { metric: "keyPasses", deltaPct: 38 }
          : overrides.biggestImprovement,
    },
    contract: {
      endDate:
        overrides.endDate === undefined ? "2027-06-30" : overrides.endDate,
      monthsRemaining:
        overrides.monthsRemaining === undefined
          ? 12
          : overrides.monthsRemaining,
      salaryCurrency: "SAR",
    },
    offers: {
      activeCount: overrides.activeCount ?? 0,
      interestedClubsEn: overrides.interestedClubsEn ?? [],
      interestedClubsAr: overrides.interestedClubsAr ?? [],
    },
    valuation: {
      changePct:
        overrides.valuationChangePct === undefined
          ? 22
          : overrides.valuationChangePct,
      direction:
        overrides.valuationDirection === undefined
          ? "up"
          : overrides.valuationDirection,
    },
  };
}

describe("decideRecommendation — decision matrix", () => {
  it("RENEW_URGENT_WITH_OFFERS when contract <12mo and active offers", () => {
    const data = makeData({ monthsRemaining: 11, activeCount: 1 });
    expect(decideRecommendation(data)).toBe("RENEW_URGENT_WITH_OFFERS");
  });

  it("RENEW_EARLY_SECURE when contract <12mo and no offers", () => {
    const data = makeData({ monthsRemaining: 8, activeCount: 0 });
    expect(decideRecommendation(data)).toBe("RENEW_EARLY_SECURE");
  });

  it("HOLD_AND_MONITOR when contract >=24mo, value rising, offers present", () => {
    const data = makeData({
      monthsRemaining: 30,
      valuationDirection: "up",
      activeCount: 2,
    });
    expect(decideRecommendation(data)).toBe("HOLD_AND_MONITOR");
  });

  it("REVIEW_PERFORMANCE_FIRST when rating declining within renewal window", () => {
    const data = makeData({ monthsRemaining: 18, ratingDeclining: true });
    expect(decideRecommendation(data)).toBe("REVIEW_PERFORMANCE_FIRST");
  });

  it("REVIEW_PERFORMANCE_FIRST when player injured within renewal window", () => {
    const data = makeData({ monthsRemaining: 20, injuredFlag: true });
    expect(decideRecommendation(data)).toBe("REVIEW_PERFORMANCE_FIRST");
  });

  it("performance risk does NOT override when contract is comfortably long", () => {
    // months > COMFORTABLE_MONTHS (24) → risk gate is not triggered
    const data = makeData({
      monthsRemaining: 36,
      ratingDeclining: true,
      valuationDirection: "stable",
      activeCount: 0,
    });
    expect(decideRecommendation(data)).toBe("MONITOR");
  });

  it("MONITOR as the default when nothing else matches", () => {
    const data = makeData({
      monthsRemaining: 18,
      activeCount: 0,
      valuationDirection: "stable",
    });
    expect(decideRecommendation(data)).toBe("MONITOR");
  });

  it("MONITOR when contract months are unknown (null)", () => {
    const data = makeData({ monthsRemaining: null, endDate: null });
    expect(decideRecommendation(data)).toBe("MONITOR");
  });
});

describe("buildNarrative — bilingual prose + omit-on-missing", () => {
  it("renders three Arabic paragraphs matching the CEO brief shape", () => {
    const data = makeData({ monthsRemaining: 12, activeCount: 1 });
    const n = buildNarrative(data, "ar");
    expect(n.seasonSummary).toContain("حسام علي");
    expect(n.seasonSummary).toContain("18");
    expect(n.seasonSummary).toContain("7.4");
    expect(n.currentSituation).toContain("بقي 12 شهراً");
    expect(n.recommendation).toContain("تجديد");
    expect(n.recommendationKey).toBe("RENEW_URGENT_WITH_OFFERS");
  });

  it("omits the improvement sentence when there is no prior-season baseline", () => {
    const data = makeData({ biggestImprovement: null });
    const n = buildNarrative(data, "ar");
    expect(n.seasonSummary).not.toContain("التحسن الأبرز");
  });

  it("omits the offers sentence when there are no active offers", () => {
    const data = makeData({ activeCount: 0 });
    const n = buildNarrative(data, "en");
    expect(n.currentSituation).not.toContain("active offer");
  });

  it("omits the value sentence when no valuation baseline exists", () => {
    const data = makeData({
      valuationChangePct: null,
      valuationDirection: null,
    });
    const n = buildNarrative(data, "en");
    expect(n.currentSituation).not.toContain("market value");
  });

  it("falls back gracefully when season data is entirely missing", () => {
    const data = makeData({
      matchesPlayed: null,
      rating: null,
      biggestImprovement: null,
    });
    const n = buildNarrative(data, "en");
    expect(n.seasonSummary).toContain("Insufficient performance data");
  });

  it("uses English name and LTR phrasing for en locale", () => {
    const data = makeData({ monthsRemaining: 11, activeCount: 1 });
    const n = buildNarrative(data, "en");
    expect(n.seasonSummary).toContain("Hossam Ali");
    expect(n.currentSituation).toContain("months remaining");
    expect(n.recommendation).toContain("renewal");
  });

  it("attaches a decision window to the recommendation", () => {
    const data = makeData({ monthsRemaining: 11, activeCount: 1 });
    const n = buildNarrative(data, "en");
    expect(n.decisionWindowDays).toBe(60);
    expect(n.recommendation).toContain("60 days");
  });
});
