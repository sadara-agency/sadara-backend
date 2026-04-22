/// <reference types="jest" />
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
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dash" },
}));

import * as controller from "../../../src/modules/wellness/bodyComposition.controller";
import * as svc from "../../../src/modules/wellness/bodyComposition.service";
import { AppError } from "../../../src/middleware/errorHandler";

const UUID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_UUID = "550e8400-e29b-41d4-a716-446655440002";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: UUID, fullName: "Coach", role: "GymCoach", playerId: null },
    ip: "127.0.0.1",
    ...overrides,
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const fakeScan = {
  id: UUID,
  playerId: PLAYER_UUID,
  scanDate: "2026-04-22",
  weightKg: 75.5,
  bodyFatPct: 12.3,
  recordedBy: UUID,
  get: jest.fn().mockReturnThis(),
};

describe("BodyComposition Controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── list ──

  describe("list", () => {
    it("returns paginated scans", async () => {
      (svc.listScans as jest.Mock).mockResolvedValue({
        data: [fakeScan],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listScans).toHaveBeenCalled();
    });
  });

  // ── getById ──

  describe("getById", () => {
    it("returns a single scan", async () => {
      (svc.getScanById as jest.Mock).mockResolvedValue(fakeScan);
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: UUID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getScanById).toHaveBeenCalledWith(UUID, expect.anything());
    });

    it("propagates 404 when scan is not found", async () => {
      (svc.getScanById as jest.Mock).mockRejectedValue(
        new AppError("Scan not found", 404),
      );
      const res = mockRes();
      await expect(
        controller.getById(mockReq({ params: { id: UUID } }), res),
      ).rejects.toThrow("Scan not found");
    });
  });

  // ── create ──

  describe("create", () => {
    it("creates a scan and returns 201", async () => {
      (svc.createScan as jest.Mock).mockResolvedValue(fakeScan);
      const res = mockRes();
      await controller.create(
        mockReq({
          body: {
            playerId: PLAYER_UUID,
            scanDate: "2026-04-22",
            weightKg: 75.5,
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.createScan).toHaveBeenCalled();
    });

    it("propagates 409 on duplicate date", async () => {
      (svc.createScan as jest.Mock).mockRejectedValue(
        new AppError("Scan already exists for this date", 409),
      );
      const res = mockRes();
      await expect(
        controller.create(
          mockReq({
            body: {
              playerId: PLAYER_UUID,
              scanDate: "2026-04-22",
              weightKg: 75.5,
            },
          }),
          res,
        ),
      ).rejects.toThrow("Scan already exists for this date");
    });
  });

  // ── update ──

  describe("update", () => {
    it("updates a scan and returns 200", async () => {
      (svc.getScanById as jest.Mock).mockResolvedValue(fakeScan);
      (svc.updateScan as jest.Mock).mockResolvedValue({
        ...fakeScan,
        weightKg: 76.0,
      });
      const res = mockRes();
      await controller.update(
        mockReq({ params: { id: UUID }, body: { weightKg: 76.0 } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── remove ──

  describe("remove", () => {
    it("deletes a scan and returns 200", async () => {
      (svc.deleteScan as jest.Mock).mockResolvedValue({ id: UUID });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: UUID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── listForPlayer ──

  describe("listForPlayer", () => {
    it("returns scans for a specific player", async () => {
      (svc.listScansForPlayer as jest.Mock).mockResolvedValue({
        data: [fakeScan],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await controller.listForPlayer(
        mockReq({ params: { playerId: PLAYER_UUID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listScansForPlayer).toHaveBeenCalledWith(
        PLAYER_UUID,
        expect.anything(),
        expect.anything(),
      );
    });
  });

  // ── getLatest ──

  describe("getLatest", () => {
    it("returns the most recent scan for a player", async () => {
      (svc.getLatestScan as jest.Mock).mockResolvedValue(fakeScan);
      const res = mockRes();
      await controller.getLatest(
        mockReq({ params: { playerId: PLAYER_UUID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getLatestScan).toHaveBeenCalledWith(
        PLAYER_UUID,
        expect.anything(),
      );
    });

    it("propagates 404 when no scans exist", async () => {
      (svc.getLatestScan as jest.Mock).mockRejectedValue(
        new AppError("No scans found for this player", 404),
      );
      const res = mockRes();
      await expect(
        controller.getLatest(
          mockReq({ params: { playerId: PLAYER_UUID } }),
          res,
        ),
      ).rejects.toThrow("No scans found for this player");
    });
  });
});
