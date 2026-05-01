import { Op, WhereOptions } from "sequelize";
import { CalendarEvent, EventAttendee } from "@modules/calendar/event.model";
import { User } from "@modules/users/user.model";
import { Player } from "@modules/players/player.model";
import { Session } from "@modules/sessions/session.model";
import { Match } from "@modules/matches/match.model";
import { Task } from "@modules/tasks/task.model";
import { Referral } from "@modules/referrals/referral.model";
import { Club } from "@modules/clubs/club.model";
import { Contract } from "@modules/contracts/contract.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow, destroyById } from "@shared/utils/serviceHelpers";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import type {
  CreateEventInput,
  UpdateEventInput,
  EventQuery,
} from "@modules/calendar/event.validation";
import type { CalendarScope } from "@modules/calendar/calendarScope";
import {
  resolveTypesForRoles,
  ALL_TYPES,
} from "@modules/calendar/calendarRoleConfig";

// ── Shared includes ──
const EVENT_INCLUDES = [
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName", "fullNameAr"],
  },
  {
    model: EventAttendee,
    as: "attendees",
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
        required: false,
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "fullName", "fullNameAr"],
        required: false,
      },
    ],
  },
];

// ── List Events ──
export async function listEvents(queryParams: EventQuery) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "start_date",
  );

  const where: any = {};

  if (queryParams.eventType) where.eventType = queryParams.eventType;

  // Date range filter: events that overlap with the given range
  if (queryParams.startDate || queryParams.endDate) {
    if (queryParams.startDate && queryParams.endDate) {
      where.startDate = { [Op.lte]: new Date(queryParams.endDate) };
      where.endDate = { [Op.gte]: new Date(queryParams.startDate) };
    } else if (queryParams.startDate) {
      where.endDate = { [Op.gte]: new Date(queryParams.startDate) };
    } else if (queryParams.endDate) {
      where.startDate = { [Op.lte]: new Date(queryParams.endDate) };
    }
  }

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: pattern } },
      { titleAr: { [Op.iLike]: pattern } },
      { description: { [Op.iLike]: pattern } },
    ];
  }

  const includesForQuery = [...EVENT_INCLUDES];

  const { count, rows } = await CalendarEvent.findAndCountAll({
    where,
    include: includesForQuery,
    limit,
    offset,
    order: [[sort, order]],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Event by ID ──
export async function getEventById(id: string) {
  const event = await CalendarEvent.findByPk(id, {
    include: EVENT_INCLUDES,
  });
  if (!event) throw new AppError("Event not found", 404);
  return event;
}

// ── Create Event ──
export async function createEvent(input: CreateEventInput, createdBy: string) {
  const transaction = await sequelize.transaction();

  try {
    const event = await CalendarEvent.create(
      {
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        eventType: input.eventType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        allDay: input.allDay,
        location: input.location,
        locationAr: input.locationAr,
        color: input.color,
        recurrenceRule: input.recurrenceRule,
        reminderMinutes: input.reminderMinutes,
        timezone: input.timezone ?? "Asia/Riyadh",
        createdBy,
      },
      { transaction },
    );

    if (input.attendees?.length) {
      await EventAttendee.bulkCreate(
        input.attendees.map((a) => ({
          eventId: event.id,
          attendeeType: a.type,
          attendeeId: a.id,
        })),
        { transaction, ignoreDuplicates: true },
      );
    }

    await transaction.commit();
    return getEventById(event.id);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ── Update Event ──
export async function updateEvent(id: string, input: UpdateEventInput) {
  const event = await findOrThrow(CalendarEvent, id, "Event");

  const updateData: any = { ...input };
  delete updateData.attendees;

  if (updateData.startDate)
    updateData.startDate = new Date(updateData.startDate);
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

  const transaction = await sequelize.transaction();

  try {
    await event.update(updateData, { transaction });

    if (input.attendees !== undefined) {
      await EventAttendee.destroy({ where: { eventId: id }, transaction });
      if (input.attendees?.length) {
        await EventAttendee.bulkCreate(
          input.attendees.map((a) => ({
            eventId: id,
            attendeeType: a.type,
            attendeeId: a.id,
          })),
          { transaction, ignoreDuplicates: true },
        );
      }
    }

    await transaction.commit();
    return getEventById(id);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ── Delete Event ──
export async function deleteEvent(id: string) {
  return destroyById(CalendarEvent, id, "Event");
}

// ═══════════════════════════════════════════════════════════════
// AGGREGATED CALENDAR — merges calendar_events + sessions +
// matches + tasks + referrals into a unified response
// ═══════════════════════════════════════════════════════════════

interface CalendarItem {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  locationAr: string | null;
  color: string | null;
  sourceType: string;
  sourceId: string;
  isAutoCreated: boolean;
  isReadOnly: boolean;
  isVirtual: boolean;
  reminderMinutes: number | null;
  /** IANA timezone identifier for rrule expansion and reminder scheduling. */
  timezone: string;
  createdBy: string | null;
  meta: Record<string, unknown> | null;
  creator: { id: string; fullName: string; fullNameAr?: string } | null;
  attendees: unknown[];
  createdAt: string;
}

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
] as const;

function playerName(p: any): { en: string; ar: string } {
  if (!p) return { en: "—", ar: "—" };
  const en = `${p.firstName || ""} ${p.lastName || ""}`.trim() || "—";
  const ar =
    p.firstNameAr && p.lastNameAr
      ? `${p.firstNameAr} ${p.lastNameAr}`.trim()
      : en;
  return { en, ar };
}

function toISODate(d: string, endOfDay = false): string {
  return endOfDay ? `${d}T23:59:59` : `${d}T00:00:00`;
}

// ── Per-source scope predicates ──

function buildCalendarEventWhere(
  scope: CalendarScope,
  startRange: Date,
  endRange: Date,
  wantType?: string,
): WhereOptions {
  const base: WhereOptions = {
    startDate: { [Op.lte]: endRange },
    endDate: { [Op.gte]: startRange },
    ...(wantType &&
    !["Session", "Match", "TaskDeadline", "ReferralDeadline"].includes(wantType)
      ? { eventType: wantType }
      : {}),
  };

  if (scope.isPrivileged) return base;

  // Visibility: creator OR user attendee OR attendee is an assigned player
  const visibilityClause: WhereOptions = {
    [Op.or]: [
      { createdBy: scope.userId },
      sequelize.literal(
        `EXISTS (
          SELECT 1 FROM event_attendees ea
          WHERE ea.event_id = "CalendarEvent"."id"
            AND ea.attendee_type = 'user'
            AND ea.attendee_id = '${scope.userId}'
        )`,
      ),
      ...(scope.assignedPlayerIds.length > 0
        ? [
            sequelize.literal(
              `EXISTS (
                SELECT 1 FROM event_attendees ea
                WHERE ea.event_id = "CalendarEvent"."id"
                  AND ea.attendee_type = 'player'
                  AND ea.attendee_id IN (${scope.assignedPlayerIds.map((id) => `'${id}'`).join(",")})
              )`,
            ),
          ]
        : []),
      ...(scope.linkedPlayerId
        ? [
            sequelize.literal(
              `EXISTS (
                SELECT 1 FROM event_attendees ea
                WHERE ea.event_id = "CalendarEvent"."id"
                  AND ea.attendee_type = 'player'
                  AND ea.attendee_id = '${scope.linkedPlayerId}'
              )`,
            ),
          ]
        : []),
    ],
  };

  return { [Op.and]: [base, visibilityClause] };
}

function buildSessionWhere(
  scope: CalendarScope,
  startStr: string,
  endStr: string,
): WhereOptions | null {
  const base: WhereOptions = {
    sessionDate: { [Op.gte]: startStr, [Op.lte]: endStr },
  };

  if (scope.isPrivileged) return base;

  // Player role: see only their own sessions
  if (scope.linkedPlayerId) {
    return { ...base, playerId: scope.linkedPlayerId };
  }

  // Staff with assigned players
  if (scope.assignedPlayerIds.length > 0) {
    return {
      ...base,
      [Op.or]: [
        { responsibleId: scope.userId },
        { playerId: { [Op.in]: scope.assignedPlayerIds } },
      ],
    };
  }

  // Staff without any assigned players — only sessions they're responsible for
  return { ...base, responsibleId: scope.userId };
}

function buildMatchWhere(
  scope: CalendarScope,
  startRange: Date,
  endRange: Date,
): WhereOptions | null {
  const base: WhereOptions = {
    matchDate: { [Op.gte]: startRange, [Op.lte]: endRange },
    status: { [Op.ne]: "cancelled" },
  };

  if (scope.isPrivileged) return base;

  const lens = resolveTypesForRoles(scope.roles);
  // Roles that should see matches
  const matchVisibleRoles = [
    "Player",
    "Coach",
    "SkillCoach",
    "TacticalCoach",
    "FitnessCoach",
    "GoalkeeperCoach",
    "GymCoach",
    "Analyst",
    "Scout",
    "MentalCoach",
    "NutritionSpecialist",
  ];
  const canSeeMatches =
    lens === ALL_TYPES ||
    (Array.isArray(lens) && lens.includes("Match")) ||
    scope.roles.some((r) => matchVisibleRoles.includes(r));

  if (!canSeeMatches) return null;

  return base;
}

function buildTaskWhere(
  scope: CalendarScope,
  startStr: string,
  endStr: string,
): WhereOptions {
  const base: WhereOptions = {
    dueDate: {
      [Op.ne]: null as unknown as string,
      [Op.gte]: startStr,
      [Op.lte]: endStr,
    },
    status: { [Op.notIn]: ["Completed", "Canceled"] },
  };

  if (scope.isPrivileged) return base;

  return {
    ...base,
    [Op.or]: [{ assignedTo: scope.userId }, { assignedBy: scope.userId }],
  };
}

function buildReferralWhere(
  scope: CalendarScope,
  startStr: string,
  endStr: string,
): WhereOptions {
  const base: WhereOptions = {
    dueDate: {
      [Op.ne]: null as unknown as string,
      [Op.gte]: startStr,
      [Op.lte]: endStr,
    },
    status: { [Op.ne]: "Closed" },
  };

  if (scope.isPrivileged) return base;

  return {
    ...base,
    [Op.or]: [
      { isRestricted: false },
      { restrictedTo: { [Op.contains]: [scope.userId] } },
      { assignedTo: scope.userId },
      { createdBy: scope.userId },
    ],
  };
}

function buildContractWhere(
  scope: CalendarScope,
  startRange: Date,
  endRange: Date,
): WhereOptions | null {
  // Contracts visible only to Legal, Finance, and privileged roles
  const contractVisibleRoles = [
    "Legal",
    "Finance",
    "Admin",
    "Manager",
    "Executive",
    "SportingDirector",
  ];
  const canSeeContracts =
    scope.isPrivileged ||
    scope.roles.some((r) => contractVisibleRoles.includes(r));

  if (!canSeeContracts) {
    // Coaches can see contracts for their assigned players
    if (scope.assignedPlayerIds.length === 0) return null;
    return {
      endDate: { [Op.gte]: startRange, [Op.lte]: endRange },
      status: { [Op.notIn]: ["Terminated", "Expired"] },
      playerId: { [Op.in]: scope.assignedPlayerIds },
    };
  }

  return {
    endDate: { [Op.gte]: startRange, [Op.lte]: endRange },
    status: { [Op.notIn]: ["Terminated", "Expired"] },
  };
}

export async function listAggregatedEvents(
  queryParams: any,
  scope: CalendarScope,
) {
  const now = new Date();
  const startRange = queryParams.startDate
    ? new Date(queryParams.startDate)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endRange = queryParams.endDate
    ? new Date(queryParams.endDate)
    : new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
      );

  const startStr = startRange.toISOString().split("T")[0];
  const endStr = endRange.toISOString().split("T")[0];

  const wantSource = queryParams.sourceType as string | undefined;
  const wantType = queryParams.eventType as string | undefined;
  const search = (queryParams.search as string | undefined)?.toLowerCase();

  // Resolve role-based type lens and apply it on top of any explicit wantType
  const typeLens = resolveTypesForRoles(scope.roles);

  // Decide which sources to query based on filters + role lens
  const lensAllows = (type: string): boolean =>
    typeLens === ALL_TYPES ||
    (Array.isArray(typeLens) && typeLens.includes(type as any));

  const queryCalendar =
    (!wantSource ||
      wantSource === "calendar" ||
      wantSource === "contract" ||
      wantSource === "gate") &&
    (!wantType ||
      [
        "Training",
        "Medical",
        "ContractDeadline",
        "GateTimeline",
        "Meeting",
        "Custom",
      ].includes(wantType));
  const querySessions =
    (!wantSource || wantSource === "session") &&
    (!wantType || wantType === "Session") &&
    lensAllows("Session");
  const queryMatches =
    (!wantSource || wantSource === "match") &&
    (!wantType || wantType === "Match") &&
    lensAllows("Match");
  const queryTasks =
    (!wantSource || wantSource === "task") &&
    (!wantType || wantType === "TaskDeadline") &&
    lensAllows("TaskDeadline");
  const queryReferrals =
    (!wantSource || wantSource === "referral") &&
    (!wantType || wantType === "ReferralDeadline") &&
    lensAllows("ReferralDeadline");
  const queryContracts =
    (!wantSource || wantSource === "contract") &&
    (!wantType || wantType === "ContractDeadline") &&
    lensAllows("ContractDeadline");

  const sessionWhere = querySessions
    ? buildSessionWhere(scope, startStr, endStr)
    : null;
  const matchWhere = queryMatches
    ? buildMatchWhere(scope, startRange, endRange)
    : null;
  const contractWhere = queryContracts
    ? buildContractWhere(scope, startRange, endRange)
    : null;

  // Use allSettled so a single failing source degrades gracefully instead
  // of collapsing the whole aggregation to zero results.
  const settledResults = await Promise.allSettled([
    // 1. Calendar events
    queryCalendar
      ? CalendarEvent.findAll({
          where: buildCalendarEventWhere(scope, startRange, endRange, wantType),
          include: EVENT_INCLUDES,
          order: [["startDate", "asc"]],
        })
      : Promise.resolve([]),

    // 2. Sessions
    querySessions && sessionWhere
      ? Session.findAll({
          where: sessionWhere,
          include: [
            { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
            {
              model: User,
              as: "responsible",
              attributes: ["id", "fullName", "fullNameAr"],
            },
          ],
        })
      : Promise.resolve([]),

    // 3. Matches
    queryMatches && matchWhere
      ? Match.findAll({
          where: matchWhere,
          attributes: [
            "id",
            "matchDate",
            "venue",
            "status",
            "competition",
            "round",
            "homeTeamName",
            "awayTeamName",
          ],
        })
      : Promise.resolve([]),

    // 4. Tasks (with dueDate)
    queryTasks
      ? Task.findAll({
          where: buildTaskWhere(scope, startStr, endStr),
          include: [
            { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
            {
              model: User,
              as: "assignee",
              attributes: ["id", "fullName", "fullNameAr"],
            },
          ],
        })
      : Promise.resolve([]),

    // 5. Referrals (with dueDate, not Closed)
    queryReferrals
      ? Referral.findAll({
          where: buildReferralWhere(scope, startStr, endStr),
          include: [
            { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
            {
              model: User,
              as: "assignee",
              attributes: ["id", "fullName", "fullNameAr"],
            },
          ],
        })
      : Promise.resolve([]),

    // 6. Contracts (deadline: endDate in range)
    queryContracts && contractWhere
      ? Contract.findAll({
          where: contractWhere,
          include: [
            { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
          ],
          attributes: ["id", "startDate", "endDate", "status", "playerId"],
        })
      : Promise.resolve([]),
  ]);

  const sourceNames = [
    "calendar",
    "sessions",
    "matches",
    "tasks",
    "referrals",
    "contracts",
  ] as const;
  const unwrap = <T>(idx: number): T[] => {
    const r = settledResults[idx];
    if (r.status === "fulfilled") return r.value as T[];
    logger.error("listAggregatedEvents: source query failed", {
      source: sourceNames[idx],
      wantType,
      wantSource,
      startRange,
      endRange,
      err: r.reason instanceof Error ? r.reason.message : String(r.reason),
      stack: r.reason instanceof Error ? r.reason.stack : undefined,
    });
    return [];
  };
  const calendarResult = unwrap<any>(0);
  const sessions = unwrap<any>(1);
  const matches = unwrap<any>(2);
  const tasks = unwrap<any>(3);
  const referrals = unwrap<any>(4);
  const contracts = unwrap<any>(5);

  // ── Transform into unified CalendarItem[] ──
  let items: CalendarItem[] = [];

  // Calendar events
  for (const ev of calendarResult as any[]) {
    items.push({
      id: ev.id,
      title: ev.title,
      titleAr: ev.titleAr,
      description: ev.description,
      descriptionAr: ev.descriptionAr,
      eventType: ev.eventType,
      startDate: ev.startDate?.toISOString?.() ?? ev.startDate,
      endDate: ev.endDate?.toISOString?.() ?? ev.endDate,
      allDay: ev.allDay,
      location: ev.location,
      locationAr: ev.locationAr,
      color: ev.color,
      sourceType: ev.sourceType || "calendar",
      sourceId: ev.sourceId || ev.id,
      isAutoCreated: ev.isAutoCreated,
      isReadOnly: ev.isAutoCreated,
      isVirtual: false,
      reminderMinutes: ev.reminderMinutes,
      timezone: ev.timezone ?? "Asia/Riyadh",
      createdBy: ev.createdBy,
      meta: null,
      creator: ev.creator
        ? {
            id: ev.creator.id,
            fullName: ev.creator.fullName,
            fullNameAr: ev.creator.fullNameAr,
          }
        : null,
      attendees: ev.attendees || [],
      createdAt: ev.createdAt?.toISOString?.() ?? ev.createdAt,
    });
  }

  // Session type → Arabic label map
  const sessionTypeAr: Record<string, string> = {
    Physical: "بدني",
    Skill: "مهاري",
    Tactical: "تكتيكي",
    Mental: "نفسي",
    Nutrition: "تغذية",
    PerformanceAssessment: "تقييم أداء",
    Goalkeeper: "حراسة مرمى",
  };

  // Sessions → CalendarItem
  for (const s of sessions as any[]) {
    const pn = playerName(s.player);
    const typeAr = sessionTypeAr[s.sessionType] || s.sessionType;
    items.push({
      id: `session-${s.id}`,
      title: `${s.sessionType}: ${pn.en}`,
      titleAr: `${typeAr}: ${pn.ar}`,
      description: s.notes,
      descriptionAr: s.notesAr,
      eventType: "Session",
      startDate: toISODate(s.sessionDate),
      endDate: toISODate(s.sessionDate, true),
      allDay: true,
      location: null,
      locationAr: null,
      color: "#06B6D4",
      sourceType: "session",
      sourceId: s.id,
      isAutoCreated: false,
      isReadOnly: false,
      isVirtual: true,
      reminderMinutes: null,
      timezone: "Asia/Riyadh",
      createdBy: s.createdBy,
      meta: {
        sessionType: s.sessionType,
        programOwner: s.programOwner,
        completionStatus: s.completionStatus,
        playerId: s.playerId,
        referralId: s.referralId,
        responsibleName: s.responsible?.fullName,
      },
      creator: null,
      attendees: [],
      createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
    });
  }

  // Matches → CalendarItem
  for (const m of matches as any[]) {
    const home = m.homeTeamName || "";
    const away = m.awayTeamName || "";
    const matchStart =
      m.matchDate instanceof Date
        ? m.matchDate.toISOString()
        : new Date(m.matchDate).toISOString();
    const matchEnd = new Date(
      new Date(matchStart).getTime() + 2 * 60 * 60 * 1000,
    ).toISOString();

    const matchTitle =
      home && away ? `${home} vs ${away}` : home || away || "Match";
    const matchTitleAr =
      home && away ? `${home} ضد ${away}` : home || away || "مباراة";

    items.push({
      id: `match-${m.id}`,
      title: matchTitle,
      titleAr: matchTitleAr,
      description: [m.competition, m.round].filter(Boolean).join(" · ") || null,
      descriptionAr: null,
      eventType: "Match",
      startDate: matchStart,
      endDate: matchEnd,
      allDay: false,
      location: m.venue,
      locationAr: null,
      color: "#F97316",
      sourceType: "match",
      sourceId: m.id,
      isAutoCreated: false,
      isReadOnly: true,
      isVirtual: true,
      reminderMinutes: null,
      timezone: "Asia/Riyadh",
      createdBy: null,
      meta: {
        status: m.status,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      },
      creator: null,
      attendees: [],
      createdAt: m.createdAt?.toISOString?.() ?? "",
    });
  }

  // Tasks → CalendarItem
  for (const t of tasks as any[]) {
    items.push({
      id: `task-${t.id}`,
      title: t.title,
      titleAr: t.titleAr,
      description: t.description,
      descriptionAr: t.descriptionAr,
      eventType: "TaskDeadline",
      startDate: toISODate(t.dueDate),
      endDate: toISODate(t.dueDate, true),
      allDay: true,
      location: null,
      locationAr: null,
      color:
        t.priority === "critical"
          ? "#EF4444"
          : t.priority === "high"
            ? "#F59E0B"
            : "#EC4899",
      sourceType: "task",
      sourceId: t.id,
      isAutoCreated: false,
      isReadOnly: false,
      isVirtual: true,
      reminderMinutes: null,
      timezone: "Asia/Riyadh",
      createdBy: t.assignedBy,
      meta: {
        type: t.type,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
      },
      creator: null,
      attendees: [],
      createdAt: t.createdAt?.toISOString?.() ?? "",
    });
  }

  // Referrals → CalendarItem
  for (const r of referrals as any[]) {
    const pn = playerName(r.player);
    items.push({
      id: `referral-${r.id}`,
      title: `${r.referralType}: ${pn.en}`,
      titleAr: `${r.referralType}: ${pn.ar}`,
      description: r.triggerDesc,
      descriptionAr: null,
      eventType: "ReferralDeadline",
      startDate: toISODate(r.dueDate),
      endDate: toISODate(r.dueDate, true),
      allDay: true,
      location: null,
      locationAr: null,
      color: "#14B8A6",
      sourceType: "referral",
      sourceId: r.id,
      isAutoCreated: false,
      isReadOnly: true,
      isVirtual: true,
      reminderMinutes: null,
      timezone: "Asia/Riyadh",
      createdBy: r.createdBy,
      meta: {
        referralType: r.referralType,
        priority: r.priority,
        status: r.status,
      },
      creator: null,
      attendees: [],
      createdAt: r.createdAt?.toISOString?.() ?? "",
    });
  }

  // Contracts → CalendarItem (contract expiry deadline)
  for (const c of contracts as any[]) {
    const pn = playerName(c.player);
    const endDateStr =
      c.endDate instanceof Date
        ? c.endDate.toISOString().split("T")[0]
        : String(c.endDate ?? "");
    items.push({
      id: `contract-${c.id}`,
      title: `Contract Expiry: ${pn.en}`,
      titleAr: `انتهاء عقد: ${pn.ar}`,
      description: null,
      descriptionAr: null,
      eventType: "ContractDeadline",
      startDate: toISODate(endDateStr),
      endDate: toISODate(endDateStr, true),
      allDay: true,
      location: null,
      locationAr: null,
      color: "#8B5CF6",
      sourceType: "contract",
      sourceId: c.id,
      isAutoCreated: true,
      isReadOnly: true,
      isVirtual: true,
      reminderMinutes: null,
      timezone: "Asia/Riyadh",
      createdBy: null,
      meta: { status: c.status, playerId: c.playerId },
      creator: null,
      attendees: [],
      createdAt: c.createdAt?.toISOString?.() ?? "",
    });
  }

  // Defensive: ensure no source leaked past its eventType gate
  if (wantType) {
    items = items.filter((i) => i.eventType === wantType);
  }

  // ── Search filter ──
  let filtered = items;
  if (search) {
    filtered = items.filter(
      (i) =>
        i.title.toLowerCase().includes(search) ||
        (i.titleAr && i.titleAr.toLowerCase().includes(search)) ||
        (i.description && i.description.toLowerCase().includes(search)),
    );
  }

  // ── Sort by startDate ──
  filtered.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  // ── Paginate in memory ──
  const page = queryParams.page ?? 1;
  const limit = queryParams.limit ?? 500;
  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ── Source Detail ──
export async function getSourceDetail(sourceType: string, sourceId: string) {
  switch (sourceType) {
    case "session": {
      const s = await Session.findByPk(sourceId, {
        include: [
          { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
          {
            model: User,
            as: "responsible",
            attributes: ["id", "fullName", "fullNameAr"],
          },
        ],
      });
      if (!s) throw new AppError("Session not found", 404);
      return { sourceType, data: s };
    }
    case "match": {
      const m = await Match.findByPk(sourceId);
      if (!m) throw new AppError("Match not found", 404);
      return { sourceType, data: m };
    }
    case "task": {
      const t = await Task.findByPk(sourceId);
      if (!t) throw new AppError("Task not found", 404);
      return { sourceType, data: t };
    }
    case "referral": {
      const r = await Referral.findByPk(sourceId, {
        include: [
          { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
          {
            model: User,
            as: "assignee",
            attributes: ["id", "fullName", "fullNameAr"],
          },
        ],
      });
      if (!r) throw new AppError("Referral not found", 404);
      return { sourceType, data: r };
    }
    case "calendar":
      return { sourceType, data: await getEventById(sourceId) };
    default:
      throw new AppError(`Unknown source type: ${sourceType}`, 400);
  }
}
