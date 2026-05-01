import { Op, UniqueConstraintError } from "sequelize";
import PlayerCoachAssignment, {
  type AssignmentStatus,
  type StaffRole,
} from "./playerCoachAssignment.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Task } from "@modules/tasks/task.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { logger } from "@config/logger";
import {
  createNotification,
  notifyByRole,
} from "@modules/notifications/notification.service";
import { createTask } from "@modules/tasks/task.service";
import { getRoleTaskTemplate } from "./roleTasks";
import type { AuthUser } from "@shared/types";
import type {
  CreateAssignmentInput,
  AssignmentQuery,
  MyAssignmentQuery,
  UpdateAssignmentStatusInput,
} from "./playerCoachAssignment.validation";
import { evictCalendarScope } from "@modules/calendar/calendarScope";

const PLAYER_INCLUDE = {
  model: Player,
  as: "player",
  attributes: [
    "id",
    "firstName",
    "lastName",
    "firstNameAr",
    "lastNameAr",
    "photoUrl",
    "position",
  ],
} as const;

const COACH_INCLUDE = {
  model: User,
  as: "coachUser",
  attributes: ["id", "fullName", "fullNameAr", "role", "email"],
} as const;

export async function listAssignments(
  query: AssignmentQuery,
  _user?: AuthUser,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
  );

  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.coachUserId) where.coachUserId = query.coachUserId;
  if (query.specialty) where.specialty = query.specialty;
  if (query.status) where.status = query.status;

  const { count, rows } = await PlayerCoachAssignment.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
    include: [PLAYER_INCLUDE as any, COACH_INCLUDE as any],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getAssignmentById(id: string, _user?: AuthUser) {
  const item = await PlayerCoachAssignment.findByPk(id, {
    include: [PLAYER_INCLUDE as any, COACH_INCLUDE as any],
  });
  if (!item) throw new AppError("Assignment not found", 404);
  return item;
}

export async function createAssignment(
  data: CreateAssignmentInput,
  createdBy: string,
) {
  const [player, coach, creator] = await Promise.all([
    Player.findByPk(data.playerId),
    User.findByPk(data.coachUserId),
    User.findByPk(createdBy),
  ]);
  if (!player) throw new AppError("Player not found", 404);
  if (!coach) throw new AppError("Staff user not found", 404);
  if (coach.role === "Player") {
    throw new AppError("Players cannot be added to a working group", 422);
  }

  let assignment: PlayerCoachAssignment;
  try {
    assignment = await PlayerCoachAssignment.create({
      playerId: data.playerId,
      coachUserId: data.coachUserId,
      specialty: data.specialty,
      priority: data.priority ?? "normal",
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      notes: data.notes ?? null,
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new AppError(
        "This person is already in this player's working group",
        409,
      );
    }
    throw err;
  }

  // Fan out fire-and-forget — never block the API response on these.
  // Mirrors the audit pattern in shared/utils/crudController.ts.
  void fanOutNewAssignment(assignment, player, coach, creator);

  // Evict calendar scope so the coach sees newly assigned player events immediately
  evictCalendarScope(data.coachUserId).catch(() => void 0);

  return assignment;
}

async function fanOutNewAssignment(
  assignment: PlayerCoachAssignment,
  player: Player,
  coach: User,
  creator: User | null,
) {
  const playerName =
    [player.firstName, player.lastName].filter(Boolean).join(" ") ||
    "this player";
  const playerNameAr =
    [(player as any).firstNameAr, (player as any).lastNameAr]
      .filter(Boolean)
      .join(" ") || playerName;

  const template = getRoleTaskTemplate(assignment.specialty as StaffRole);
  const link = `/dashboard/players/${assignment.playerId}`;
  const assignedByName = creator?.fullName ?? "A manager";

  try {
    await Promise.all([
      createNotification({
        userId: assignment.coachUserId,
        type: "task",
        priority: assignment.priority,
        title: `You've been assigned to ${playerName}`,
        titleAr: `تم تعيينك للاعب ${playerNameAr}`,
        body: `${assignedByName} added you as ${assignment.specialty}. ${template.title}.`,
        bodyAr: `أضافك ${assignedByName} بصفة ${assignment.specialty}. ${template.titleAr}.`,
        link,
        sourceType: "assignments",
        sourceId: assignment.id,
      }),
      createTask(
        {
          title: template.title,
          titleAr: template.titleAr,
          type: template.type,
          priority:
            assignment.priority === "critical"
              ? "critical"
              : assignment.priority === "high"
                ? "high"
                : assignment.priority === "low"
                  ? "low"
                  : "medium",
          assignedTo: assignment.coachUserId,
          playerId: assignment.playerId,
          dueDate: assignment.dueAt
            ? assignment.dueAt.toISOString().slice(0, 10)
            : undefined,
          assignmentId: assignment.id,
          isAutoCreated: true,
        },
        creator?.id ?? assignment.coachUserId,
      ),
    ]);
  } catch (err) {
    logger.warn("Assignment fan-out failed", {
      assignmentId: assignment.id,
      error: (err as Error).message,
    });
  }
}

export interface MyAssignmentRow {
  id: string;
  playerId: string;
  coachUserId: string;
  specialty: StaffRole;
  status: AssignmentStatus;
  priority: string;
  dueAt: Date | null;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  player: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    firstNameAr: string | null;
    lastNameAr: string | null;
    photoUrl: string | null;
    position: string | null;
  } | null;
  openTaskCount: number;
}

export async function listMyAssignments(
  userId: string,
  query: MyAssignmentQuery,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
  );

  const where: Record<string, unknown> = { coachUserId: userId };
  if (query.status && query.status.length > 0) {
    where.status =
      query.status.length === 1 ? query.status[0] : { [Op.in]: query.status };
  }
  if (query.priority && query.priority.length > 0) {
    where.priority =
      query.priority.length === 1
        ? query.priority[0]
        : { [Op.in]: query.priority };
  }
  if (query.specialty && query.specialty.length > 0) {
    where.specialty =
      query.specialty.length === 1
        ? query.specialty[0]
        : { [Op.in]: query.specialty };
  }

  // Search hits the player's name in either locale. iLike works on Postgres;
  // the service is Postgres-only (Sequelize + PG 17 per CLAUDE.md).
  const playerInclude: any = { ...PLAYER_INCLUDE, required: false };
  if (query.search) {
    const term = `%${query.search}%`;
    playerInclude.required = true;
    playerInclude.where = {
      [Op.or]: [
        { firstName: { [Op.iLike]: term } },
        { lastName: { [Op.iLike]: term } },
        { firstNameAr: { [Op.iLike]: term } },
        { lastNameAr: { [Op.iLike]: term } },
      ],
    };
  }

  const { count, rows } = await PlayerCoachAssignment.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
    include: [playerInclude],
    distinct: true,
  });

  // Open task counts per assignment in one query
  const ids = rows.map((r) => r.id);
  let countsById = new Map<string, number>();
  if (ids.length > 0) {
    const taskRows = (await Task.findAll({
      where: {
        assignmentId: { [Op.in]: ids },
        status: { [Op.in]: ["Open", "InProgress", "PendingReview"] },
      },
      attributes: ["assignmentId"],
      raw: true,
    })) as unknown as Array<{ assignmentId: string | null }>;
    countsById = taskRows.reduce((m, t) => {
      if (t.assignmentId)
        m.set(t.assignmentId, (m.get(t.assignmentId) ?? 0) + 1);
      return m;
    }, new Map<string, number>());
  }

  const data: MyAssignmentRow[] = rows.map((r) => {
    const plain = r.get({ plain: true }) as any;
    return {
      ...plain,
      openTaskCount: countsById.get(r.id) ?? 0,
    };
  });

  // Optional client-side grouping. Only the current page is grouped — the
  // page is already a coherent slice ordered by `sort`/`order`. Total counts
  // remain in `meta` for pagination.
  let groups: Record<string, MyAssignmentRow[]> | undefined;
  if (query.groupBy && query.groupBy !== "none") {
    const key = query.groupBy === "status" ? "status" : "priority";
    groups = data.reduce<Record<string, MyAssignmentRow[]>>((acc, row) => {
      const k = String(row[key as keyof MyAssignmentRow] ?? "unknown");
      (acc[k] ||= []).push(row);
      return acc;
    }, {});
  }

  return { data, meta: buildMeta(count, page, limit), groups };
}

const STATUS_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  Assigned: ["Acknowledged", "InProgress", "Completed"],
  Acknowledged: ["InProgress", "Completed"],
  InProgress: ["Completed"],
  Completed: [],
};

export async function updateAssignmentStatus(
  id: string,
  input: UpdateAssignmentStatusInput,
  user: AuthUser,
) {
  const assignment = await PlayerCoachAssignment.findByPk(id, {
    include: [PLAYER_INCLUDE as any],
  });
  if (!assignment) throw new AppError("Assignment not found", 404);

  // Only the assignee or an admin/manager/executive can move the status.
  const isAssignee = assignment.coachUserId === user.id;
  const isLeader = ["Admin", "Manager", "Executive"].includes(user.role);
  if (!isAssignee && !isLeader) {
    throw new AppError(
      "Only the assignee or a manager can update this assignment's status",
      403,
    );
  }

  const next = input.status;
  const allowed = STATUS_TRANSITIONS[assignment.status] ?? [];
  if (assignment.status !== next && !allowed.includes(next)) {
    throw new AppError(
      `Cannot transition from ${assignment.status} to ${next}`,
      422,
    );
  }

  const patch: Record<string, unknown> = { status: next };
  if (next === "Acknowledged" && !assignment.acknowledgedAt) {
    patch.acknowledgedAt = new Date();
  }
  if (next === "Completed" && !assignment.completedAt) {
    patch.completedAt = new Date();
  }

  await assignment.update(patch);

  // Notify leadership on key lifecycle events. Fire-and-forget.
  if (next === "Acknowledged" || next === "Completed") {
    const player = (assignment as any).player as Player | undefined;
    const playerName =
      player &&
      [player.firstName, player.lastName].filter(Boolean).join(" ").trim();
    const verb = next === "Acknowledged" ? "acknowledged" : "completed";
    const verbAr = next === "Acknowledged" ? "أقرّ" : "أنجز";
    void notifyByRole(["Admin", "Manager", "Executive"], {
      type: "task",
      priority: "low",
      title: `${user.fullName ?? "A staff member"} ${verb} their assignment${playerName ? ` for ${playerName}` : ""}`,
      titleAr: `${user.fullName ?? "أحد الموظفين"} ${verbAr} مهمته${playerName ? ` للاعب ${playerName}` : ""}`,
      link: `/dashboard/players/${assignment.playerId}`,
      sourceType: "assignments",
      sourceId: assignment.id,
    }).catch((err) =>
      logger.warn("Assignment status notification failed", {
        assignmentId: assignment.id,
        error: (err as Error).message,
      }),
    );
  }

  // Evict calendar scope so the new status is reflected immediately
  evictCalendarScope(assignment.coachUserId).catch(() => void 0);

  return assignment;
}

export async function deleteAssignment(id: string) {
  const item = await getAssignmentById(id);
  const { coachUserId } = item;
  await item.destroy();
  // Evict calendar scope so removed player no longer appears
  evictCalendarScope(coachUserId).catch(() => void 0);
  return { id };
}
