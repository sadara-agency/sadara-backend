import { Op, WhereOptions } from "sequelize";
import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { SessionFeedback } from "./sessionFeedback.model";
import { Session } from "../session.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateSessionFeedbackInput,
  UpdateSessionFeedbackInput,
  FeedbackQuery,
} from "./sessionFeedback.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
  "position",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function feedbackIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "coach", attributes: [...USER_ATTRS] },
    {
      model: Session,
      as: "session",
      attributes: [
        "id",
        "sessionType",
        "programOwner",
        "sessionDate",
        "title",
        "titleAr",
        "completionStatus",
      ],
    },
  ];
}

// ── List feedback for a session ──

export async function listBySession(sessionId: string, query: FeedbackQuery) {
  const session = await Session.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);

  const where: WhereOptions = { sessionId };
  if (query.coachId) (where as any).coachId = query.coachId;

  const offset = (query.page - 1) * query.limit;
  const { rows: data, count: total } = await SessionFeedback.findAndCountAll({
    where,
    order: [
      [query.sort === "session_date" ? "createdAt" : query.sort, query.order],
    ],
    limit: query.limit,
    offset,
    include: feedbackIncludes(),
  });

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getFeedbackById(id: string) {
  const feedback = await SessionFeedback.findByPk(id, {
    include: feedbackIncludes(),
  });
  if (!feedback) throw new AppError("Session feedback not found", 404);
  return feedback;
}

// ── Create ──

export async function createFeedback(
  sessionId: string,
  body: CreateSessionFeedbackInput,
  userId: string,
) {
  const session = await Session.findByPk(sessionId);
  if (!session) throw new AppError("Session not found", 404);

  // Check for duplicate feedback by same coach
  const existing = await SessionFeedback.findOne({
    where: { sessionId, coachId: userId },
  });
  if (existing) {
    throw new AppError(
      "You have already submitted feedback for this session",
      409,
    );
  }

  const feedback = await SessionFeedback.create({
    ...body,
    sessionId,
    playerId: session.playerId,
    coachId: userId,
  });

  return SessionFeedback.findByPk(feedback.id, {
    include: feedbackIncludes(),
  });
}

// ── Update ──

export async function updateFeedback(
  id: string,
  body: UpdateSessionFeedbackInput,
) {
  const feedback = await SessionFeedback.findByPk(id);
  if (!feedback) throw new AppError("Session feedback not found", 404);

  await feedback.update(body);
  return SessionFeedback.findByPk(id, { include: feedbackIncludes() });
}

// ── Delete ──

export async function deleteFeedback(id: string) {
  const feedback = await SessionFeedback.findByPk(id);
  if (!feedback) throw new AppError("Session feedback not found", 404);

  await feedback.destroy();
  return { id };
}

// ── Player Feedback Summary ──

export async function getPlayerFeedbackSummary(
  playerId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const dateFilter =
    dateFrom || dateTo
      ? `AND s.session_date ${dateFrom ? `>= '${dateFrom}'` : ""} ${dateFrom && dateTo ? "AND" : ""} ${dateTo ? `s.session_date <= '${dateTo}'` : ""}`
      : "";

  const [summary] = await sequelize.query<{
    total_feedback: number;
    avg_technical: number;
    avg_tactical: number;
    avg_physical: number;
    avg_mental: number;
    avg_overall: number;
    avg_effort: number;
    avg_attitude: number;
  }>(
    `SELECT
       COUNT(sf.id)::int AS total_feedback,
       ROUND(AVG(sf.technical_rating), 1) AS avg_technical,
       ROUND(AVG(sf.tactical_rating), 1) AS avg_tactical,
       ROUND(AVG(sf.physical_rating), 1) AS avg_physical,
       ROUND(AVG(sf.mental_rating), 1) AS avg_mental,
       ROUND(AVG(sf.overall_rating), 1) AS avg_overall,
       ROUND(AVG(sf.effort_level), 1) AS avg_effort,
       ROUND(AVG(sf.attitude_rating), 1) AS avg_attitude
     FROM session_feedback sf
     JOIN sessions s ON s.id = sf.session_id
     WHERE sf.player_id = :playerId
     ${dateFilter}`,
    {
      replacements: { playerId },
      type: QueryTypes.SELECT,
    },
  );

  const bySessionType = await sequelize.query<{
    session_type: string;
    count: number;
    avg_overall: number;
  }>(
    `SELECT
       s.session_type,
       COUNT(sf.id)::int AS count,
       ROUND(AVG(sf.overall_rating), 1) AS avg_overall
     FROM session_feedback sf
     JOIN sessions s ON s.id = sf.session_id
     WHERE sf.player_id = :playerId
     ${dateFilter}
     GROUP BY s.session_type
     ORDER BY count DESC`,
    {
      replacements: { playerId },
      type: QueryTypes.SELECT,
    },
  );

  return { summary, bySessionType };
}
