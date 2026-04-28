import {
  computeWeightedOverall,
  freeformToTemplate,
  type RatingsLike,
} from "./positionTemplate";

describe("computeWeightedOverall", () => {
  it("returns null when no ratings provided", () => {
    expect(computeWeightedOverall({}, "Striker")).toBeNull();
    expect(computeWeightedOverall({}, null)).toBeNull();
  });

  it("falls back to flat mean when template is null", () => {
    const ratings: RatingsLike = { pace: 10, defending: 4, shooting: 7 };
    // Flat mean: (10 + 4 + 7) / 3 = 7.00
    expect(computeWeightedOverall(ratings, null)).toBeCloseTo(7.0, 2);
  });

  it("striker template weights shooting heavily and defending near zero", () => {
    // A striker rated 10 on shooting and 1 on defending should score high.
    const high: RatingsLike = { shooting: 10, defending: 1 };
    const score = computeWeightedOverall(high, "Striker") ?? 0;
    // Striker shooting weight=14, defending weight=0 → score = 10 (only shooting counts)
    expect(score).toBeCloseTo(10, 2);
  });

  it("center-back template weights defending heavily", () => {
    // A CB rated 10 on defending and 1 on shooting should score near 10.
    const ratings: RatingsLike = { defending: 10, shooting: 1 };
    const score = computeWeightedOverall(ratings, "CenterBack") ?? 0;
    // CB defending=14, shooting=0 → only defending counts
    expect(score).toBeCloseTo(10, 2);
  });

  it("partial reports renormalize over provided traits", () => {
    // Only two traits provided — score is the weighted mean of just those two.
    const ratings: RatingsLike = { pace: 8, stamina: 6 };
    const score = computeWeightedOverall(ratings, "Striker") ?? 0;
    // Striker pace=9, stamina=5 → (9*8 + 5*6) / (9+5) = 102/14 ≈ 7.29
    expect(score).toBeCloseTo(7.29, 1);
  });

  it("goalkeeper template ignores field-player traits with zero weight", () => {
    // A GK rated highly on positioning + composure + decisionMaking, low on pace/shooting.
    const ratings: RatingsLike = {
      positioning: 10,
      composure: 10,
      decisionMaking: 10,
      pace: 1,
      shooting: 1,
    };
    const score = computeWeightedOverall(ratings, "Goalkeeper") ?? 0;
    // GK pace=0, shooting=0 → those drop out. positioning=14, composure=14, decisionMaking=11.
    // (14*10 + 14*10 + 11*10) / (14+14+11) = 390/39 = 10.00
    expect(score).toBeCloseTo(10, 2);
  });

  it("falls back to flat mean when no provided traits carry weight", () => {
    // Only pace + shooting on a Goalkeeper — both have weight 0. Flat mean fallback.
    const ratings: RatingsLike = { pace: 4, shooting: 6 };
    const score = computeWeightedOverall(ratings, "Goalkeeper") ?? 0;
    expect(score).toBeCloseTo(5, 2);
  });

  it("ignores non-finite values", () => {
    const ratings: RatingsLike = {
      pace: NaN,
      shooting: 8,
      // @ts-expect-error testing runtime safety
      passing: "bad",
    };
    const score = computeWeightedOverall(ratings, "Striker");
    // Only shooting counts → score is 8
    expect(score).toBeCloseTo(8, 2);
  });
});

describe("freeformToTemplate", () => {
  const cases: Array<[string | null, string | null]> = [
    [null, null],
    ["", null],
    ["   ", null],
    ["GK", "Goalkeeper"],
    ["Goalkeeper", "Goalkeeper"],
    ["goal keeper", "Goalkeeper"],
    ["حارس مرمى", "Goalkeeper"],
    ["CB", "CenterBack"],
    ["Centre Back", "CenterBack"],
    ["Central Defender", "CenterBack"],
    ["مدافع", "CenterBack"],
    ["LB", "FullBack"],
    ["Right Back", "FullBack"],
    ["full-back", "FullBack"],
    ["ظهير أيمن", "FullBack"],
    ["wing-back", "Wingback"],
    ["LWB", "Wingback"],
    ["DM", "DefMid"],
    ["defensive midfielder", "DefMid"],
    ["holding mid", "DefMid"],
    ["CAM", "AttMid"],
    ["No.10", "AttMid"],
    ["playmaker", "AttMid"],
    ["LW", "Winger"],
    ["winger", "Winger"],
    ["wide forward", "Winger"],
    ["جناح", "Winger"],
    ["ST", "Striker"],
    ["Striker", "Striker"],
    ["centre forward", "Striker"],
    ["forward", "Striker"],
    ["مهاجم", "Striker"],
    ["CM", "CenMid"],
    ["box-to-box", "CenMid"],
    ["midfielder", "CenMid"],
    ["something weird", null],
  ];

  it.each(cases)("freeformToTemplate(%j) === %j", (input, expected) => {
    expect(freeformToTemplate(input)).toBe(expected);
  });
});
