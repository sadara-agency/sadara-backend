import { AppError } from "@middleware/errorHandler";

// ── Mock model ──

jest.mock(
  "../../../src/modules/commercialAnalytics/salaryBenchmark.model",
  () => ({
    __esModule: true,
    default: {
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
    },
  }),
);

jest.mock("@shared/utils/pagination", () => ({
  parsePagination: jest.fn((q) => ({
    page: q.page ?? 1,
    limit: q.limit ?? 50,
    sort: q.sort ?? "createdAt",
    order: q.order ?? "DESC",
    offset: ((q.page ?? 1) - 1) * (q.limit ?? 50),
  })),
  buildMeta: jest.fn((count, page, limit) => ({
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  })),
}));

import SalaryBenchmark from "../../../src/modules/commercialAnalytics/salaryBenchmark.model";
import {
  listSalaryBenchmarks,
  getSalaryBenchmarkById,
  createSalaryBenchmark,
  updateSalaryBenchmark,
  deleteSalaryBenchmark,
  getBenchmarksByPosition,
} from "../../../src/modules/commercialAnalytics/salaryBenchmark.service";

// ── Helpers ──

const mockInstance = (data: Record<string, unknown> = {}) => ({
  id: "sb-1",
  position: "Striker",
  league: "SPL",
  tier: "mid" as const,
  annualSalarySar: 500000,
  ...data,
  update: jest.fn().mockResolvedValue({ id: "sb-1", ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("SalaryBenchmarkService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listSalaryBenchmarks ──

  describe("listSalaryBenchmarks", () => {
    it("returns paginated rows with meta", async () => {
      const rows = [mockInstance()];
      (SalaryBenchmark.findAndCountAll as jest.Mock).mockResolvedValue({
        rows,
        count: 1,
      });

      const result = await listSalaryBenchmarks({ page: 1, limit: 50 });

      expect(SalaryBenchmark.findAndCountAll).toHaveBeenCalled();
      expect(result.data).toEqual(rows);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it("applies position filter with iLike", async () => {
      (SalaryBenchmark.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listSalaryBenchmarks({ position: "Striker" });

      const call = (SalaryBenchmark.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.position).toBeDefined();
    });

    it("applies league filter", async () => {
      (SalaryBenchmark.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listSalaryBenchmarks({ league: "SPL" });

      const call = (SalaryBenchmark.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.league).toBe("SPL");
    });

    it("applies playerType filter", async () => {
      (SalaryBenchmark.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listSalaryBenchmarks({ playerType: "Domestic" });

      const call = (SalaryBenchmark.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.playerType).toBe("Domestic");
    });

    it("calculates correct meta for page 2", async () => {
      (SalaryBenchmark.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 100,
      });

      const result = await listSalaryBenchmarks({ page: 2, limit: 10 });

      expect(result.meta.totalPages).toBe(10);
      expect(result.meta.page).toBe(2);
    });
  });

  // ── getSalaryBenchmarkById ──

  describe("getSalaryBenchmarkById", () => {
    it("returns benchmark when found", async () => {
      const instance = mockInstance();
      (SalaryBenchmark.findByPk as jest.Mock).mockResolvedValue(instance);

      const result = await getSalaryBenchmarkById("sb-1");

      expect(SalaryBenchmark.findByPk).toHaveBeenCalledWith("sb-1");
      expect(result).toEqual(instance);
    });

    it("throws 404 when not found", async () => {
      (SalaryBenchmark.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getSalaryBenchmarkById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Salary benchmark not found",
      });
    });
  });

  // ── createSalaryBenchmark ──

  describe("createSalaryBenchmark", () => {
    it("creates and returns new benchmark", async () => {
      const input = {
        position: "Striker",
        league: "SPL",
        tier: "mid" as const,
        annualSalarySar: 500000,
        playerType: "Pro" as const,
      };
      const created = mockInstance({ ...input });
      (SalaryBenchmark.create as jest.Mock).mockResolvedValue(created);

      const result = await createSalaryBenchmark(input, "user-1");

      expect(SalaryBenchmark.create).toHaveBeenCalledWith({
        ...input,
        createdBy: "user-1",
      });
      expect(result).toEqual(created);
    });
  });

  // ── updateSalaryBenchmark ──

  describe("updateSalaryBenchmark", () => {
    it("finds benchmark and updates it", async () => {
      const instance = mockInstance();
      (SalaryBenchmark.findByPk as jest.Mock).mockResolvedValue(instance);

      await updateSalaryBenchmark("sb-1", { annualSalarySar: 600000 });

      expect(instance.update).toHaveBeenCalledWith({ annualSalarySar: 600000 });
    });

    it("throws 404 when benchmark not found", async () => {
      (SalaryBenchmark.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        updateSalaryBenchmark("missing", { annualSalarySar: 600000 }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── deleteSalaryBenchmark ──

  describe("deleteSalaryBenchmark", () => {
    it("deletes and returns { id }", async () => {
      const instance = mockInstance();
      (SalaryBenchmark.findByPk as jest.Mock).mockResolvedValue(instance);

      const result = await deleteSalaryBenchmark("sb-1");

      expect(instance.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: "sb-1" });
    });

    it("throws 404 when benchmark not found", async () => {
      (SalaryBenchmark.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(deleteSalaryBenchmark("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getBenchmarksByPosition ──

  describe("getBenchmarksByPosition", () => {
    it("returns grouped benchmarks by position and tier", async () => {
      const rows = [
        { position: "Striker", tier: "low", annualSalarySar: 300000 },
        { position: "Striker", tier: "mid", annualSalarySar: 500000 },
        { position: "Striker", tier: "high", annualSalarySar: 800000 },
      ];
      (SalaryBenchmark.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await getBenchmarksByPosition({
        positions: ["Striker"],
        league: "SPL",
      });

      expect(result).toEqual({
        Striker: { low: 300000, mid: 500000, high: 800000 },
      });
    });

    it("returns empty object when no benchmarks found", async () => {
      (SalaryBenchmark.findAll as jest.Mock).mockResolvedValue([]);

      const result = await getBenchmarksByPosition({ positions: ["Unknown"] });

      expect(result).toEqual({});
    });
  });
});
