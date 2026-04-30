/// <reference types="jest" />
// Unit tests for the KPI computation formula (pure function, no DB needed)

import { computeKpiScores, KpiInputRow } from "../../../src/modules/staffMonitoring/staffMonitoring.service";

function makeRow(overrides: Partial<KpiInputRow> = {}): KpiInputRow {
  return {
    userId: "u1",
    role: "Analyst",
    priorityWeightedCompleted: 5,
    overdue: 0,
    totalAssigned: 10,
    completed: 8,
    onTimeRate: 1.0,
    activeDays: 20,
    totalHours: 120,
    ...overrides,
  };
}

describe("computeKpiScores", () => {
  describe("single row — basic scoring", () => {
    it("should return kpiScore 0–100", () => {
      const [out] = computeKpiScores([makeRow()]);
      expect(out.kpiScore).toBeGreaterThanOrEqual(0);
      expect(out.kpiScore).toBeLessThanOrEqual(100);
    });

    it("should score 100 for a clear top performer in a two-person bucket", () => {
      // Two analysts: top has 3× the priority-weighted score of peer.
      // medianC = (10 + 90) / 2 = 50, ceiling = 50 × 1.5 = 75.
      // Top: 90 ≥ 75 → productivityScore = 100, quality = 100, engagement = 100.
      const rows = [
        makeRow({
          userId: "top",
          role: "Analyst",
          priorityWeightedCompleted: 90,
          overdue: 0,
          totalAssigned: 20,
          completed: 20,
          onTimeRate: 1.0,
          activeDays: 20,
          totalHours: 120,
        }),
        makeRow({
          userId: "low",
          role: "Analyst",
          priorityWeightedCompleted: 10,
          overdue: 0,
          totalAssigned: 5,
          completed: 5,
          onTimeRate: 1.0,
          activeDays: 20,
          totalHours: 120,
        }),
      ];
      const out = computeKpiScores(rows);
      const top = out.find((r) => r.userId === "top")!;
      expect(top.kpiScore).toBe(100);
    });

    it("should score 0 for someone with no completed tasks, no activity", () => {
      // Edge: T >= 5 so no new-hire protection on quality
      const [out] = computeKpiScores([
        makeRow({
          priorityWeightedCompleted: 0,
          overdue: 5,
          totalAssigned: 10,
          completed: 0,
          onTimeRate: 0,
          activeDays: 0,
          totalHours: 0,
        }),
      ]);
      expect(out.kpiScore).toBe(0);
    });
  });

  describe("new hire protection", () => {
    it("should give quality=100 when completed=0 AND totalAssigned < 3", () => {
      const [out] = computeKpiScores([
        makeRow({
          priorityWeightedCompleted: 0,
          overdue: 0,
          totalAssigned: 1,
          completed: 0,
          onTimeRate: 0,
          activeDays: 5,
          totalHours: 30,
        }),
      ]);
      expect(out.qualityScore).toBe(100);
    });

    it("should NOT protect quality when totalAssigned >= 3 and completed=0", () => {
      const [out] = computeKpiScores([
        makeRow({
          priorityWeightedCompleted: 0,
          overdue: 0,
          totalAssigned: 5,
          completed: 0,
          onTimeRate: 0,
          activeDays: 5,
          totalHours: 30,
        }),
      ]);
      expect(out.qualityScore).toBe(0);
    });
  });

  describe("overdue penalty", () => {
    it("should cap the overdue penalty at 50 points (5 × 10)", () => {
      const few = computeKpiScores([makeRow({ overdue: 5, priorityWeightedCompleted: 100 })])[0];
      const many = computeKpiScores([makeRow({ overdue: 10, priorityWeightedCompleted: 100 })])[0];
      expect(few.productivityScore).toBe(many.productivityScore);
    });

    it("should not let productivityScore go below 0", () => {
      const [out] = computeKpiScores([
        makeRow({ overdue: 5, priorityWeightedCompleted: 0 }),
      ]);
      expect(out.productivityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("peer bucket median", () => {
    it("should use peer-bucket median for productivity normalisation", () => {
      const rows: KpiInputRow[] = [
        makeRow({ userId: "u1", role: "Analyst", priorityWeightedCompleted: 10 }),
        makeRow({ userId: "u2", role: "Analyst", priorityWeightedCompleted: 20 }),
        makeRow({ userId: "u3", role: "Coach", priorityWeightedCompleted: 100 }),
      ];
      const scored = computeKpiScores(rows);
      const u1 = scored.find((s) => s.userId === "u1")!;
      const u2 = scored.find((s) => s.userId === "u2")!;
      const u3 = scored.find((s) => s.userId === "u3")!;

      // u2 (higher than median) should score higher or equal to u1 in productivity
      expect(u2.productivityScore).toBeGreaterThanOrEqual(u1.productivityScore);
      // u3 is in a different bucket — no cross-bucket comparison penalty
      expect(u3.productivityScore).toBeGreaterThanOrEqual(0);
    });

    it("should use 80% self-comparison for single-member bucket", () => {
      const [out] = computeKpiScores([
        makeRow({ userId: "u1", role: "GraphicDesigner", priorityWeightedCompleted: 10 }),
      ]);
      // 80% self-comparison means medianC = 8, target ceiling = 8 × 1.5 = 12
      // 10/12 × 100 = 83.3 → productivityScore ≈ 83
      expect(out.productivityScore).toBeGreaterThan(50);
      expect(out.productivityScore).toBeLessThanOrEqual(100);
    });
  });

  describe("engagement scoring", () => {
    it("should cap engagement at 100 regardless of extra hours", () => {
      const [out] = computeKpiScores([
        makeRow({ activeDays: 30, totalHours: 300 }),
      ]);
      expect(out.engagementScore).toBeLessThanOrEqual(100);
    });

    it("should score 0 engagement for someone with no active days", () => {
      const [out] = computeKpiScores([
        makeRow({ activeDays: 0, totalHours: 0 }),
      ]);
      expect(out.engagementScore).toBe(0);
    });
  });

  describe("kpiScore weights", () => {
    it("should compute kpiScore as weighted sum (50/30/20)", () => {
      const productivity = 80;
      const quality = 100;
      const engagement = 60;
      const expected = Math.round(0.5 * productivity + 0.3 * quality + 0.2 * engagement);

      const [out] = computeKpiScores([
        makeRow({
          role: "GraphicDesigner", // single-member bucket for isolated test
          priorityWeightedCompleted: 50, // tuned for ~80 productivity
          overdue: 0,
          completed: 20,
          totalAssigned: 20,
          onTimeRate: 1.0,     // quality = 100
          activeDays: 12,      // engagement formula
          totalHours: 72,      // 6h avg × 12 days
        }),
      ]);

      // Allow ±5 rounding tolerance
      expect(out.kpiScore).toBeCloseTo(expected, -1);
    });
  });

  describe("multiple rows", () => {
    it("should return same number of rows as input", () => {
      const input = [makeRow({ userId: "u1" }), makeRow({ userId: "u2" })];
      const out = computeKpiScores(input);
      expect(out).toHaveLength(2);
    });

    it("should preserve userId on each row", () => {
      const input = [makeRow({ userId: "aaa" }), makeRow({ userId: "bbb" })];
      const out = computeKpiScores(input);
      expect(out.map((r) => r.userId)).toEqual(["aaa", "bbb"]);
    });
  });
});
