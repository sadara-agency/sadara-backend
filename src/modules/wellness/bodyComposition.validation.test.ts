import {
  createScanSchema,
  updateScanSchema,
} from "./bodyComposition.validation";

const VALID = {
  playerId: "11111111-1111-1111-1111-111111111111",
  scanDate: "2023-10-04",
  weightKg: 73.1,
  bodyFatPct: 16.3,
  leanBodyMassKg: 61.2,
  skeletalMuscleMassKg: 35.0,
  totalBodyWaterKg: 44.9,
  proteinKg: 12.3,
  mineralKg: 4.04,
  visceralFatLevel: 4,
  waistHipRatio: 0.88,
  measuredBmrKcal: 1620,
  metabolicAge: 27,
};

describe("createScanSchema — per-field hard caps", () => {
  it("accepts a realistic InBody270 scan", () => {
    expect(createScanSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects absurd minerals (9500 kg)", () => {
    const r = createScanSchema.safeParse({ ...VALID, mineralKg: 9500 });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range visceral fat (> 25) and waist-hip ratio (> 1.5)", () => {
    expect(
      createScanSchema.safeParse({ ...VALID, visceralFatLevel: 40 }).success,
    ).toBe(false);
    expect(
      createScanSchema.safeParse({ ...VALID, waistHipRatio: 2.0 }).success,
    ).toBe(false);
  });

  it("rejects weight below the floor", () => {
    expect(createScanSchema.safeParse({ ...VALID, weightKg: 10 }).success).toBe(
      false,
    );
  });
});

describe("createScanSchema — part cannot exceed body weight", () => {
  it("rejects lean mass greater than weight (the '88 lean / 50 weight' bug)", () => {
    const r = createScanSchema.safeParse({
      ...VALID,
      weightKg: 50,
      leanBodyMassKg: 100, // also above its own cap, but the point is part>whole
    });
    expect(r.success).toBe(false);
  });

  it("rejects body water greater than weight", () => {
    const r = createScanSchema.safeParse({
      ...VALID,
      weightKg: 40,
      totalBodyWaterKg: 90,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "totalBodyWaterKg")).toBe(
        true,
      );
    }
  });
});

describe("updateScanSchema — partial + refine tolerance", () => {
  it("accepts a partial update without weight", () => {
    expect(updateScanSchema.safeParse({ bodyFatPct: 18 }).success).toBe(true);
  });

  it("still rejects an out-of-cap value in a partial update", () => {
    expect(updateScanSchema.safeParse({ mineralKg: 9500 }).success).toBe(false);
  });

  it("rejects part>weight when both are present in the update", () => {
    expect(
      updateScanSchema.safeParse({ weightKg: 60, leanBodyMassKg: 120 }).success,
    ).toBe(false);
  });
});
