/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/wellness/bodyComposition.routes.test.ts
// Route-level validation and controller integration tests.
// Service is mocked — no DB or HTTP required.
// ─────────────────────────────────────────────────────────────
jest.mock("../../../src/modules/wellness/bodyComposition.service");
jest.mock("../../../src/shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest
    .fn()
    .mockReturnValue({ userId: "u1", userName: "Coach", userRole: "GymCoach" }),
  buildChanges: jest.fn().mockReturnValue({}),
}));
jest.mock("../../../src/shared/utils/cache", () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dashboard" },
}));

import * as ctrl from "../../../src/modules/wellness/bodyComposition.controller";
import * as svc from "../../../src/modules/wellness/bodyComposition.service";
import { AppError } from "../../../src/middleware/errorHandler";

const SCAN_ID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_ID = "550e8400-e29b-41d4-a716-446655440002";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: SCAN_ID, fullName: "GymCoach", role: "GymCoach", playerId: null },
    ip: "127.0.0.1",
    ...overrides,
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const fakeScan = {
  id: SCAN_ID,
  playerId: PLAYER_ID,
  scanDate: "2026-04-22",
  weightKg: 75.5,
};

describe("bodyComposition routes / controller integration", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── list ──────────────────────────────────────────────

  describe("list", () => {
    it("passes query and user through to service", async () => {
      (svc.listScans as jest.Mock).mockResolvedValue({
        data: [fakeScan],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await ctrl.list(
        mockReq({ query: { page: "1", limit: "20" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listScans).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ role: "GymCoach" }),
      );
    });

    it("propagates service errors as thrown exceptions", async () => {
      (svc.listScans as jest.Mock).mockRejectedValue(new Error("DB down"));
      await expect(ctrl.list(mockReq(), mockRes())).rejects.toThrow("DB down");
    });
  });

  // ── getById ───────────────────────────────────────────

  describe("getById", () => {
    it("calls service with correct id and user", async () => {
      (svc.getScanById as jest.Mock).mockResolvedValue(fakeScan);
      const res = mockRes();
      await ctrl.getById(mockReq({ params: { id: SCAN_ID } }), res);
      expect(svc.getScanById).toHaveBeenCalledWith(
        SCAN_ID,
        expect.objectContaining({ role: "GymCoach" }),
      );
    });
  });

  // ── create ────────────────────────────────────────────

  describe("create", () => {
    it("passes body and userId to service", async () => {
      (svc.createScan as jest.Mock).mockResolvedValue(fakeScan);
      const payload = {
        playerId: PLAYER_ID,
        scanDate: "2026-04-22",
        weightKg: 75.5,
      };
      const res = mockRes();
      await ctrl.create(mockReq({ body: payload }), res);
      expect(svc.createScan).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: PLAYER_ID }),
        SCAN_ID, // userId from req.user.id
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("propagates 409 AppError", async () => {
      (svc.createScan as jest.Mock).mockRejectedValue(
        new AppError("Scan already exists for this date", 409),
      );
      await expect(
        ctrl.create(
          mockReq({ body: { playerId: PLAYER_ID, scanDate: "2026-04-22", weightKg: 75 } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── update ────────────────────────────────────────────

  describe("update", () => {
    it("calls service with id and patch body", async () => {
      (svc.updateScan as jest.Mock).mockResolvedValue({
        ...fakeScan,
        weightKg: 76.0,
      });
      const res = mockRes();
      await ctrl.update(
        mockReq({ params: { id: SCAN_ID }, body: { weightKg: 76.0 } }),
        res,
      );
      expect(svc.updateScan).toHaveBeenCalledWith(
        SCAN_ID,
        expect.objectContaining({ weightKg: 76.0 }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── remove ────────────────────────────────────────────

  describe("remove", () => {
    it("calls service delete and returns 200", async () => {
      (svc.deleteScan as jest.Mock).mockResolvedValue({ id: SCAN_ID });
      const res = mockRes();
      await ctrl.remove(mockReq({ params: { id: SCAN_ID } }), res);
      expect(svc.deleteScan).toHaveBeenCalledWith(SCAN_ID);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 404 when scan does not exist", async () => {
      (svc.deleteScan as jest.Mock).mockRejectedValue(
        new AppError("Scan not found", 404),
      );
      await expect(
        ctrl.remove(mockReq({ params: { id: SCAN_ID } }), mockRes()),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── listForPlayer ─────────────────────────────────────

  describe("listForPlayer", () => {
    it("passes playerId from params to service", async () => {
      (svc.listScansForPlayer as jest.Mock).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      const res = mockRes();
      await ctrl.listForPlayer(
        mockReq({ params: { playerId: PLAYER_ID }, query: {} }),
        res,
      );
      expect(svc.listScansForPlayer).toHaveBeenCalledWith(
        PLAYER_ID,
        expect.anything(),
        expect.anything(),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── getLatest ─────────────────────────────────────────

  describe("getLatest", () => {
    it("returns latest scan for player", async () => {
      (svc.getLatestScan as jest.Mock).mockResolvedValue(fakeScan);
      const res = mockRes();
      await ctrl.getLatest(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      expect(svc.getLatestScan).toHaveBeenCalledWith(
        PLAYER_ID,
        expect.anything(),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 404 when player has no scans", async () => {
      (svc.getLatestScan as jest.Mock).mockRejectedValue(
        new AppError("No scans found for this player", 404),
      );
      await expect(
        ctrl.getLatest(
          mockReq({ params: { playerId: PLAYER_ID } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
