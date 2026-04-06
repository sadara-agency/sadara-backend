import { Op, WhereOptions } from "sequelize";
import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { Session } from "./session.model";
import { Referral } from "@modules/referrals/referral.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Journey } from "@modules/journey/journey.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { AppError } from "@middleware/errorHandler";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { generateDisplayId } from "@shared/utils/displayId";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionQuery,
} from "./session.validation";

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

function sessionIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    {
      model: Referral,
      as: "referral",
      attributes: [
        "id",
        "referralType",
        "referralTarget",
        "status",
        "priority",
      ],
    },
    { model: User, as: "responsible", attributes: [...USER_ATTRS] },
    { model: User, as: "creator", attributes: [...USER_ATTRS] },
    {
      model: Journey,
      as: "journeyStage",
      attributes: ["id", "stageName", "stageNameAr", "stageType", "status"],
      required: false,
    },
    {
      model: Ticket,
      as: "resultingTicket",
      attributes: ["id", "title", "titleAr", "status", "ticketType"],
      required: false,
    },
  ];
}

function buildWhere(query: SessionQuery): WhereOptions {
  const where: any = {};

  if (query.playerId) where.playerId = query.playerId;
  if (query.referralId) where.referralId = query.referralId;
  if (query.sessionType) where.sessionType = query.sessionType;
  if (query.programOwner) where.programOwner = query.programOwner;
  if (query.completionStatus) where.completionStatus = query.completionStatus;
  if (query.responsibleId) where.responsibleId = query.responsibleId;

  if (query.dateFrom || query.dateTo) {
    where.sessionDate = {};
    if (query.dateFrom) where.sessionDate[Op.gte] = query.dateFrom;
    if (query.dateTo) where.sessionDate[Op.lte] = query.dateTo;
  }

  if (query.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${query.search}%` } },
      { titleAr: { [Op.iLike]: `%${query.search}%` } },
      { summary: { [Op.iLike]: `%${query.search}%` } },
      { summaryAr: { [Op.iLike]: `%${query.search}%` } },
      { notes: { [Op.iLike]: `%${query.search}%` } },
      { notesAr: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  return where;
}

// ── List ──

export async function listSessions(query: SessionQuery) {
  const where = buildWhere(query);
  const sortField = query.sort.replace(/_([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );
  const offset = (query.page - 1) * query.limit;

  const { rows: data, count: total } = await Session.findAndCountAll({
    where,
    order: [[sortField, query.order]],
    limit: query.limit,
    offset,
    include: sessionIncludes(),
    subQuery: false,
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

export async function getSessionById(id: string) {
  const session = await Session.findByPk(id, { include: sessionIncludes() });
  if (!session) throw new AppError("Session not found", 404);
  return session;
}

// ── Create ──

export async function createSession(body: CreateSessionInput, userId: string) {
  await findOrThrow(Player, body.playerId, "Player");
  const referral = await findOrThrow(Referral, body.referralId, "Referral");

  // Ensure referral belongs to the same player
  if ((referral as any).playerId !== body.playerId) {
    throw new AppError("Session player does not match referral player", 400);
  }

  // Validate journey stage belongs to same player if provided
  if (body.journeyStageId) {
    const stage = await findOrThrow(
      Journey,
      body.journeyStageId,
      "Journey stage",
    );
    if ((stage as any).playerId !== body.playerId) {
      throw new AppError(
        "Journey stage does not belong to the same player",
        400,
      );
    }
  }

  const displayId = await generateDisplayId("sessions");

  const session = await Session.create({
    ...body,
    displayId,
    createdBy: userId,
  });

  // Increment sessionCount on the referral
  await referral.increment("sessionCount");

  return Session.findByPk(session.id, { include: sessionIncludes() });
}

// ── Update ──

export async function updateSession(id: string, body: UpdateSessionInput) {
  const session = await Session.findByPk(id);
  if (!session) throw new AppError("Session not found", 404);

  await session.update(body);
  return Session.findByPk(id, { include: sessionIncludes() });
}

// ── Delete ──

export async function deleteSession(id: string) {
  const session = await Session.findByPk(id);
  if (!session) throw new AppError("Session not found", 404);

  // Decrement sessionCount on the referral
  const referral = await Referral.findByPk(session.referralId);
  if (referral && referral.sessionCount > 0) {
    await referral.decrement("sessionCount");
  }

  await session.destroy();
  return { id };
}

// ── List by Referral ──

export async function listByReferral(referralId: string, query: SessionQuery) {
  return listSessions({ ...query, referralId });
}

// ── List by Player ──

export async function listByPlayer(playerId: string, query: SessionQuery) {
  return listSessions({ ...query, playerId });
}

// ── Stats ──

export async function getSessionStats() {
  const [byType, byStatus, byOwner] = await Promise.all([
    sequelize.query<{ session_type: string; count: string }>(
      `SELECT session_type, COUNT(*)::int AS count
       FROM sessions GROUP BY session_type ORDER BY count DESC`,
      { type: QueryTypes.SELECT },
    ),
    sequelize.query<{ completion_status: string; count: string }>(
      `SELECT completion_status, COUNT(*)::int AS count
       FROM sessions GROUP BY completion_status ORDER BY count DESC`,
      { type: QueryTypes.SELECT },
    ),
    sequelize.query<{ program_owner: string; count: string }>(
      `SELECT program_owner, COUNT(*)::int AS count
       FROM sessions GROUP BY program_owner ORDER BY count DESC`,
      { type: QueryTypes.SELECT },
    ),
  ]);

  return { byType, byStatus, byOwner };
}
