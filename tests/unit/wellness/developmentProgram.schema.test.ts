/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/wellness/developmentProgram.schema.test.ts
// Zod validation tests for developmentProgram schemas
// ─────────────────────────────────────────────────────────────

import {
  createProgramSchema,
  updateProgramSchema,
  addExerciseToProgramSchema,
  reorderExercisesSchema,
  listProgramsQuerySchema,
} from "../../../src/modules/wellness/developmentProgram.validation";

describe("DevelopmentProgram Schemas", () => {
  // ════════════════════════════════════════════════════════
  // createProgramSchema
  // ════════════════════════════════════════════════════════
  describe("createProgramSchema", () => {
    it("accepts a minimal valid program", () => {
      const result = createProgramSchema.safeParse({
        name: "Gym Program",
        category: "strength",
        programType: "gym",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.durationWeeks).toBe(4); // default
        expect(result.data.programType).toBe("gym");
        expect(result.data.isActive).toBe(true); // default
      }
    });

    it("accepts a full program payload", () => {
      const result = createProgramSchema.safeParse({
        name: "Field Program",
        nameAr: "برنامج ميداني",
        description: "6-week field conditioning",
        category: "cardio",
        estimatedMinutes: 60,
        durationWeeks: 6,
        phase: "accumulation",
        programType: "field",
        trainingBlockId: "550e8400-e29b-41d4-a716-446655440001",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid programType", () => {
      const result = createProgramSchema.safeParse({
        name: "Bad Program",
        category: "strength",
        programType: "swimming", // not in enum
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid phase", () => {
      const result = createProgramSchema.safeParse({
        name: "Bad Program",
        category: "strength",
        programType: "gym",
        phase: "peak", // not in enum
      });
      expect(result.success).toBe(false);
    });

    it("rejects durationWeeks outside 1-16 range", () => {
      const tooLow = createProgramSchema.safeParse({
        name: "P",
        category: "strength",
        programType: "gym",
        durationWeeks: 0,
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = createProgramSchema.safeParse({
        name: "P",
        category: "strength",
        programType: "gym",
        durationWeeks: 17,
      });
      expect(tooHigh.success).toBe(false);
    });

    it("rejects missing name", () => {
      const result = createProgramSchema.safeParse({
        category: "strength",
        programType: "gym",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing category", () => {
      const result = createProgramSchema.safeParse({
        name: "P",
        programType: "gym",
      });
      expect(result.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // updateProgramSchema
  // ════════════════════════════════════════════════════════
  describe("updateProgramSchema", () => {
    it("accepts an empty body (all optional)", () => {
      const result = updateProgramSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial update with only phase", () => {
      const result = updateProgramSchema.safeParse({ phase: "intensification" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid programType in update", () => {
      const result = updateProgramSchema.safeParse({ programType: "yoga" });
      expect(result.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // addExerciseToProgramSchema
  // ════════════════════════════════════════════════════════
  describe("addExerciseToProgramSchema", () => {
    it("requires exerciseId as UUID", () => {
      const missing = addExerciseToProgramSchema.safeParse({});
      expect(missing.success).toBe(false);

      const invalid = addExerciseToProgramSchema.safeParse({ exerciseId: "not-a-uuid" });
      expect(invalid.success).toBe(false);

      const valid = addExerciseToProgramSchema.safeParse({
        exerciseId: "550e8400-e29b-41d4-a716-446655440002",
      });
      expect(valid.success).toBe(true);
    });

    it("accepts full exercise payload", () => {
      const result = addExerciseToProgramSchema.safeParse({
        exerciseId: "550e8400-e29b-41d4-a716-446655440002",
        orderIndex: 2,
        targetSets: 4,
        targetReps: "6-8",
        targetWeightKg: 80,
        restSeconds: 120,
        notes: "Focus on form",
      });
      expect(result.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // reorderExercisesSchema
  // ════════════════════════════════════════════════════════
  describe("reorderExercisesSchema", () => {
    it("requires a non-empty array of UUIDs", () => {
      const empty = reorderExercisesSchema.safeParse({ orderedExerciseIds: [] });
      expect(empty.success).toBe(false);

      const valid = reorderExercisesSchema.safeParse({
        orderedExerciseIds: ["550e8400-e29b-41d4-a716-446655440002"],
      });
      expect(valid.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // listProgramsQuerySchema
  // ════════════════════════════════════════════════════════
  describe("listProgramsQuerySchema", () => {
    it("applies defaults for page and limit", () => {
      const result = listProgramsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("accepts valid programType filter", () => {
      const result = listProgramsQuerySchema.safeParse({ programType: "rehab" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid programType filter", () => {
      const result = listProgramsQuerySchema.safeParse({ programType: "yoga" });
      expect(result.success).toBe(false);
    });

    it("coerces isActive string to boolean", () => {
      const result = listProgramsQuerySchema.safeParse({ isActive: "true" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.isActive).toBe(true);
    });
  });
});
