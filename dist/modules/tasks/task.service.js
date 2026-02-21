"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTasks = listTasks;
exports.getTaskById = getTaskById;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.updateTaskStatus = updateTaskStatus;
exports.deleteTask = deleteTask;
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
const sequelize_1 = require("sequelize");
const task_model_1 = require("./task.model");
const player_model_1 = require("../players/player.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
// ── Shared includes for player + assignee names ──
const TASK_INCLUDES = [
    {
        model: player_model_1.Player,
        as: 'player',
        attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr'],
    },
    {
        model: user_model_1.User,
        as: 'assignee',
        attributes: ['id', 'fullName', 'fullNameAr'],
    },
    {
        model: user_model_1.User,
        as: 'assigner',
        attributes: ['id', 'fullName', 'fullNameAr'],
    },
];
// ── Priority ordering (matches the old raw SQL CASE statement) ──
const PRIORITY_ORDER = (0, sequelize_1.literal)(`CASE "Task"."priority" WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`);
// ────────────────────────────────────────────────────────────
// List Tasks
// ────────────────────────────────────────────────────────────
async function listTasks(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.type)
        where.type = queryParams.type;
    if (queryParams.priority)
        where.priority = queryParams.priority;
    if (queryParams.assignedTo)
        where.assignedTo = queryParams.assignedTo;
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (search) {
        const pattern = `%${search}%`;
        where[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.iLike]: pattern } },
            { titleAr: { [sequelize_1.Op.iLike]: pattern } },
            { description: { [sequelize_1.Op.iLike]: pattern } },
        ];
    }
    // Default sort: priority (critical first) → due_date ascending
    // Unless the user explicitly requests a different sort
    const isDefaultSort = sort === 'createdAt' && order === 'DESC';
    const orderClause = isDefaultSort
        ? [[PRIORITY_ORDER, 'ASC'], [(0, sequelize_1.literal)('"Task"."due_date" ASC NULLS LAST'), '']]
        : [[sort, order]];
    const { count, rows } = await task_model_1.Task.findAndCountAll({
        where,
        include: TASK_INCLUDES,
        limit,
        offset,
        order: orderClause,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ────────────────────────────────────────────────────────────
// Get Task by ID
// ────────────────────────────────────────────────────────────
async function getTaskById(id) {
    const task = await task_model_1.Task.findByPk(id, {
        include: TASK_INCLUDES,
    });
    if (!task)
        throw new errorHandler_1.AppError('Task not found', 404);
    return task;
}
// ────────────────────────────────────────────────────────────
// Create Task
// ────────────────────────────────────────────────────────────
async function createTask(input, assignedBy) {
    const task = await task_model_1.Task.create({
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
async function updateTask(id, input) {
    const task = await task_model_1.Task.findByPk(id);
    if (!task)
        throw new errorHandler_1.AppError('Task not found', 404);
    await task.update(input);
    // Re-fetch with associations
    return getTaskById(id);
}
// ────────────────────────────────────────────────────────────
// Update Status (dedicated — handles completedAt logic)
// ────────────────────────────────────────────────────────────
async function updateTaskStatus(id, status) {
    const task = await task_model_1.Task.findByPk(id);
    if (!task)
        throw new errorHandler_1.AppError('Task not found', 404);
    // Auto-set or clear completedAt based on status
    const completedAt = status === 'Completed' ? new Date() : null;
    await task.update({ status, completedAt });
    return getTaskById(id);
}
// ────────────────────────────────────────────────────────────
// Delete Task
// ────────────────────────────────────────────────────────────
async function deleteTask(id) {
    const task = await task_model_1.Task.findByPk(id);
    if (!task)
        throw new errorHandler_1.AppError('Task not found', 404);
    await task.destroy();
    return { id };
}
//# sourceMappingURL=task.service.js.map