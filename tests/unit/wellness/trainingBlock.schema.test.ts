import {
  openBlockSchema,
  updateBlockSchema,
  closeBlockSchema,
  listBlocksQuerySchema,
  getBlockSchema,
  getPlayerBlocksSchema,
} from "../../../src/modules/wellness/trainingBlock.validation";

const UUID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_UUID = "550e8400-e29b-41d4-a716-446655440002";

describe("TrainingBlock Schemas", () => {
  // ── openBlockSchema ──

  describe("openBlockSchema", () => {
    it("accepts a minimal valid payload", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "cut",
          durationWeeks: 8,
        }).success,
      ).toBe(true);
    });

    it("accepts a full payload with optional fields", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "bulk",
          durationWeeks: 12,
          startedAt: "2026-04-22",
          startScanId: UUID,
          targetOutcomes: { pbfDelta: -2.5, smmDelta: 1.0 },
          notes: "Pre-season bulk phase",
        }).success,
      ).toBe(true);
    });

    it("rejects missing playerId", () => {
      expect(
        openBlockSchema.safeParse({ goal: "cut", durationWeeks: 8 }).success,
      ).toBe(false);
    });

    it("rejects invalid goal enum", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "supercut",
          durationWeeks: 8,
        }).success,
      ).toBe(false);
    });

    it("accepts all valid goal values", () => {
      const goals = ["bulk", "cut", "maintenance", "recomp", "rehab"] as const;
      for (const goal of goals) {
        expect(
          openBlockSchema.safeParse({
            playerId: PLAYER_UUID,
            goal,
            durationWeeks: 4,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects durationWeeks = 0", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "cut",
          durationWeeks: 0,
        }).success,
      ).toBe(false);
    });

    it("rejects durationWeeks = 17", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "cut",
          durationWeeks: 17,
        }).success,
      ).toBe(false);
    });

    it("accepts durationWeeks boundary values 1 and 16", () => {
      for (const dw of [1, 16]) {
        expect(
          openBlockSchema.safeParse({
            playerId: PLAYER_UUID,
            goal: "maintenance",
            durationWeeks: dw,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects invalid startedAt format", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "cut",
          durationWeeks: 8,
          startedAt: "22-04-2026",
        }).success,
      ).toBe(false);
    });

    it("rejects invalid startScanId UUID", () => {
      expect(
        openBlockSchema.safeParse({
          playerId: PLAYER_UUID,
          goal: "cut",
          durationWeeks: 8,
          startScanId: "not-a-uuid",
        }).success,
      ).toBe(false);
    });

    it("accepts targetOutcomes as arbitrary JSON object", () => {
      const result = openBlockSchema.safeParse({
        playerId: PLAYER_UUID,
        goal: "recomp",
        durationWeeks: 6,
        targetOutcomes: { pbfDelta: -2, smmDelta: 0.5, weightDelta: 0 },
      });
      expect(result.success).toBe(true);
    });
  });

  // ── updateBlockSchema ──

  describe("updateBlockSchema", () => {
    it("accepts an empty patch", () => {
      expect(updateBlockSchema.safeParse({}).success).toBe(true);
    });

    it("accepts partial update with valid fields", () => {
      expect(
        updateBlockSchema.safeParse({ durationWeeks: 10, notes: "Extended" })
          .success,
      ).toBe(true);
    });

    it("rejects playerId (omitted from schema — stripped, not error)", () => {
      const result = updateBlockSchema.safeParse({
        playerId: PLAYER_UUID,
        goal: "cut",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // playerId is not in the schema, Zod strips it
        expect((result.data as any).playerId).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    });

    it("does NOT contain status as a valid field — status is silently stripped", () => {
      const result = updateBlockSchema.safeParse({
        goal: "cut",
        status: "closed", // attempt to set status via PATCH
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // status is not in schema, stripped by Zod
        expect((result.data as any).status).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    });

    it("rejects invalid goal on update", () => {
      expect(
        updateBlockSchema.safeParse({ goal: "invalid" }).success,
      ).toBe(false);
    });
  });

  // ── closeBlockSchema ──

  describe("closeBlockSchema", () => {
    it("accepts empty body (all optional)", () => {
      expect(closeBlockSchema.safeParse({}).success).toBe(true);
    });

    it("accepts valid endScanId and closedAt", () => {
      expect(
        closeBlockSchema.safeParse({
          endScanId: UUID,
          closedAt: "2026-04-22",
        }).success,
      ).toBe(true);
    });

    it("rejects invalid endScanId UUID", () => {
      expect(
        closeBlockSchema.safeParse({ endScanId: "bad-uuid" }).success,
      ).toBe(false);
    });
  });

  // ── listBlocksQuerySchema ──

  describe("listBlocksQuerySchema", () => {
    it("applies defaults for page and limit", () => {
      const data = listBlocksQuerySchema.parse({});
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
    });

    it("coerces string numbers", () => {
      const data = listBlocksQuerySchema.parse({ page: "2", limit: "50" });
      expect(data.page).toBe(2);
      expect(data.limit).toBe(50);
    });

    it("accepts valid status filter", () => {
      expect(
        listBlocksQuerySchema.safeParse({ status: "active" }).success,
      ).toBe(true);
    });

    it("rejects invalid status filter", () => {
      expect(
        listBlocksQuerySchema.safeParse({ status: "unknown" }).success,
      ).toBe(false);
    });

    it("rejects limit > 100", () => {
      expect(
        listBlocksQuerySchema.safeParse({ limit: "101" }).success,
      ).toBe(false);
    });
  });

  // ── getBlockSchema ──

  describe("getBlockSchema", () => {
    it("accepts a valid UUID", () => {
      expect(getBlockSchema.safeParse({ id: UUID }).success).toBe(true);
    });

    it("rejects a non-UUID id", () => {
      expect(getBlockSchema.safeParse({ id: "not-a-uuid" }).success).toBe(
        false,
      );
    });
  });

  // ── getPlayerBlocksSchema ──

  describe("getPlayerBlocksSchema", () => {
    it("accepts a valid playerId UUID", () => {
      expect(
        getPlayerBlocksSchema.safeParse({ playerId: PLAYER_UUID }).success,
      ).toBe(true);
    });

    it("rejects a non-UUID playerId", () => {
      expect(
        getPlayerBlocksSchema.safeParse({ playerId: "bad" }).success,
      ).toBe(false);
    });
  });
});
