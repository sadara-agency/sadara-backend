import { AppError } from "@middleware/errorHandler";

// ── Model mocks ──
jest.mock("./matchEvaluation.model");
jest.mock("@modules/matches/matchPlayer.model");
jest.mock("@modules/players/player.model");
jest.mock("@modules/users/user.model");
jest.mock("@modules/referrals/referral.model");
jest.mock("@modules/approvals/approval.service");
jest.mock("@modules/notifications/notification.service");
jest.mock("@shared/utils/displayId");

import MatchEvaluation from "./matchEvaluation.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { Player } from "@modules/players/player.model";
import { createApprovalRequest } from "@modules/approvals/approval.service";
import { createNotification } from "@modules/notifications/notification.service";
import { generateDisplayId } from "@shared/utils/displayId";
import * as service from "./matchEvaluation.service";

const mockEval = {
  id: "eval-1",
  matchPlayerId: "mp-1",
  matchId: "match-1",
  playerId: "player-1",
  analystId: "analyst-1",
  overallRating: 7,
  fitnessScores: {},
  technicalScores: {},
  tacticalScores: {},
  contributionScores: {},
  summary: "Good performance",
  recommendation: "Keep working",
  needsReferral: false,
  referralId: null,
  status: "Draft",
  approvalId: null,
  approvedAt: null,
  approvedBy: null,
  revisionComment: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  update: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
} as any;

const mockMatchPlayer = {
  id: "mp-1",
  matchId: "match-1",
  playerId: "player-1",
} as any;

const analystUser = { id: "analyst-1", role: "Analyst" } as any;
const managerUser = { id: "manager-1", role: "Manager" } as any;
const adminUser = { id: "admin-1", role: "Admin" } as any;

beforeEach(() => {
  jest.clearAllMocks();
  (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
    ...mockEval,
    update: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  });
  (MatchEvaluation.findOne as jest.Mock).mockResolvedValue(null);
  (MatchEvaluation.findAndCountAll as jest.Mock).mockResolvedValue({
    rows: [mockEval],
    count: 1,
  });
  (MatchEvaluation.create as jest.Mock).mockResolvedValue({ id: "eval-1" });
  (MatchPlayer.findByPk as jest.Mock).mockResolvedValue(mockMatchPlayer);
  (Player.findByPk as jest.Mock).mockResolvedValue({
    firstName: "Ahmed",
    lastName: "Ali",
    firstNameAr: "أحمد",
  });
  (createApprovalRequest as jest.Mock).mockResolvedValue({ id: "approval-1" });
  (createNotification as jest.Mock).mockResolvedValue(undefined);
  (generateDisplayId as jest.Mock).mockResolvedValue("REF-001");
});

// ── listEvaluations ──

describe("listEvaluations", () => {
  it("returns paginated data", async () => {
    const result = await service.listEvaluations({
      page: 1,
      limit: 20,
      sort: "createdAt",
      order: "desc",
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it("filters by playerId when provided", async () => {
    await service.listEvaluations({
      page: 1,
      limit: 20,
      sort: "createdAt",
      order: "desc",
      playerId: "player-1",
    });
    const call = (MatchEvaluation.findAndCountAll as jest.Mock).mock
      .calls[0][0];
    expect(call.where.playerId).toBe("player-1");
  });
});

// ── getEvaluationById ──

describe("getEvaluationById", () => {
  it("returns evaluation when found", async () => {
    const result = await service.getEvaluationById("eval-1");
    expect(result).toBeDefined();
  });

  it("throws 404 when evaluation not found", async () => {
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(service.getEvaluationById("missing")).rejects.toThrow(
      new AppError("Evaluation not found", 404),
    );
  });
});

// ── createEvaluation ──

describe("createEvaluation", () => {
  it("creates a Draft evaluation successfully", async () => {
    const result = await service.createEvaluation(
      { matchPlayerId: "mp-1", overallRating: 7 },
      "analyst-1",
    );
    expect(MatchEvaluation.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("throws 404 when matchPlayer does not exist", async () => {
    (MatchPlayer.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(
      service.createEvaluation(
        { matchPlayerId: "missing-mp", overallRating: 7 },
        "analyst-1",
      ),
    ).rejects.toThrow(new AppError("Match player entry not found", 404));
  });

  it("throws 409 when evaluation already exists for match_player", async () => {
    (MatchEvaluation.findOne as jest.Mock).mockResolvedValue(mockEval);
    await expect(
      service.createEvaluation(
        { matchPlayerId: "mp-1", overallRating: 7 },
        "analyst-1",
      ),
    ).rejects.toThrow(
      new AppError(
        "An evaluation already exists for this player in this match",
        409,
      ),
    );
  });
});

// ── updateEvaluation ──

describe("updateEvaluation", () => {
  it("allows the owning analyst to update a Draft", async () => {
    const result = await service.updateEvaluation(
      "eval-1",
      { overallRating: 8 },
      analystUser,
    );
    expect(result).toBeDefined();
  });

  it("throws 403 when a different analyst tries to update", async () => {
    const otherAnalyst = { id: "other-analyst", role: "Analyst" } as any;
    await expect(
      service.updateEvaluation("eval-1", { overallRating: 8 }, otherAnalyst),
    ).rejects.toThrow(
      new AppError("Only the owning analyst can edit this evaluation", 403),
    );
  });

  it("throws 422 when evaluation is Approved", async () => {
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Approved",
      update: jest.fn(),
    });
    await expect(
      service.updateEvaluation("eval-1", { overallRating: 8 }, analystUser),
    ).rejects.toThrow(
      new AppError(
        "Evaluation can only be edited in Draft or NeedsRevision status",
        422,
      ),
    );
  });
});

// ── submitEvaluation ──

describe("submitEvaluation", () => {
  it("transitions Draft to PendingReview", async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Draft",
      update: mockUpdate,
    });
    await service.submitEvaluation(
      "eval-1",
      "Good summary",
      "Recommended",
      analystUser,
    );
    expect(createApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "matchEvaluation",
        entityId: "eval-1",
        action: "approve",
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PendingReview" }),
    );
  });

  it("throws 422 when evaluation is already Approved", async () => {
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Approved",
      update: jest.fn(),
    });
    await expect(
      service.submitEvaluation(
        "eval-1",
        "summary",
        "recommendation",
        analystUser,
      ),
    ).rejects.toThrow(
      new AppError(
        "Only Draft or NeedsRevision evaluations can be submitted",
        422,
      ),
    );
  });
});

// ── approveEvaluation ──

describe("approveEvaluation", () => {
  it("transitions PendingReview to Approved", async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "PendingReview",
      analystId: "analyst-1",
      update: mockUpdate,
    });
    await service.approveEvaluation("eval-1", managerUser);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Approved" }),
    );
  });

  it("throws 422 when evaluation is not PendingReview", async () => {
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Draft",
      update: jest.fn(),
    });
    await expect(
      service.approveEvaluation("eval-1", managerUser),
    ).rejects.toThrow(
      new AppError("Only PendingReview evaluations can be approved", 422),
    );
  });
});

// ── requestRevision ──

describe("requestRevision", () => {
  it("transitions PendingReview to NeedsRevision with comment", async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "PendingReview",
      analystId: "analyst-1",
      update: mockUpdate,
    });
    await service.requestRevision("eval-1", "Needs more detail", managerUser);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "NeedsRevision",
        revisionComment: "Needs more detail",
      }),
    );
  });

  it("throws 422 when evaluation is Draft", async () => {
    await expect(
      service.requestRevision("eval-1", "comment", managerUser),
    ).rejects.toThrow(
      new AppError(
        "Only PendingReview evaluations can be sent for revision",
        422,
      ),
    );
  });
});

// ── deleteEvaluation ──

describe("deleteEvaluation", () => {
  it("allows analyst to delete a Draft evaluation", async () => {
    const mockDestroy = jest.fn().mockResolvedValue(undefined);
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Draft",
      update: jest.fn(),
      destroy: mockDestroy,
    });
    const result = await service.deleteEvaluation("eval-1", analystUser);
    expect(mockDestroy).toHaveBeenCalled();
    expect(result).toEqual({ id: "eval-1" });
  });

  it("throws 422 when evaluation is not Draft", async () => {
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Approved",
      update: jest.fn(),
      destroy: jest.fn(),
    });
    await expect(
      service.deleteEvaluation("eval-1", analystUser),
    ).rejects.toThrow(
      new AppError("Only Draft evaluations can be deleted", 422),
    );
  });

  it("throws 403 when a different user tries to delete", async () => {
    const otherUser = { id: "other", role: "Analyst" } as any;
    (MatchEvaluation.findByPk as jest.Mock).mockResolvedValue({
      ...mockEval,
      status: "Draft",
      update: jest.fn(),
      destroy: jest.fn(),
    });
    await expect(service.deleteEvaluation("eval-1", otherUser)).rejects.toThrow(
      new AppError("Only the owning analyst can delete this evaluation", 403),
    );
  });
});
