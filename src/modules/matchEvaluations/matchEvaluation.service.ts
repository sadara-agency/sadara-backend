import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";
import { logger } from "@config/logger";
import {
  createNotification,
  notifyByRole,
} from "@modules/notifications/notification.service";
import { createApprovalRequest } from "@modules/approvals/approval.service";
import { Referral } from "@modules/referrals/referral.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import MatchEvaluation from "./matchEvaluation.model";
import type {
  CreateMatchEvaluationDTO,
  UpdateMatchEvaluationDTO,
  CreateEvaluationReferralDTO,
  ListMatchEvaluationsQuery,
} from "./matchEvaluation.validation";
import {
  defaultFitnessScores,
  defaultTechnicalScores,
  defaultTacticalScores,
  defaultContributionScores,
} from "./matchEvaluation.validation";
import { generateDisplayId } from "@shared/utils/displayId";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
  "position",
] as const;

const USER_ATTRS = ["id", "fullName", "fullNameAr", "role"] as const;

function evalIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "analyst", attributes: [...USER_ATTRS] },
  ];
}

// ── List ──

export async function listEvaluations(
  query: ListMatchEvaluationsQuery,
  _user?: AuthUser,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "createdAt",
  );

  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.matchId) where.matchId = query.matchId;
  if (query.analystId) where.analystId = query.analystId;
  if (query.status) where.status = query.status;

  const { rows, count } = await MatchEvaluation.findAndCountAll({
    where,
    include: evalIncludes(),
    limit,
    offset,
    order: [[sort, order]],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getEvaluationById(id: string, _user?: AuthUser) {
  const evaluation = await MatchEvaluation.findByPk(id, {
    include: evalIncludes(),
  });
  if (!evaluation) throw new AppError("Evaluation not found", 404);
  return evaluation;
}

// ── Create ──

export async function createEvaluation(
  data: CreateMatchEvaluationDTO,
  analystId: string,
) {
  // Validate match_player exists
  const matchPlayer = await MatchPlayer.findByPk(data.matchPlayerId);
  if (!matchPlayer) throw new AppError("Match player entry not found", 404);

  // Enforce uniqueness: one evaluation per match_player_id
  const existing = await MatchEvaluation.findOne({
    where: { matchPlayerId: data.matchPlayerId },
  });
  if (existing) {
    throw new AppError(
      "An evaluation already exists for this player in this match",
      409,
    );
  }

  const evaluation = await MatchEvaluation.create({
    matchPlayerId: data.matchPlayerId,
    matchId: matchPlayer.matchId,
    playerId: matchPlayer.playerId,
    analystId,
    overallRating: data.overallRating,
    fitnessScores: data.fitnessScores ?? defaultFitnessScores(),
    technicalScores: data.technicalScores ?? defaultTechnicalScores(),
    tacticalScores: data.tacticalScores ?? defaultTacticalScores(),
    contributionScores: data.contributionScores ?? defaultContributionScores(),
    summary: data.summary ?? "",
    highlights: data.highlights ?? null,
    mistakes: data.mistakes ?? null,
    strengths: data.strengths ?? null,
    weaknesses: data.weaknesses ?? null,
    recommendation: data.recommendation ?? "",
    needsReferral: data.needsReferral ?? false,
    status: "Draft",
  });

  return getEvaluationById(evaluation.id);
}

// ── Update (Draft / NeedsRevision only) ──

export async function updateEvaluation(
  id: string,
  data: UpdateMatchEvaluationDTO,
  user: AuthUser,
) {
  const evaluation = await getEvaluationById(id);

  if (!["Draft", "NeedsRevision"].includes(evaluation.status)) {
    throw new AppError(
      "Evaluation can only be edited in Draft or NeedsRevision status",
      422,
    );
  }

  if (evaluation.analystId !== user.id && user.role !== "Admin") {
    throw new AppError("Only the owning analyst can edit this evaluation", 403);
  }

  await evaluation.update(data);
  return getEvaluationById(id);
}

// ── Submit (Draft → PendingReview) ──

export async function submitEvaluation(
  id: string,
  summary: string,
  recommendation: string,
  user: AuthUser,
) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "Draft" && evaluation.status !== "NeedsRevision") {
    throw new AppError(
      "Only Draft or NeedsRevision evaluations can be submitted",
      422,
    );
  }

  if (evaluation.analystId !== user.id && user.role !== "Admin") {
    throw new AppError(
      "Only the owning analyst can submit this evaluation",
      403,
    );
  }

  const player = await Player.findByPk(evaluation.playerId, {
    attributes: ["firstName", "lastName", "firstNameAr", "lastNameAr"],
  });
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Player";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${(player as any).lastNameAr || ""}`.trim()
    : playerName;

  await evaluation.update({ status: "PendingReview", summary, recommendation });

  const approval = await createApprovalRequest({
    entityType: "matchEvaluation",
    entityId: evaluation.id,
    entityTitle: `Match Evaluation — ${playerName}`,
    entityTitleAr: `تقرير تقييم مباراة — ${playerNameAr}`,
    action: "approve",
    requestedBy: user.id,
    priority: "normal",
  });

  await evaluation.update({ approvalId: approval.id });

  return getEvaluationById(id);
}

// ── Approve (PendingReview → Approved) ──

export async function approveEvaluation(id: string, user: AuthUser) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "PendingReview") {
    throw new AppError("Only PendingReview evaluations can be approved", 422);
  }

  await evaluation.update({
    status: "Approved",
    approvedAt: new Date(),
    approvedBy: user.id,
  });

  // Notify the analyst
  createNotification({
    userId: evaluation.analystId,
    type: "system",
    title: "Evaluation Approved",
    titleAr: "تم اعتماد التقرير",
    body: "Your match evaluation has been approved.",
    bodyAr: "تم اعتماد تقرير تقييم المباراة الخاص بك.",
    link: `/dashboard/match-evaluations/${id}`,
    sourceType: "matchEvaluation",
    sourceId: id,
    priority: "normal",
  }).catch((err) =>
    logger.warn("Evaluation approval notification failed", {
      error: err.message,
    }),
  );

  return getEvaluationById(id);
}

// ── Request Revision (PendingReview → NeedsRevision) ──

export async function requestRevision(
  id: string,
  comment: string,
  user: AuthUser,
) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "PendingReview") {
    throw new AppError(
      "Only PendingReview evaluations can be sent for revision",
      422,
    );
  }

  await evaluation.update({
    status: "NeedsRevision",
    revisionComment: comment,
  });

  // Notify the analyst
  createNotification({
    userId: evaluation.analystId,
    type: "system",
    title: "Evaluation Needs Revision",
    titleAr: "التقرير يحتاج إلى مراجعة",
    body: `Comment: ${comment}`,
    bodyAr: `ملاحظة: ${comment}`,
    link: `/dashboard/match-evaluations/${id}`,
    sourceType: "matchEvaluation",
    sourceId: id,
    priority: "normal",
  }).catch((err) =>
    logger.warn("Evaluation revision notification failed", {
      error: err.message,
    }),
  );

  return getEvaluationById(id);
}

// ── Create Referral from Evaluation ──

export async function createReferralFromEvaluation(
  id: string,
  data: CreateEvaluationReferralDTO,
  user: AuthUser,
) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.referralId) {
    throw new AppError("A referral already exists for this evaluation", 409);
  }

  const referral = await Referral.create({
    referralType: data.referralType,
    playerId: evaluation.playerId,
    referralTarget: data.referralTarget ?? null,
    priority: data.priority ?? "Medium",
    dueDate: data.dueDate ?? null,
    notes: data.notes ?? null,
    triggerDesc: `Triggered from match evaluation ${id}`,
    isAutoGenerated: false,
    createdBy: user.id,
    status: "Open",
    isRestricted: data.referralType === "Mental",
    displayId: await generateDisplayId("referrals"),
  });

  await evaluation.update({ needsReferral: true, referralId: referral.id });

  // Notify Admin/Manager
  notifyByRole(["Admin", "Manager"], {
    type: "system",
    title: "New Referral from Match Evaluation",
    titleAr: "إحالة جديدة من تقرير تقييم مباراة",
    body: `Referral type: ${data.referralType}`,
    bodyAr: `نوع الإحالة: ${data.referralType}`,
    link: `/dashboard/referrals`,
    sourceType: "referral",
    sourceId: referral.id,
    priority: "normal",
  }).catch((err) =>
    logger.warn("Referral notification failed", { error: err.message }),
  );

  return getEvaluationById(id);
}

// ── Delete (Draft only) ──

export async function deleteEvaluation(id: string, user: AuthUser) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "Draft") {
    throw new AppError("Only Draft evaluations can be deleted", 422);
  }

  if (evaluation.analystId !== user.id && user.role !== "Admin") {
    throw new AppError(
      "Only the owning analyst can delete this evaluation",
      403,
    );
  }

  await evaluation.destroy();
  return { id };
}

// ── Player Performance Summary (reads from vw_player_performance_summary) ──

export interface PlayerPerformanceSummary {
  playerId: string;
  totalEvaluations: number;
  avgOverallRating: number | null;
  avgFitnessScore: number | null;
  avgTechnicalScore: number | null;
  avgTacticalScore: number | null;
  avgOffensiveScore: number | null;
  avgDefensiveScore: number | null;
  last5AvgRating: number | null;
  performanceTrend: "improving" | "declining" | "stable" | null;
  declineAlert: boolean;
}

export async function getPlayerPerformanceSummary(
  playerId: string,
): Promise<PlayerPerformanceSummary | null> {
  try {
    const rows = await sequelize.query<PlayerPerformanceSummary>(
      `SELECT * FROM vw_player_performance_summary WHERE player_id = :playerId`,
      {
        replacements: { playerId },
        type: QueryTypes.SELECT,
      },
    );
    return rows[0] ?? null;
  } catch (err: any) {
    logger.warn("getPlayerPerformanceSummary failed — view may not exist yet", {
      error: err.message,
    });
    return null;
  }
}
