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
import { Task } from "@modules/tasks/task.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
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
  });

  // Re-fetch with associations for the response
  return getTaskById(task.id);
}

// ────────────────────────────────────────────────────────────
// Update Task
// ────────────────────────────────────────────────────────────
export async function updateTask(id: string, input: UpdateTaskInput) {
  const task = await findOrThrow(Task, id, "Task");

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
// Delete Task
// ────────────────────────────────────────────────────────────
export async function deleteTask(id: string) {
  return destroyById(Task, id, "Task");
}
