import { Op } from "sequelize";
import { DevelopmentReview } from "./devReview.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateDevReviewInput,
  UpdateDevReviewInput,
  DevReviewQuery,
} from "./devReview.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function reviewIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    {
      model: User,
      as: "reviewer",
      attributes: [...USER_ATTRS],
      required: false,
    },
  ];
}

// ── Parse quarter label (Q1-2026) → date range ──

function quarterDateRange(
  quarterLabel: string,
): { startDate: Date; endDate: Date } | null {
  const match = quarterLabel.match(/^Q([1-4])-(\d{4})$/);
  if (!match) return null;
  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  const startMonth = (q - 1) * 3; // 0-indexed
  const endMonth = startMonth + 2;
  return {
    startDate: new Date(year, startMonth, 1),
    endDate: new Date(year, endMonth + 1, 0, 23, 59, 59),
  };
}

// ── List ──

export async function listDevReviews(query: DevReviewQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.reviewerId) where.reviewerId = query.reviewerId;
  if (query.status) where.status = query.status;
  if (query.quarterLabel) where.quarterLabel = query.quarterLabel;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await DevelopmentReview.findAndCountAll({
    where,
    order: [["reviewDate", "DESC"]],
    limit: query.limit,
    offset,
    include: reviewIncludes(),
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getDevReviewById(id: string) {
  const review = await DevelopmentReview.findByPk(id, {
    include: reviewIncludes(),
  });
  if (!review) throw new AppError("Development review not found", 404);
  return review;
}

// ── Create ──

export async function createDevReview(
  body: CreateDevReviewInput,
  userId: string,
) {
  const review = await DevelopmentReview.create({
    ...body,
    reviewerId: body.reviewerId ?? userId,
  });
  return getDevReviewById(review.id);
}

// ── Update ──

export async function updateDevReview(id: string, body: UpdateDevReviewInput) {
  const review = await DevelopmentReview.findByPk(id);
  if (!review) throw new AppError("Development review not found", 404);
  await review.update(body);
  return getDevReviewById(id);
}

// ── Delete ──

export async function deleteDevReview(id: string) {
  const review = await DevelopmentReview.findByPk(id);
  if (!review) throw new AppError("Development review not found", 404);
  await review.destroy();
  return { id };
}

// ── Acknowledge (player acknowledges the review) ──

export async function acknowledgeReview(id: string) {
  const review = await DevelopmentReview.findByPk(id);
  if (!review) throw new AppError("Development review not found", 404);
  if (review.status !== "submitted") {
    throw new AppError("Only submitted reviews can be acknowledged", 422);
  }
  await review.update({
    status: "acknowledged",
    playerAcknowledgedAt: new Date(),
  });
  return getDevReviewById(id);
}

// ── Submit (change from draft → submitted) ──

export async function submitReview(id: string) {
  const review = await DevelopmentReview.findByPk(id);
  if (!review) throw new AppError("Development review not found", 404);
  if (review.status !== "draft") {
    throw new AppError("Only draft reviews can be submitted", 422);
  }
  await review.update({ status: "submitted" });
  return getDevReviewById(id);
}

// ── Auto-generate template (pre-fills session feedback averages) ──

export async function generateReviewTemplate(
  playerId: string,
  quarterLabel: string,
  reviewerId: string,
): Promise<DevelopmentReview> {
  const range = quarterDateRange(quarterLabel);

  // Pull average session feedback for the quarter
  let sessionFeedbackSummary: Record<string, number | string> = {};
  try {
    // Lazy import to avoid circular dependency
    const { SessionFeedback } =
      await import("@modules/sessions/feedback/sessionFeedback.model");
    const { sequelize: seq } = await import("@config/database");
    const { QueryTypes } = await import("sequelize");

    type FeedbackAvg = {
      avg_technical: string | null;
      avg_tactical: string | null;
      avg_physical: string | null;
      avg_mental: string | null;
      avg_effort: string | null;
      avg_overall: string | null;
      count: string;
    };

    const rows = await seq.query<FeedbackAvg>(
      `SELECT
        AVG(technical_rating)::NUMERIC(4,2) AS avg_technical,
        AVG(tactical_rating)::NUMERIC(4,2) AS avg_tactical,
        AVG(physical_rating)::NUMERIC(4,2) AS avg_physical,
        AVG(mental_rating)::NUMERIC(4,2) AS avg_mental,
        AVG(effort_level)::NUMERIC(4,2) AS avg_effort,
        AVG(overall_rating)::NUMERIC(4,2) AS avg_overall,
        COUNT(*) AS count
      FROM session_feedback sf
      JOIN sessions s ON sf.session_id = s.id
      WHERE sf.player_id = :playerId
        ${range ? "AND s.session_date BETWEEN :startDate AND :endDate" : ""}`,
      {
        replacements: range
          ? { playerId, startDate: range.startDate, endDate: range.endDate }
          : { playerId },
        type: QueryTypes.SELECT,
      },
    );

    if (rows[0] && parseInt(rows[0].count) > 0) {
      const r = rows[0];
      sessionFeedbackSummary = {
        avgTechnical: r.avg_technical ? parseFloat(r.avg_technical) : 0,
        avgTactical: r.avg_tactical ? parseFloat(r.avg_tactical) : 0,
        avgPhysical: r.avg_physical ? parseFloat(r.avg_physical) : 0,
        avgMental: r.avg_mental ? parseFloat(r.avg_mental) : 0,
        avgEffort: r.avg_effort ? parseFloat(r.avg_effort) : 0,
        avgOverall: r.avg_overall ? parseFloat(r.avg_overall) : 0,
        sessionCount: parseInt(rows[0].count),
        quarterLabel,
      };
    }
  } catch {
    // Session feedback module not available — proceed without it
  }

  // Build pre-filled assessment stubs from session feedback averages
  const fb = sessionFeedbackSummary;
  const technicalAssessment = fb.avgTechnical
    ? { rating: fb.avgTechnical, source: "session_feedback" }
    : {};
  const physicalAssessment = fb.avgPhysical
    ? { rating: fb.avgPhysical, source: "session_feedback" }
    : {};
  const mentalAssessment = fb.avgMental
    ? { rating: fb.avgMental, source: "session_feedback" }
    : {};
  const tacticalAssessment = fb.avgTactical
    ? { rating: fb.avgTactical, source: "session_feedback" }
    : {};

  const reviewDate = new Date().toISOString().split("T")[0];

  const review = await DevelopmentReview.create({
    playerId,
    reviewerId,
    quarterLabel,
    reviewDate,
    technicalAssessment,
    tacticalAssessment,
    physicalAssessment,
    mentalAssessment,
    sessionFeedbackSummary: sessionFeedbackSummary as Record<string, unknown>,
    status: "draft",
  });

  return getDevReviewById(review.id);
}
