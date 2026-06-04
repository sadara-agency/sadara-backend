/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/dashboard/portfolioAnalytics.routes.test.ts
// Controller-integration tests for Portfolio Analytics handlers.
// Mirrors the codebase convention (e.g. medicalReports.routes.test.ts):
// the service is mocked and controllers are invoked directly with mock
// req/res. Auth/RBAC (401/403) is enforced by router-level middleware
// (authenticate → authorizeModule('dashboard','read')) which is exercised
// by the shared middleware tests, not re-stubbed here.
// ─────────────────────────────────────────────────────────────

jest.mock("../../../src/modules/dashboard/portfolioAnalytics.service");

import * as controller from "../../../src/modules/dashboard/portfolioAnalytics.controller";
import * as svc from "../../../src/modules/dashboard/portfolioAnalytics.service";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: "user-001", fullName: "Admin", role: "Admin" },
    ip: "127.0.0.1",
    ...overrides,
  }) as unknown as import("@shared/types").AuthRequest;

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as unknown as import("express").Response;
};

describe("portfolioAnalytics.controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getDistributions ────────────────────────────────────

  describe("getDistributions", () => {
    it("returns the service payload (200)", async () => {
      const payload = { nationality: [{ key: "Saudi Arabia", count: 3 }] };
      (svc.getDistributions as jest.Mock).mockResolvedValue(payload);
      const res = mockRes();

      await controller.getDistributions(mockReq(), res);

      expect(svc.getDistributions).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: payload }),
      );
    });

    it("propagates service errors", async () => {
      (svc.getDistributions as jest.Mock).mockRejectedValue(
        new Error("DB down"),
      );
      await expect(
        controller.getDistributions(mockReq(), mockRes()),
      ).rejects.toThrow("DB down");
    });
  });

  // ── getKpis ─────────────────────────────────────────────

  describe("getKpis", () => {
    it("returns KPI payload (200)", async () => {
      const payload = {
        totalPlayers: 10,
        averageAge: 24.5,
        avgTechnicalRating: null,
        underDevelopment: 2,
        readyForMarketing: 1,
        underNegotiation: 0,
      };
      (svc.getKpis as jest.Mock).mockResolvedValue(payload);
      const res = mockRes();

      await controller.getKpis(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: payload }),
      );
    });
  });

  // ── getPositions ────────────────────────────────────────

  describe("getPositions", () => {
    it("returns position insights (200)", async () => {
      const payload = { all: [], mostRepresented: [], leastRepresented: [] };
      (svc.getPositions as jest.Mock).mockResolvedValue(payload);
      const res = mockRes();

      await controller.getPositions(mockReq(), res);

      expect(svc.getPositions).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── getRankings ─────────────────────────────────────────

  describe("getRankings", () => {
    it("threads the raw period query through to the service", async () => {
      (svc.getRankings as jest.Mock).mockResolvedValue({
        period: 30,
        topRated: [],
        mostImproved: [],
      });
      const res = mockRes();

      await controller.getRankings(mockReq({ query: { period: "30" } }), res);

      expect(svc.getRankings).toHaveBeenCalledWith("30");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("passes undefined when no period query is present", async () => {
      (svc.getRankings as jest.Mock).mockResolvedValue({
        period: 90,
        topRated: [],
        mostImproved: [],
      });
      const res = mockRes();

      await controller.getRankings(mockReq(), res);

      expect(svc.getRankings).toHaveBeenCalledWith(undefined);
    });

    it("propagates service errors", async () => {
      (svc.getRankings as jest.Mock).mockRejectedValue(new Error("boom"));
      await expect(
        controller.getRankings(mockReq(), mockRes()),
      ).rejects.toThrow("boom");
    });
  });

  // ── getAll ──────────────────────────────────────────────

  describe("getAll", () => {
    it("returns the batched payload (200)", async () => {
      const payload = {
        nationality: [],
        kpis: { totalPlayers: 0 },
        positions: { all: [], mostRepresented: [], leastRepresented: [] },
        rankings: { period: 90, topRated: [], mostImproved: [] },
      };
      (svc.getPortfolioAll as jest.Mock).mockResolvedValue(payload);
      const res = mockRes();

      await controller.getAll(mockReq(), res);

      expect(svc.getPortfolioAll).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: payload }),
      );
    });
  });
});
