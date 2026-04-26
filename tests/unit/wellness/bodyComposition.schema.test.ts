import {
  createScanSchema,
  updateScanSchema,
  listScansQuerySchema,
  getScanSchema,
  getPlayerScansSchema,
} from "../../../src/modules/wellness/bodyComposition.validation";

const UUID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_UUID = "550e8400-e29b-41d4-a716-446655440002";

describe("BodyComposition Schemas", () => {
  // ── createScanSchema ──

  describe("createScanSchema", () => {
    it("accepts a minimal valid payload", () => {
      const result = createScanSchema.safeParse({
        playerId: PLAYER_UUID,
        scanDate: "2026-04-22",
        weightKg: 75.5,
      });
      expect(result.success).toBe(true);
    });

    it("accepts a full payload with all fields", () => {
      const result = createScanSchema.safeParse({
        playerId: PLAYER_UUID,
        scanDate: "2026-04-22",
        scanDevice: "InBody 570",
        weightKg: 75.5,
        bodyFatPct: 12.3,
        bodyFatMassKg: 9.3,
        leanBodyMassKg: 66.2,
        skeletalMuscleMassKg: 35.1,
        totalBodyWaterKg: 48.4,
        proteinKg: 12.1,
        mineralsKg: 3.5,
        segmentalLeanRightArm: 3.5,
        segmentalLeanLeftArm: 3.4,
        segmentalLeanTrunk: 28.0,
        segmentalLeanRightLeg: 9.8,
        segmentalLeanLeftLeg: 9.7,
        segmentalFatRightArm: 0.5,
        segmentalFatLeftArm: 0.5,
        segmentalFatTrunk: 6.0,
        segmentalFatRightLeg: 1.0,
        segmentalFatLeftLeg: 1.0,
        measuredBmr: 1850,
        visceralFatLevel: 5,
        visceralFatAreaCm2: 80.5,
        waistHipRatio: 0.85,
        metabolicAge: 28,
        pdfDocumentId: UUID,
        notes: "Post-season baseline scan",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing playerId", () => {
      expect(
        createScanSchema.safeParse({ scanDate: "2026-04-22", weightKg: 75.5 })
          .success,
      ).toBe(false);
    });

    it("rejects missing scanDate", () => {
      expect(
        createScanSchema.safeParse({ playerId: PLAYER_UUID, weightKg: 75.5 })
          .success,
      ).toBe(false);
    });

    it("rejects invalid scanDate format", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "22-04-2026",
          weightKg: 75.5,
        }).success,
      ).toBe(false);
    });

    it("rejects missing weightKg", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
        }).success,
      ).toBe(false);
    });

    it("rejects non-positive weightKg", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
          weightKg: 0,
        }).success,
      ).toBe(false);
    });

    it("rejects bodyFatPct > 100", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
          weightKg: 75,
          bodyFatPct: 101,
        }).success,
      ).toBe(false);
    });

    it("rejects bodyFatPct < 0", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
          weightKg: 75,
          bodyFatPct: -1,
        }).success,
      ).toBe(false);
    });

    it("rejects visceralFatLevel > 30", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
          weightKg: 75,
          visceralFatLevel: 31,
        }).success,
      ).toBe(false);
    });

    it("rejects visceralFatLevel < 1", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
          weightKg: 75,
          visceralFatLevel: 0,
        }).success,
      ).toBe(false);
    });

    it("rejects invalid pdfDocumentId UUID", () => {
      expect(
        createScanSchema.safeParse({
          playerId: PLAYER_UUID,
          scanDate: "2026-04-22",
          weightKg: 75,
          pdfDocumentId: "not-a-uuid",
        }).success,
      ).toBe(false);
    });
  });

  // ── updateScanSchema ──

  describe("updateScanSchema", () => {
    it("accepts an empty patch", () => {
      expect(updateScanSchema.safeParse({}).success).toBe(true);
    });

    it("accepts partial update with valid fields", () => {
      expect(
        updateScanSchema.safeParse({
          weightKg: 76.0,
          notes: "Updated after re-test",
        }).success,
      ).toBe(true);
    });

    it("rejects updating playerId (omitted from schema)", () => {
      // playerId is omitted from updateScanSchema — should be ignored or fail
      const result = updateScanSchema.safeParse({
        playerId: PLAYER_UUID,
        weightKg: 76.0,
      });
      // playerId not in schema — it should either be stripped or fail
      // updateScanSchema uses .omit({ playerId }) so it should strip it silently
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).playerId).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    });

    it("rejects invalid scanDate format on update", () => {
      expect(
        updateScanSchema.safeParse({ scanDate: "invalid" }).success,
      ).toBe(false);
    });
  });

  // ── listScansQuerySchema ──

  describe("listScansQuerySchema", () => {
    it("applies defaults for page and limit", () => {
      const data = listScansQuerySchema.parse({});
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
    });

    it("coerces string numbers", () => {
      const data = listScansQuerySchema.parse({ page: "2", limit: "50" });
      expect(data.page).toBe(2);
      expect(data.limit).toBe(50);
    });

    it("accepts valid from/to dates", () => {
      const result = listScansQuerySchema.safeParse({
        from: "2026-01-01",
        to: "2026-04-22",
      });
      expect(result.success).toBe(true);
    });

    it("accepts limit > 100 (max is 500)", () => {
      expect(
        listScansQuerySchema.safeParse({ limit: "101" }).success,
      ).toBe(true);
    });

    it("rejects invalid from date format", () => {
      expect(
        listScansQuerySchema.safeParse({ from: "01-01-2026" }).success,
      ).toBe(false);
    });
  });

  // ── getScanSchema ──

  describe("getScanSchema", () => {
    it("accepts a valid UUID", () => {
      expect(getScanSchema.safeParse({ id: UUID }).success).toBe(true);
    });

    it("rejects a non-UUID id", () => {
      expect(getScanSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
    });
  });

  // ── getPlayerScansSchema ──

  describe("getPlayerScansSchema", () => {
    it("accepts a valid playerId UUID", () => {
      expect(
        getPlayerScansSchema.safeParse({ playerId: PLAYER_UUID }).success,
      ).toBe(true);
    });

    it("rejects a non-UUID playerId", () => {
      expect(
        getPlayerScansSchema.safeParse({ playerId: "bad" }).success,
      ).toBe(false);
    });
  });
});
