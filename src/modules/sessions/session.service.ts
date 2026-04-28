import { Op, WhereOptions } from "sequelize";
import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { Session } from "./session.model";
import { Referral } from "@modules/referrals/referral.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Journey } from "@modules/journey/journey.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Match } from "@modules/matches/match.model";
import { AppError } from "@middleware/errorHandler";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { generateDisplayId } from "@shared/utils/displayId";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { AuthUser } from "@shared/types";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionQuery,
  CoverageRadarQuery,
} from "./session.validation";
import { SESSION_OUTCOME_TAGS } from "./session.validation";

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
    {
      model: Match,
      as: "match",
      attributes: [
        "id",
        "matchDate",
        "homeTeamName",
        "awayTeamName",
        "homeScore",
        "awayScore",
        "status",
        "competition",
      ],
      required: false,
    },
  ];
}

function buildWhere(query: SessionQuery): WhereOptions {
  const where: any = {};

  if (query.playerId) where.playerId = query.playerId;
  if (query.referralId) where.referralId = query.referralId;
  if (query.matchId) where.matchId = query.matchId;
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

  if (query.outcomeTags) {
    const validTags = query.outcomeTags
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is string =>
        SESSION_OUTCOME_TAGS.includes(
          t as (typeof SESSION_OUTCOME_TAGS)[number],
        ),
      );
    if (validTags.length > 0) {
      const tagList = validTags.map((t) => `'${t}'`).join(",");
      where[Op.and] = [
        ...((where[Op.and] as unknown[]) ?? []),
        sequelize.literal(`"outcome_tags" ?| array[${tagList}]`),
      ];
    }
  }

  return where;
}

// ── List ──

export async function listSessions(query: SessionQuery, user?: AuthUser) {
  const where = buildWhere(query) as any;
  const sortField = query.sort.replace(/_([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );
  const offset = (query.page - 1) * query.limit;

  const scope = await buildRowScope("sessions", user);
  if (scope) mergeScope(where, scope);

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

export async function getSessionById(id: string, user?: AuthUser) {
  const session = await Session.findByPk(id, { include: sessionIncludes() });
  if (!session) throw new AppError("Session not found", 404);
  const ok = await checkRowAccess("sessions", session, user);
  if (!ok) throw new AppError("Session not found", 404);
  return session;
}

// ── Create ──

export async function createSession(body: CreateSessionInput, userId: string) {
  await findOrThrow(Player, body.playerId, "Player");

  let referral: Referral | null = null;
  if (body.referralId) {
    referral = await findOrThrow(Referral, body.referralId, "Referral");

    // Ensure referral belongs to the same player
    if ((referral as any).playerId !== body.playerId) {
      throw new AppError("Session player does not match referral player", 400);
    }
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

// ── Manager Dashboard ──

export async function getManagerDashboard() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Calculate week boundaries (Monday to Sunday)
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  const [
    sessionsByOwner,
    completionStats,
    thisWeekSessions,
    incompleteSessions,
    lateSessions,
  ] = await Promise.all([
    // Sessions grouped by Program Owner
    Session.findAll({
      attributes: [
        "programOwner",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [
          sequelize.literal(
            `COUNT(CASE WHEN "completion_status" = 'Completed' THEN 1 END)`,
          ),
          "completedCount",
        ],
      ],
      group: ["programOwner"],
      raw: true,
    }),

    // Completion status breakdown
    Session.findAll({
      attributes: [
        "completionStatus",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["completionStatus"],
      raw: true,
    }),

    // Sessions this week
    Session.findAll({
      where: {
        sessionDate: { [Op.between]: [weekStart, weekEnd] },
      },
      include: sessionIncludes(),
      order: [["sessionDate", "ASC"]],
      limit: 20,
    }),

    // Incomplete sessions (Scheduled status)
    Session.findAll({
      where: {
        completionStatus: { [Op.in]: ["Scheduled", "NoShow"] },
        sessionDate: { [Op.lte]: todayStr },
      },
      include: sessionIncludes(),
      order: [["sessionDate", "ASC"]],
      limit: 15,
    }),

    // Late sessions (past session date but not completed)
    Session.findAll({
      where: {
        completionStatus: { [Op.notIn]: ["Completed", "Cancelled"] },
        sessionDate: { [Op.lt]: todayStr },
      },
      include: sessionIncludes(),
      order: [["sessionDate", "ASC"]],
      limit: 15,
    }),
  ]);

  // Format sessionsByOwner response
  const formattedSessionsByOwner = (sessionsByOwner as any[]).map(
    (row: any) => ({
      programOwner: row.programOwner,
      totalSessions: parseInt(row.count) || 0,
      completedSessions: parseInt(row.completedCount) || 0,
      completionRate:
        parseInt(row.count) > 0
          ? Math.round(
              (parseInt(row.completedCount) / parseInt(row.count)) * 100,
            )
          : 0,
    }),
  );

  // Format completion status
  const completionStatusCounts = (completionStats as any[]).reduce(
    (acc: any, row: any) => {
      acc[row.completionStatus] = parseInt(row.count) || 0;
      return acc;
    },
    {},
  );

  return {
    sessionsByOwner: formattedSessionsByOwner,
    completionStatusCounts,
    thisWeekSessionsCount: thisWeekSessions.length,
    thisWeekSessions,
    incompleteSessionsCount: incompleteSessions.length,
    incompleteSessions,
    lateSessionsCount: lateSessions.length,
    lateSessions,
  };
}

// ── Session Outcome Tag Suggestions ──

const TAG_TASK_SUGGESTIONS: Record<
  string,
  { title: string; titleAr: string; priority: string; dueDays: number }
> = {
  InjuryConcern: {
    title: "Follow-up injury assessment",
    titleAr: "متابعة تقييم إصابة",
    priority: "high",
    dueDays: 2,
  },
  FatigueFlag: {
    title: "Recovery check",
    titleAr: "فحص التعافي",
    priority: "medium",
    dueDays: 3,
  },
  MentalHealthFlag: {
    title: "Mental wellness follow-up",
    titleAr: "متابعة الصحة النفسية",
    priority: "high",
    dueDays: 1,
  },
  NutritionAlert: {
    title: "Nutrition plan review",
    titleAr: "مراجعة خطة التغذية",
    priority: "medium",
    dueDays: 3,
  },
  RequiresMedicalReview: {
    title: "Schedule medical review",
    titleAr: "جدولة فحص طبي",
    priority: "critical",
    dueDays: 1,
  },
  MotivationLow: {
    title: "Motivation follow-up",
    titleAr: "متابعة التحفيز",
    priority: "medium",
    dueDays: 2,
  },
};

export async function getSessionSuggestions(id: string) {
  const session = await getSessionById(id);
  if (!session.outcomeTags || session.outcomeTags.length === 0) return [];

  return session.outcomeTags
    .filter((tag) => tag in TAG_TASK_SUGGESTIONS)
    .map((tag) => {
      const s = TAG_TASK_SUGGESTIONS[tag];
      const base = new Date(session.sessionDate);
      const due = new Date(base);
      due.setDate(base.getDate() + s.dueDays);
      return {
        tag,
        title: s.title,
        titleAr: s.titleAr,
        priority: s.priority,
        dueDate: due.toISOString().split("T")[0],
        playerId: session.playerId,
        sessionId: session.id,
      };
    });
}

// ── Coverage Radar ──

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCoverageRadar(params: CoverageRadarQuery) {
  let playerFilter = "";
  if (params.playerIds) {
    const ids = params.playerIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => UUID_PATTERN.test(id));
    if (ids.length > 0) {
      playerFilter = `AND p.id IN (${ids.map((id) => `'${id}'`).join(",")})`;
    }
  }

  const rows = await sequelize.query<{
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
    session_count: string;
  }>(
    `SELECT
       p.id,
       p.first_name,
       p.last_name,
       p.first_name_ar,
       p.last_name_ar,
       COUNT(s.id)::int AS session_count
     FROM players p
     LEFT JOIN sessions s
       ON s.player_id = p.id
       AND s.session_date >= :dateFrom
       AND s.session_date <= :dateTo
     WHERE 1=1
     ${playerFilter}
     GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     ORDER BY session_count DESC, p.last_name ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: { dateFrom: params.dateFrom, dateTo: params.dateTo },
    },
  );

  const covered = rows.filter((r) => parseInt(r.session_count) > 0);
  const uncovered = rows.filter((r) => parseInt(r.session_count) === 0);

  const toPlayerRow = (r: (typeof rows)[0]) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    firstNameAr: r.first_name_ar,
    lastNameAr: r.last_name_ar,
    sessionCount: parseInt(r.session_count),
  });

  return {
    covered: covered.map(toPlayerRow),
    uncovered: uncovered.map(toPlayerRow),
    total: rows.length,
    coveredCount: covered.length,
    uncoveredCount: uncovered.length,
    coverageRate:
      rows.length > 0 ? Math.round((covered.length / rows.length) * 100) : 0,
  };
}
