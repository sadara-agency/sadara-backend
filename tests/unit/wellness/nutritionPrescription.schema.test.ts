import {
  triggeringReasonEnum,
  issuePrescriptionSchema,
  updatePrescriptionSchema,
  reissuePrescriptionSchema,
  listPrescriptionsQuerySchema,
} from "../../../src/modules/wellness/nutritionPrescription.validation";

const PLAYER_UUID = "550e8400-e29b-41d4-a716-446655440001";
const SCAN_UUID = "550e8400-e29b-41d4-a716-446655440002";
const BLOCK_UUID = "550e8400-e29b-41d4-a716-446655440003";

describe("NutritionPrescription Schemas", () => {
  // ── triggeringReasonEnum ──

  describe("triggeringReasonEnum", () => {
    it("accepts all valid triggering reasons", () => {
      const reasons = ["manual", "scan", "injury", "block_change"] as const;
      for (const reason of reasons) {
        expect(triggeringReasonEnum.safeParse(reason).success).toBe(true);
      }
    });

    it("rejects an invalid triggering reason", () => {
      expect(triggeringReasonEnum.safeParse("automatic").success).toBe(false);
    });

    it("rejects empty string", () => {
      expect(triggeringReasonEnum.safeParse("").success).toBe(false);
    });
  });

  // ── issuePrescriptionSchema ──

  describe("issuePrescriptionSchema", () => {
    it("accepts a minimal payload with only playerId", () => {
      expect(
        issuePrescriptionSchema.safeParse({ playerId: PLAYER_UUID }).success,
      ).toBe(true);
    });

    it("accepts a full payload with all fields", () => {
      expect(
        issuePrescriptionSchema.safeParse({
          playerId: PLAYER_UUID,
          trainingBlockId: BLOCK_UUID,
          targetCalories: 2200,
          targetProteinG: 180,
          targetCarbsG: 250,
          targetFatG: 70,
          hydrationTargetMl: 3000,
          preTrainingGuidance: "Eat a banana 30 min before training",
          postTrainingGuidance: "Protein shake within 30 min",
          notes: "Avoid fast food on match days",
        }).success,
      ).toBe(true);
    });

    it("rejects missing playerId", () => {
      expect(
        issuePrescriptionSchema.safeParse({ targetCalories: 2200 }).success,
      ).toBe(false);
    });

    it("rejects non-UUID playerId", () => {
      expect(
        issuePrescriptionSchema.safeParse({ playerId: "not-a-uuid" }).success,
      ).toBe(false);
    });

    it("rejects non-positive targetCalories", () => {
      expect(
        issuePrescriptionSchema.safeParse({
          playerId: PLAYER_UUID,
          targetCalories: 0,
        }).success,
      ).toBe(false);
    });

    it("rejects negative targetProteinG", () => {
      expect(
        issuePrescriptionSchema.safeParse({
          playerId: PLAYER_UUID,
          targetProteinG: -10,
        }).success,
      ).toBe(false);
    });

    it("rejects preTrainingGuidance exceeding 2000 chars", () => {
      expect(
        issuePrescriptionSchema.safeParse({
          playerId: PLAYER_UUID,
          preTrainingGuidance: "x".repeat(2001),
        }).success,
      ).toBe(false);
    });

    it("rejects non-UUID trainingBlockId", () => {
      expect(
        issuePrescriptionSchema.safeParse({
          playerId: PLAYER_UUID,
          trainingBlockId: "bad-id",
        }).success,
      ).toBe(false);
    });
  });

  // ── updatePrescriptionSchema ──

  describe("updatePrescriptionSchema", () => {
    it("accepts an empty patch", () => {
      expect(updatePrescriptionSchema.safeParse({}).success).toBe(true);
    });

    it("accepts a partial update with some fields", () => {
      expect(
        updatePrescriptionSchema.safeParse({
          targetCalories: 2400,
          notes: "Updated for bulk phase",
        }).success,
      ).toBe(true);
    });

    it("does not accept playerId (omitted from schema — stripped silently)", () => {
      const result = updatePrescriptionSchema.safeParse({
        playerId: PLAYER_UUID,
        targetCalories: 2000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // playerId is not in updatePrescriptionSchema, Zod strips it
        expect((result.data as Record<string, unknown>).playerId).toBeUndefined();
      }
    });

    it("rejects non-positive targetFatG", () => {
      expect(
        updatePrescriptionSchema.safeParse({ targetFatG: -5 }).success,
      ).toBe(false);
    });
  });

  // ── reissuePrescriptionSchema ──

  describe("reissuePrescriptionSchema", () => {
    it("accepts empty body (triggeringReason defaults to manual)", () => {
      const result = reissuePrescriptionSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.triggeringReason).toBe("manual");
      }
    });

    it("accepts valid triggeringReason and triggeringScanId", () => {
      expect(
        reissuePrescriptionSchema.safeParse({
          triggeringReason: "scan",
          triggeringScanId: SCAN_UUID,
        }).success,
      ).toBe(true);
    });

    it("rejects invalid triggeringReason", () => {
      expect(
        reissuePrescriptionSchema.safeParse({ triggeringReason: "unknown" })
          .success,
      ).toBe(false);
    });

    it("rejects non-UUID triggeringScanId", () => {
      expect(
        reissuePrescriptionSchema.safeParse({
          triggeringReason: "scan",
          triggeringScanId: "bad-id",
        }).success,
      ).toBe(false);
    });

    it("accepts injury and block_change as valid reasons", () => {
      for (const reason of ["injury", "block_change"] as const) {
        expect(
          reissuePrescriptionSchema.safeParse({ triggeringReason: reason })
            .success,
        ).toBe(true);
      }
    });
  });

  // ── listPrescriptionsQuerySchema ──

  describe("listPrescriptionsQuerySchema", () => {
    it("applies defaults for page, limit, and currentOnly", () => {
      const data = listPrescriptionsQuerySchema.parse({});
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
      expect(data.currentOnly).toBe(false);
    });

    it("coerces string numbers for page and limit", () => {
      const data = listPrescriptionsQuerySchema.parse({
        page: "3",
        limit: "50",
      });
      expect(data.page).toBe(3);
      expect(data.limit).toBe(50);
    });

    it("coerces string boolean for currentOnly", () => {
      const data = listPrescriptionsQuerySchema.parse({ currentOnly: "true" });
      expect(data.currentOnly).toBe(true);
    });

    it("accepts an optional valid playerId UUID", () => {
      expect(
        listPrescriptionsQuerySchema.safeParse({ playerId: PLAYER_UUID })
          .success,
      ).toBe(true);
    });

    it("rejects limit > 100", () => {
      expect(
        listPrescriptionsQuerySchema.safeParse({ limit: "101" }).success,
      ).toBe(false);
    });

    it("rejects invalid playerId", () => {
      expect(
        listPrescriptionsQuerySchema.safeParse({ playerId: "not-a-uuid" })
          .success,
      ).toBe(false);
    });
  });
});
