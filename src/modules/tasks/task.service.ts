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
import { Op, Sequelize, literal } from 'sequelize';
import { Task } from './task.model';
import { Player } from '../players/player.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { CreateTaskInput, UpdateTaskInput } from './task.schema';

// ── Shared includes for player + assignee names ──
const TASK_INCLUDES = [
  {
    model: Player,
    as: 'player',
    attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr'],
  },
  {
    model: User,
    as: 'assignee',
    attributes: ['id', 'fullName', 'fullNameAr'],
  },
  {
    model: User,
    as: 'assigner',
    attributes: ['id', 'fullName', 'fullNameAr'],
  },
];

// ── Priority ordering (matches the old raw SQL CASE statement) ──
const PRIORITY_ORDER = literal(
  `CASE "Task"."priority" WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`
);

// ────────────────────────────────────────────────────────────
// List Tasks
// ────────────────────────────────────────────────────────────
export async function listTasks(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.priority) where.priority = queryParams.priority;
  if (queryParams.assignedTo) where.assignedTo = queryParams.assignedTo;
  if (queryParams.playerId) where.playerId = queryParams.playerId;

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: pattern } },
      { titleAr: { [Op.iLike]: pattern } },
      { description: { [Op.iLike]: pattern } },
    ];
  }

  // Default sort: priority (critical first) → due_date ascending
  // Unless the user explicitly requests a different sort
  const isDefaultSort = sort === 'createdAt' && order === 'DESC';
  const orderClause = isDefaultSort
    ? [[PRIORITY_ORDER, 'ASC'], [literal('"Task"."due_date" ASC NULLS LAST'), '']]
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
export async function getTaskById(id: string) {
  const task = await Task.findByPk(id, {
    include: TASK_INCLUDES,
  });

  if (!task) throw new AppError('Task not found', 404);
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
  const task = await Task.findByPk(id);
  if (!task) throw new AppError('Task not found', 404);

  await task.update(input);

  // Re-fetch with associations
  return getTaskById(id);
}

// ────────────────────────────────────────────────────────────
// Update Status (dedicated — handles completedAt logic)
// ────────────────────────────────────────────────────────────
export async function updateTaskStatus(id: string, status: 'Open' | 'InProgress' | 'Completed') {
  const task = await Task.findByPk(id);
  if (!task) throw new AppError('Task not found', 404);

  // Auto-set or clear completedAt based on status
  const completedAt = status === 'Completed' ? new Date() : null;
  await task.update({ status, completedAt });

  return getTaskById(id);
}

// ────────────────────────────────────────────────────────────
// Delete Task
// ────────────────────────────────────────────────────────────
export async function deleteTask(id: string) {
  const task = await Task.findByPk(id);
  if (!task) throw new AppError('Task not found', 404);

  await task.destroy();
  return { id };
}