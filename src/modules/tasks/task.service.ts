// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.service.ts
// Business logic for Task CRUD.
//
// The old task.routes.ts had ALL logic inline with raw SQL.
// This refactors everything into clean Sequelize ORM queries
// with proper associations, keeping the same behavior:
//   - Priority-based default ordering (critical → low)
//   - Player name + assignee name via eager loading
//   - Auto-set completedAt when status → Completed
// ─────────────────────────────────────────────────────────────
import { Op, Sequelize, literal } from "sequelize";
import { Task, MediaTaskDeliverable } from "@modules/tasks/task.model";
import { generateDisplayId } from "@shared/utils/displayId";
import { Player } from "@modules/players/player.model";
import { Referral } from "@modules/referrals/referral.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { notifyByRole } from "@modules/notifications/notification.service";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow, destroyById } from "@shared/utils/serviceHelpers";
import {
  CreateTaskInput,
  UpdateTaskInput,
} from "@modules/tasks/task.validation";
import { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";

// ── Shared includes for player + assignee names ──
const TASK_INCLUDES = [
  {
    model: Player,
    as: "player",
    attributes: ["id", "firstName", "lastName", "firstNameAr", "lastNameAr"],
  },
  {
    model: User,
    as: "assignee",
    attributes: ["id", "fullName", "fullNameAr"],
  },
  {
    model: User,
    as: "assigner",
    attributes: ["id", "fullName", "fullNameAr"],
  },
];

// ── Priority ordering (matches the old raw SQL CASE statement) ──
const PRIORITY_ORDER = literal(
  `CASE "Task"."priority" WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
);

// ────────────────────────────────────────────────────────────
// List Tasks
// ────────────────────────────────────────────────────────────
export async function listTasks(queryParams: any, user?: AuthUser) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: any = {};

  // By default, only show top-level tasks (exclude sub-tasks)
  if (queryParams.parentTaskId) {
    where.parentTaskId = queryParams.parentTaskId;
  } else if (queryParams.topLevelOnly !== "false") {
    where.parentTaskId = { [Op.is]: null };
  }

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.priority) where.priority = queryParams.priority;
  if (queryParams.assignedTo) where.assignedTo = queryParams.assignedTo;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.referralId) where.referralId = queryParams.referralId;
  if (queryParams.mediaTaskType)
    where.mediaTaskType = queryParams.mediaTaskType;

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: pattern } },
      { titleAr: { [Op.iLike]: pattern } },
      { description: { [Op.iLike]: pattern } },
    ];
  }

  // Row-level scoping
  const scope = await buildRowScope("tasks", user);
  if (scope) mergeScope(where, scope);

  // Default sort: priority (critical first) → due_date ascending
  // Unless the user explicitly requests a different sort
  const isDefaultSort = sort === "createdAt" && order === "DESC";
  const orderClause = isDefaultSort
    ? [[PRIORITY_ORDER, "ASC"], [literal('"Task"."due_date" ASC NULLS LAST')]]
    : [[sort, order]];

  const { count, rows } = await Task.findAndCountAll({
    where,
    include: TASK_INCLUDES,
    limit,
    offset,
    order: orderClause as any,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get Task by ID
// ────────────────────────────────────────────────────────────
export async function getTaskById(id: string, user?: AuthUser) {
  const task = await Task.findByPk(id, {
    include: [
      ...TASK_INCLUDES,
      {
        model: Task,
        as: "subTasks",
        include: [
          {
            model: User,
            as: "assignee",
            attributes: ["id", "fullName", "fullNameAr"],
          },
        ],
        separate: true,
        order: [["sortOrder", "ASC"]],
      },
    ],
  });

  if (!task) throw new AppError("Task not found", 404);

  // Row-level access check
  const hasAccess = await checkRowAccess("tasks", task, user);
  if (!hasAccess) throw new AppError("Task not found", 404);

  return task;
}

// ────────────────────────────────────────────────────────────
// Create Task
// ────────────────────────────────────────────────────────────
export async function createTask(input: CreateTaskInput, assignedBy: string) {
  // FK checks — catch invalid references before hitting the DB constraint
  await Promise.all([
    input.assignedTo
      ? findOrThrow(User, input.assignedTo, "Assigned user")
      : null,
    input.playerId ? findOrThrow(Player, input.playerId, "Player") : null,
  ]);

  const displayId = await generateDisplayId("tasks");
  const task = await Task.create({
    title: input.title,
    titleAr: input.titleAr,
    description: input.description,
    type: input.type,
    priority: input.priority,
    assignedTo: input.assignedTo,
    assignedBy,
    playerId: input.playerId,
    matchId: input.matchId,
    contractId: input.contractId,
    dueDate: input.dueDate,
    notes: input.notes,
    displayId,
  });

  // Re-fetch with associations for the response
  return getTaskById(task.id);
}

// ────────────────────────────────────────────────────────────
// Update Task
// ────────────────────────────────────────────────────────────
export async function updateTask(id: string, input: UpdateTaskInput) {
  const task = await findOrThrow(Task, id, "Task");

  // FK checks on reassign/relink — catch invalid references before hitting the DB constraint
  await Promise.all([
    input.assignedTo
      ? findOrThrow(User, input.assignedTo, "Assigned user")
      : null,
    input.playerId ? findOrThrow(Player, input.playerId, "Player") : null,
  ]);

  await task.update(input);

  // Re-fetch with associations
  return getTaskById(id);
}

// ────────────────────────────────────────────────────────────
// Update Status (dedicated — handles completedAt logic)
// ────────────────────────────────────────────────────────────
export async function updateTaskStatus(
  id: string,
  status: "Open" | "InProgress" | "Completed" | "Canceled",
) {
  const task = await findOrThrow(Task, id, "Task");

  // Prevent completing a parent task that has open/in-progress sub-tasks
  if (status === "Completed" && !task.parentTaskId) {
    const openSubTasks = await Task.count({
      where: {
        parentTaskId: id,
        status: { [Op.in]: ["Open", "InProgress"] },
      },
    });
    if (openSubTasks > 0) {
      throw new AppError(
        "Cannot complete a task with open or in-progress sub-tasks",
        400,
      );
    }
  }

  // Auto-set or clear completedAt based on status
  const completedAt =
    status === "Completed" || status === "Canceled" ? new Date() : null;
  await task.update({ status, completedAt });

  // Sync parent status if this is a sub-task
  if (task.parentTaskId) {
    await syncParentStatus(task.parentTaskId);
  }

  return getTaskById(id);
}

// ────────────────────────────────────────────────────────────
// Create Sub-Task
// ────────────────────────────────────────────────────────────
export async function createSubTask(
  parentTaskId: string,
  input: CreateTaskInput,
  assignedBy: string,
) {
  const parent = await findOrThrow(Task, parentTaskId, "Parent task");

  // FK check for assignee
  if (input.assignedTo) {
    await findOrThrow(User, input.assignedTo, "Assigned user");
  }

  // Enforce max depth = 1 (sub-tasks cannot have their own sub-tasks)
  if (parent.parentTaskId) {
    throw new AppError("Cannot nest sub-tasks deeper than one level", 400);
  }

  // Determine sort order (append at end)
  const maxOrder = await Task.max<number, Task>("sortOrder", {
    where: { parentTaskId },
  });

  const task = await Task.create({
    title: input.title,
    titleAr: input.titleAr,
    description: input.description,
    type: input.type ?? parent.type,
    priority: input.priority ?? parent.priority,
    assignedTo: input.assignedTo,
    assignedBy,
    playerId: input.playerId ?? parent.playerId,
    matchId: input.matchId ?? parent.matchId,
    contractId: input.contractId ?? parent.contractId,
    dueDate: input.dueDate ?? parent.dueDate,
    notes: input.notes,
    parentTaskId,
    sortOrder: (maxOrder ?? 0) + 1,
  });

  // If parent is still Open, move it to InProgress
  if (parent.status === "Open") {
    await parent.update({ status: "InProgress" });
  }

  return getTaskById(task.id);
}

// ────────────────────────────────────────────────────────────
// Reorder Sub-Tasks
// ────────────────────────────────────────────────────────────
export async function reorderSubTasks(
  parentTaskId: string,
  orderedIds: string[],
) {
  await findOrThrow(Task, parentTaskId, "Parent task");

  const updates = orderedIds.map((id, index) =>
    Task.update({ sortOrder: index }, { where: { id, parentTaskId } }),
  );
  await Promise.all(updates);
}

// ────────────────────────────────────────────────────────────
// Sync Parent Status (called after sub-task status change)
// ────────────────────────────────────────────────────────────
async function syncParentStatus(parentTaskId: string) {
  const subTasks = await Task.findAll({
    where: { parentTaskId },
    attributes: ["status"],
  });

  if (subTasks.length === 0) return;

  const statuses = subTasks.map((t) => t.status);
  const parent = await Task.findByPk(parentTaskId);
  if (!parent || parent.parentTaskId) return; // Only sync top-level parents

  if (statuses.every((s) => s === "Completed")) {
    await parent.update({ status: "Completed", completedAt: new Date() });
  } else if (statuses.every((s) => s === "Canceled")) {
    await parent.update({ status: "Canceled", completedAt: new Date() });
  } else if (statuses.some((s) => s === "InProgress" || s === "Completed")) {
    if (parent.status === "Open") {
      await parent.update({ status: "InProgress" });
    }
  }
}

// ────────────────────────────────────────────────────────────
// Suggested Assignees
// Returns users already related to the task's linked entities so an admin
// reassigning doesn't have to recall a name. Priority order:
//   agent > coach > analyst > referral_owner > creator
// A user appearing in multiple roles is surfaced once with the highest-
// priority label. The task's current assignee is excluded.
// ────────────────────────────────────────────────────────────
type SuggestedRelationship =
  | "agent"
  | "coach"
  | "analyst"
  | "referral_owner"
  | "creator";

export async function getSuggestedAssignees(taskId: string, user?: AuthUser) {
  const task = await Task.findByPk(taskId, {
    attributes: ["id", "assignedTo", "assignedBy", "playerId", "referralId"],
  });
  if (!task) throw new AppError("Task not found", 404);

  const hasAccess = await checkRowAccess("tasks", task, user);
  if (!hasAccess) throw new AppError("Task not found", 404);

  const candidates: { userId: string; relationship: SuggestedRelationship }[] =
    [];

  if (task.playerId) {
    const player = await Player.findByPk(task.playerId, {
      attributes: ["id", "agentId", "coachId", "analystId"],
    });
    if (player) {
      if (player.agentId)
        candidates.push({ userId: player.agentId, relationship: "agent" });
      if (player.coachId)
        candidates.push({ userId: player.coachId, relationship: "coach" });
      if (player.analystId)
        candidates.push({ userId: player.analystId, relationship: "analyst" });
    }
  }

  if (task.referralId) {
    const referral = await Referral.findByPk(task.referralId, {
      attributes: ["id", "assignedTo"],
    });
    if (referral?.assignedTo) {
      candidates.push({
        userId: referral.assignedTo,
        relationship: "referral_owner",
      });
    }
  }

  if (task.assignedBy) {
    candidates.push({ userId: task.assignedBy, relationship: "creator" });
  }

  // Dedupe by userId (keep first = highest priority). Exclude current assignee.
  const seen = new Set<string>();
  if (task.assignedTo) seen.add(task.assignedTo);
  const unique: typeof candidates = [];
  for (const c of candidates) {
    if (!seen.has(c.userId)) {
      seen.add(c.userId);
      unique.push(c);
    }
  }

  if (unique.length === 0) return [];

  const ids = unique.map((c) => c.userId);
  const users = await User.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ["id", "fullName", "fullNameAr"],
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  // Preserve priority order; drop users that couldn't be fetched.
  return unique
    .map((c) => {
      const u = byId.get(c.userId);
      if (!u) return null;
      return {
        id: u.id,
        fullName: u.fullName,
        fullNameAr: u.fullNameAr,
        relationship: c.relationship,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ────────────────────────────────────────────────────────────
// Delete Task
// ────────────────────────────────────────────────────────────
export async function deleteTask(id: string) {
  return destroyById(Task, id, "Task");
}

// ────────────────────────────────────────────────────────────
// Add Deliverable (Media tasks)
// ────────────────────────────────────────────────────────────
export async function addDeliverable(
  taskId: string,
  userId: string,
  uploadResult: { url: string; thumbnailUrl: string | null },
  caption?: string,
): Promise<Task> {
  const task = await getTaskById(taskId);
  const deliverable: MediaTaskDeliverable = {
    url: uploadResult.url,
    thumbnailUrl: uploadResult.thumbnailUrl,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    caption: caption ?? null,
  };
  const existing = (task.deliverables as MediaTaskDeliverable[]) ?? [];
  await task.update({ deliverables: [...existing, deliverable] });

  notifyByRole(["Admin", "Manager"], {
    type: "task",
    title: "Media deliverable uploaded",
    titleAr: "تم رفع عمل إعلامي",
    body: task.title,
    link: "/dashboard/media/tasks",
    sourceType: "task",
    sourceId: task.id,
  } as any).catch(() => {});

  return task.reload();
}

// ────────────────────────────────────────────────────────────
// Remove Deliverable (Media tasks)
// ────────────────────────────────────────────────────────────
export async function removeDeliverable(
  taskId: string,
  index: number,
): Promise<Task> {
  const task = await getTaskById(taskId);
  const existing = [...((task.deliverables as MediaTaskDeliverable[]) ?? [])];
  if (index < 0 || index >= existing.length)
    throw new AppError("Deliverable not found", 404);
  existing.splice(index, 1);
  await task.update({ deliverables: existing });
  return task.reload();
}
