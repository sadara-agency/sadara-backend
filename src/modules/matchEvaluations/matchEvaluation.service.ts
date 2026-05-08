import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { generateDisplayId } from "@shared/utils/displayId";
import { paginatedQuery } from "@shared/utils/pagination";
import {
  MatchEvaluation,
  PlayerPerformanceSummary,
  type EvalStatus,
} from "./matchEvaluation.model";
import type {
  CreateMatchEvaluationDTO,
  UpdateMatchEvaluationDTO,
  ListMatchEvaluationsDTO,
} from "./matchEvaluation.validation";

// ── Score helpers ──

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round2(n: number | null): number | null {
  return n == null ? null : Math.round(n * 100) / 100;
}

// Scale 1-5 average to 1-10 by multiplying by 2
function computeScores(data: CreateMatchEvaluationDTO) {
  const fitness = avg([
    data.fitStrength,
    data.fitSpeed,
    data.fitAgility,
    data.fitFlexibility,
    data.fitEndurance,
  ]);
  const technical = avg([
    data.techDribbling,
    data.techPassing,
    data.techInsideKick,
    data.techOutsideKick,
    data.techTrapping,
    data.techHeading,
    data.techChestControl,
    data.techThighControl,
    data.techBallAbsorption,
    data.techAssimilation,
    data.techConcentration,
    data.techQuickThinking,
    data.techCoordination,
    data.techReactionSpeed,
  ]);
  const tactical = avg([
    data.tacAttacking,
    data.tacDefending,
    data.tacPositioning,
    data.tacMovement,
    data.tacTactics,
    data.tacAssimilation,
  ]);
  const offensive = avg([
    data.conOffensive,
    data.conCrosses,
    data.conDribbles,
    data.conKeyPasses,
    data.conShots,
  ]);
  const defensive = avg([
    data.conDefensive,
    data.conTackles,
    data.conBallRecovery,
  ]);

  return {
    fitnessScore: round2(fitness != null ? fitness * 2 : null),
    technicalScore: round2(technical != null ? technical * 2 : null),
    tacticalScore: round2(tactical != null ? tactical * 2 : null),
    offensiveScore: round2(offensive != null ? offensive * 2 : null),
    defensiveScore: round2(defensive != null ? defensive * 2 : null),
  };
}

// ── Summary upsert — called after every approval ──

async function upsertPlayerSummary(playerId: string): Promise<void> {
  // Fetch all approved evals for this player, ordered by date DESC
  const evals = await MatchEvaluation.findAll({
    where: { playerId, status: "Approved" },
    attributes: [
      "overallRating",
      "fitnessScore",
      "technicalScore",
      "tacticalScore",
      "offensiveScore",
      "defensiveScore",
      "matchDate",
    ],
    order: [["createdAt", "DESC"]],
  });

  if (evals.length === 0) {
    await PlayerPerformanceSummary.upsert({
      playerId,
      evalCount: 0,
      avgOverall: null,
      avgFitness: null,
      avgTechnical: null,
      avgTactical: null,
      avgOffensive: null,
      avgDefensive: null,
      last5Avg: null,
      trend: "stable",
      lastEvalDate: null,
      updatedAt: new Date(),
    });
    return;
  }

  const nums = (arr: (number | null | undefined)[]) =>
    arr.filter((v): v is number => v != null);

  const mean = (arr: (number | null | undefined)[]) => {
    const n = nums(arr);
    return n.length ? round2(n.reduce((a, b) => a + b, 0) / n.length) : null;
  };

  const allOverall = evals.map((e) => e.overallRating);
  const last5 = evals.slice(0, 5).map((e) => e.overallRating);
  const last3 = nums(evals.slice(0, 3).map((e) => e.overallRating));
  const prev3 = nums(evals.slice(3, 6).map((e) => e.overallRating));

  let trend: "improving" | "declining" | "stable" = "stable";
  if (last3.length >= 3 && prev3.length >= 3) {
    const lastAvg = last3.reduce((a, b) => a + b, 0) / last3.length;
    const prevAvg = prev3.reduce((a, b) => a + b, 0) / prev3.length;
    const delta = lastAvg - prevAvg;
    if (delta > 0.5) trend = "improving";
    else if (delta < -0.5) trend = "declining";
  }

  await PlayerPerformanceSummary.upsert({
    playerId,
    evalCount: evals.length,
    avgOverall: mean(allOverall),
    avgFitness: mean(evals.map((e) => e.fitnessScore)),
    avgTechnical: mean(evals.map((e) => e.technicalScore)),
    avgTactical: mean(evals.map((e) => e.tacticalScore)),
    avgOffensive: mean(evals.map((e) => e.offensiveScore)),
    avgDefensive: mean(evals.map((e) => e.defensiveScore)),
    last5Avg: mean(last5),
    trend,
    lastEvalDate: evals[0]?.matchDate ?? null,
    updatedAt: new Date(),
  });
}

// ── Public service functions ──

export async function listEvaluations(query: ListMatchEvaluationsDTO) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where["playerId"] = query.playerId;
  if (query.matchId) where["matchId"] = query.matchId;
  if (query.analystId) where["analystId"] = query.analystId;
  if (query.status) where["status"] = query.status;
  if (query.dateFrom || query.dateTo) {
    where["matchDate"] = {
      ...(query.dateFrom ? { [Op.gte]: query.dateFrom } : {}),
      ...(query.dateTo ? { [Op.lte]: query.dateTo } : {}),
    };
  }

  return paginatedQuery(MatchEvaluation, query, {
    where,
    defaultSort: "createdAt",
    allowedSorts: ["createdAt", "matchDate", "overallRating", "status"],
  });
}

export async function getEvaluationById(id: string) {
  const evaluation = await MatchEvaluation.findByPk(id);
  if (!evaluation) throw new AppError("Evaluation not found", 404);
  return evaluation;
}

export async function createEvaluation(
  data: CreateMatchEvaluationDTO,
  createdBy: string,
) {
  const scores = computeScores(data);
  const displayId = await generateDisplayId("matchEvaluations");

  return MatchEvaluation.create({
    ...data,
    ...scores,
    analystId: createdBy,
    createdBy,
    status: "Draft",
    displayId,
  });
}

export async function updateEvaluation(
  id: string,
  data: UpdateMatchEvaluationDTO,
  userId: string,
) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "Draft" && evaluation.status !== "NeedsRevision") {
    throw new AppError(
      "Only Draft or NeedsRevision evaluations can be edited",
      422,
    );
  }
  if (evaluation.createdBy !== userId) {
    throw new AppError("You can only edit your own evaluations", 403);
  }

  const scores = computeScores({
    ...evaluation.toJSON(),
    ...data,
  } as CreateMatchEvaluationDTO);
  return evaluation.update({ ...data, ...scores });
}

export async function submitEvaluation(id: string, userId: string) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "Draft" && evaluation.status !== "NeedsRevision") {
    throw new AppError(
      "Only Draft or NeedsRevision evaluations can be submitted",
      422,
    );
  }
  if (evaluation.createdBy !== userId) {
    throw new AppError("You can only submit your own evaluations", 403);
  }
  if (!evaluation.summary || !evaluation.recommendation) {
    throw new AppError(
      "Summary and recommendation are required before submitting",
      422,
    );
  }

  return evaluation.update({ status: "PendingReview" });
}

export async function approveEvaluation(id: string, approverId: string) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "PendingReview") {
    throw new AppError("Only PendingReview evaluations can be approved", 422);
  }

  await evaluation.update({
    status: "Approved",
    approvedBy: approverId,
    approvedAt: new Date(),
    revisionComment: null,
  });

  // Update player performance summary asynchronously — don't block response
  upsertPlayerSummary(evaluation.playerId).catch(() => void 0);

  return evaluation;
}

export async function requestRevision(
  id: string,
  revisionComment: string,
  requesterId: string,
) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "PendingReview") {
    throw new AppError(
      "Only PendingReview evaluations can be sent for revision",
      422,
    );
  }

  return evaluation.update({ status: "NeedsRevision", revisionComment });
}

export async function deleteEvaluation(id: string, userId: string) {
  const evaluation = await getEvaluationById(id);

  if (evaluation.status !== "Draft") {
    throw new AppError("Only Draft evaluations can be deleted", 422);
  }
  if (evaluation.createdBy !== userId) {
    throw new AppError("You can only delete your own evaluations", 403);
  }

  await evaluation.destroy();
  return { id };
}

export async function getPlayerSummary(playerId: string) {
  const summary = await PlayerPerformanceSummary.findByPk(playerId);
  // Return empty summary shape if no approved evals yet
  if (!summary) {
    return {
      playerId,
      evalCount: 0,
      avgOverall: null,
      avgFitness: null,
      avgTechnical: null,
      avgTactical: null,
      avgOffensive: null,
      avgDefensive: null,
      last5Avg: null,
      trend: "stable" as const,
      lastEvalDate: null,
    };
  }
  return summary;
}

// Trend alert: returns true if player has declining rating 3 matches in a row
export async function hasDeclineAlert(playerId: string): Promise<boolean> {
  const recent = await MatchEvaluation.findAll({
    where: { playerId, status: "Approved", overallRating: { [Op.ne]: null } },
    attributes: ["overallRating"],
    order: [["createdAt", "DESC"]],
    limit: 3,
  });

  if (recent.length < 3) return false;

  const ratings = recent.map((e) => e.overallRating as number);
  return ratings[0] < ratings[1] && ratings[1] < ratings[2];
}
