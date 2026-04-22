/// <reference types="jest" />
jest.mock(
  "../../../src/modules/wellness/nutritionPrescription.service",
);
jest.mock("../../../src/shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest
    .fn()
    .mockReturnValue({ userId: "u1", userName: "Coach", userRole: "GymCoach" }),
}));
jest.mock("../../../src/shared/utils/cache", () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dashboard" },
}));

import * as ctrl from "../../../src/modules/wellness/nutritionPrescription.controller";
import * as svc from "../../../src/modules/wellness/nutritionPrescription.service";
import { AppError } from "../../../src/middleware/errorHandler";

const PRESCRIPTION_ID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_ID = "550e8400-e29b-41d4-a716-446655440002";
const USER_ID = "550e8400-e29b-41d4-a716-446655440003";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: {
      id: USER_ID,
      email: "coach@sadara.com",
      fullName: "Coach",
      role: "GymCoach",
      playerId: null,
    },
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

const fakePrescription = {
  id: PRESCRIPTION_ID,
  playerId: PLAYER_ID,
  versionNumber: 1,
  issuedBy: USER_ID,
  triggeringReason: "manual",
  targetCalories: 2800,
  targetProteinG: 180,
  targetCarbsG: 300,
  targetFatG: 80,
  supersededAt: null,
  supersededBy: null,
  meals: [],
};

describe("NutritionPrescription Controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── list ──────────────────────────────────────────────

  describe("list", () => {
    it("returns paginated prescriptions (200)", async () => {
      (svc.listPrescriptions as jest.Mock).mockResolvedValue({
        data: [fakePrescription],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await ctrl.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listPrescriptions).toHaveBeenCalled();
    });
  });

  // ── getById ───────────────────────────────────────────

  describe("getById", () => {
    it("returns a single prescription (200)", async () => {
      (svc.getPrescriptionById as jest.Mock).mockResolvedValue(
        fakePrescription,
      );
      const res = mockRes();
      await ctrl.getById(
        mockReq({ params: { id: PRESCRIPTION_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 404 when not found", async () => {
      (svc.getPrescriptionById as jest.Mock).mockRejectedValue(
        new AppError("Prescription not found", 404),
      );
      await expect(
        ctrl.getById(
          mockReq({ params: { id: PRESCRIPTION_ID } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── create (issuePrescription) ────────────────────────

  describe("create", () => {
    it("issues first prescription and returns 201", async () => {
      (svc.issuePrescription as jest.Mock).mockResolvedValue(fakePrescription);
      const res = mockRes();
      await ctrl.create(
        mockReq({
          body: {
            playerId: PLAYER_ID,
            targetCalories: 2800,
            targetProteinG: 180,
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("propagates 409 when player already has active prescription", async () => {
      (svc.issuePrescription as jest.Mock).mockRejectedValue(
        new AppError(
          "Player already has an active prescription.",
          409,
        ),
      );
      await expect(
        ctrl.create(
          mockReq({ body: { playerId: PLAYER_ID } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── update ────────────────────────────────────────────

  describe("update", () => {
    it("updates prescription (200)", async () => {
      (svc.updatePrescription as jest.Mock).mockResolvedValue({
        ...fakePrescription,
        targetCalories: 3000,
      });
      const res = mockRes();
      await ctrl.update(
        mockReq({
          params: { id: PRESCRIPTION_ID },
          body: { targetCalories: 3000 },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 422 when prescription is superseded", async () => {
      (svc.updatePrescription as jest.Mock).mockRejectedValue(
        new AppError("Cannot update a superseded prescription", 422),
      );
      await expect(
        ctrl.update(
          mockReq({
            params: { id: PRESCRIPTION_ID },
            body: { targetCalories: 3000 },
          }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  // ── remove ────────────────────────────────────────────

  describe("remove", () => {
    it("deletes prescription and returns 200", async () => {
      (svc.deletePrescription as jest.Mock).mockResolvedValue({
        id: PRESCRIPTION_ID,
      });
      const res = mockRes();
      await ctrl.remove(
        mockReq({ params: { id: PRESCRIPTION_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 422 when prescription is superseded", async () => {
      (svc.deletePrescription as jest.Mock).mockRejectedValue(
        new AppError("Cannot delete a superseded prescription", 422),
      );
      await expect(
        ctrl.remove(
          mockReq({ params: { id: PRESCRIPTION_ID } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  // ── getCurrent ────────────────────────────────────────

  describe("getCurrent", () => {
    it("returns current prescription (200)", async () => {
      (svc.getCurrentPrescription as jest.Mock).mockResolvedValue(
        fakePrescription,
      );
      const res = mockRes();
      await ctrl.getCurrent(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns null (not 404) when no active prescription", async () => {
      (svc.getCurrentPrescription as jest.Mock).mockResolvedValue(null);
      const res = mockRes();
      await ctrl.getCurrent(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: null }),
      );
    });
  });

  // ── getHistory ────────────────────────────────────────

  describe("getHistory", () => {
    it("returns version history array (200)", async () => {
      const v2 = { ...fakePrescription, versionNumber: 2 };
      const v1 = {
        ...fakePrescription,
        supersededAt: new Date(),
        supersededBy: v2.id,
      };
      (svc.getVersionHistory as jest.Mock).mockResolvedValue([v2, v1]);
      const res = mockRes();
      await ctrl.getHistory(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getVersionHistory).toHaveBeenCalledWith(
        PLAYER_ID,
        expect.anything(),
      );
    });
  });

  // ── reissue ───────────────────────────────────────────

  describe("reissue", () => {
    it("creates new version and returns 201", async () => {
      const v2 = { ...fakePrescription, versionNumber: 2, triggeringReason: "scan" };
      (svc.issueNewVersion as jest.Mock).mockResolvedValue(v2);
      const res = mockRes();
      await ctrl.reissue(
        mockReq({
          params: { playerId: PLAYER_ID },
          body: { triggeringReason: "scan" },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 200 with data: null when no current prescription exists", async () => {
      (svc.issueNewVersion as jest.Mock).mockResolvedValue(null);
      const res = mockRes();
      await ctrl.reissue(
        mockReq({
          params: { playerId: PLAYER_ID },
          body: { triggeringReason: "manual" },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: null }),
      );
    });
  });
});
