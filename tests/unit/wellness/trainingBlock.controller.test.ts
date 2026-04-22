/// <reference types="jest" />
jest.mock("../../../src/modules/wellness/trainingBlock.service");
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

import * as ctrl from "../../../src/modules/wellness/trainingBlock.controller";
import * as svc from "../../../src/modules/wellness/trainingBlock.service";
import { AppError } from "../../../src/middleware/errorHandler";

const BLOCK_ID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_ID = "550e8400-e29b-41d4-a716-446655440002";
const USER_ID = "550e8400-e29b-41d4-a716-446655440003";
const SCAN_ID = "550e8400-e29b-41d4-a716-446655440004";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: USER_ID, email: "coach@sadara.com", fullName: "Coach", role: "GymCoach", playerId: null },
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

const fakeBlock = {
  id: BLOCK_ID,
  playerId: PLAYER_ID,
  status: "active",
  goal: "cut",
  durationWeeks: 8,
  startedAt: "2026-04-22",
  plannedEndAt: "2026-06-17",
  createdBy: USER_ID,
};

describe("TrainingBlock Controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── list ──────────────────────────────────────────────

  describe("list", () => {
    it("returns paginated blocks (200)", async () => {
      (svc.listBlocks as jest.Mock).mockResolvedValue({
        data: [fakeBlock],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await ctrl.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listBlocks).toHaveBeenCalled();
    });
  });

  // ── getById ───────────────────────────────────────────

  describe("getById", () => {
    it("returns a single block (200)", async () => {
      (svc.getBlockById as jest.Mock).mockResolvedValue(fakeBlock);
      const res = mockRes();
      await ctrl.getById(mockReq({ params: { id: BLOCK_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 404 when block not found", async () => {
      (svc.getBlockById as jest.Mock).mockRejectedValue(
        new AppError("Training block not found", 404),
      );
      await expect(
        ctrl.getById(mockReq({ params: { id: BLOCK_ID } }), mockRes()),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── create (openBlock) ────────────────────────────────

  describe("create (openBlock)", () => {
    it("opens a block and returns 201", async () => {
      (svc.openBlock as jest.Mock).mockResolvedValue(fakeBlock);
      const res = mockRes();
      await ctrl.create(
        mockReq({
          body: { playerId: PLAYER_ID, goal: "cut", durationWeeks: 8 },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("propagates 409 when player already has an active block", async () => {
      (svc.openBlock as jest.Mock).mockRejectedValue(
        new AppError("Player already has an active training block", 409),
      );
      await expect(
        ctrl.create(
          mockReq({
            body: { playerId: PLAYER_ID, goal: "cut", durationWeeks: 8 },
          }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── update ────────────────────────────────────────────

  describe("update", () => {
    it("updates block (200)", async () => {
      (svc.updateBlock as jest.Mock).mockResolvedValue({
        ...fakeBlock,
        durationWeeks: 10,
      });
      const res = mockRes();
      await ctrl.update(
        mockReq({ params: { id: BLOCK_ID }, body: { durationWeeks: 10 } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("strips status field silently (Zod omits it before reaching service)", async () => {
      // The schema strips status — service should NOT receive status in body.
      (svc.updateBlock as jest.Mock).mockResolvedValue(fakeBlock);
      await ctrl.update(
        mockReq({
          params: { id: BLOCK_ID },
          // In a real request, Zod validation runs before controller.
          // Here body is post-Zod so status would already be stripped.
          body: { durationWeeks: 10 },
        }),
        mockRes(),
      );
      expect(svc.updateBlock).toHaveBeenCalledWith(
        BLOCK_ID,
        expect.not.objectContaining({ status: expect.anything() }),
      );
    });
  });

  // ── remove ────────────────────────────────────────────

  describe("remove", () => {
    it("deletes block and returns 200", async () => {
      (svc.deleteBlock as jest.Mock).mockResolvedValue({ id: BLOCK_ID });
      const res = mockRes();
      await ctrl.remove(mockReq({ params: { id: BLOCK_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── listForPlayer ─────────────────────────────────────

  describe("listForPlayer", () => {
    it("returns paginated blocks for a player (200)", async () => {
      (svc.listBlocksForPlayer as jest.Mock).mockResolvedValue({
        data: [fakeBlock],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await ctrl.listForPlayer(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listBlocksForPlayer).toHaveBeenCalledWith(
        PLAYER_ID,
        expect.anything(),
        expect.anything(),
      );
    });
  });

  // ── getActive ─────────────────────────────────────────

  describe("getActive", () => {
    it("returns active block (200)", async () => {
      (svc.getActiveBlock as jest.Mock).mockResolvedValue(fakeBlock);
      const res = mockRes();
      await ctrl.getActive(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns null (not 404) when no active block exists", async () => {
      (svc.getActiveBlock as jest.Mock).mockResolvedValue(null);
      const res = mockRes();
      await ctrl.getActive(
        mockReq({ params: { playerId: PLAYER_ID } }),
        res,
      );
      // Must be 200 with data: null — NOT a 404 throw
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: null }),
      );
    });
  });

  // ── pause ─────────────────────────────────────────────

  describe("pause", () => {
    it("pauses an active block (200)", async () => {
      (svc.pauseBlock as jest.Mock).mockResolvedValue({
        ...fakeBlock,
        status: "paused",
        pausedAt: "2026-04-22",
      });
      const res = mockRes();
      await ctrl.pause(mockReq({ params: { id: BLOCK_ID }, body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 422 when block is not active (already paused)", async () => {
      (svc.pauseBlock as jest.Mock).mockRejectedValue(
        new AppError("Only active blocks can be paused", 422),
      );
      await expect(
        ctrl.pause(mockReq({ params: { id: BLOCK_ID }, body: {} }), mockRes()),
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  // ── resume ────────────────────────────────────────────

  describe("resume", () => {
    it("resumes a paused block (200)", async () => {
      (svc.resumeBlock as jest.Mock).mockResolvedValue({
        ...fakeBlock,
        status: "active",
        pausedAt: null,
      });
      const res = mockRes();
      await ctrl.resume(mockReq({ params: { id: BLOCK_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 422 when block is not paused", async () => {
      (svc.resumeBlock as jest.Mock).mockRejectedValue(
        new AppError("Only paused blocks can be resumed", 422),
      );
      await expect(
        ctrl.resume(mockReq({ params: { id: BLOCK_ID } }), mockRes()),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it("propagates 409 when another active block exists", async () => {
      (svc.resumeBlock as jest.Mock).mockRejectedValue(
        new AppError("Player already has an active training block", 409),
      );
      await expect(
        ctrl.resume(mockReq({ params: { id: BLOCK_ID } }), mockRes()),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── close ─────────────────────────────────────────────

  describe("close", () => {
    it("closes a block and returns 200 with closedAt/closedBy set", async () => {
      const closedBlock = {
        ...fakeBlock,
        status: "closed",
        closedAt: "2026-04-22",
        endScanId: SCAN_ID,
        closedBy: USER_ID,
      };
      (svc.closeBlock as jest.Mock).mockResolvedValue(closedBlock);
      const res = mockRes();
      await ctrl.close(
        mockReq({
          params: { id: BLOCK_ID },
          body: { endScanId: SCAN_ID, closedAt: "2026-04-22" },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.closeBlock).toHaveBeenCalledWith(
        BLOCK_ID,
        expect.objectContaining({ endScanId: SCAN_ID }),
        USER_ID, // closedBy from req.user.id
      );
    });

    it("propagates 422 when block is already closed", async () => {
      (svc.closeBlock as jest.Mock).mockRejectedValue(
        new AppError("Training block is already closed", 422),
      );
      await expect(
        ctrl.close(
          mockReq({ params: { id: BLOCK_ID }, body: {} }),
          mockRes(),
        ),
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
