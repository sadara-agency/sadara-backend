"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQuerySchema = exports.updateStatusSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.schema.ts
// Zod validation schemas for the Task module.
//
// These were previously defined inline in task.routes.ts.
// Now they're in their own file matching the player/club/user
// pattern, with proper type exports.
// ─────────────────────────────────────────────────────────────
const zod_1 = require("zod");
// ── Shared constants ──
const TASK_TYPES = ['Match', 'Contract', 'Health', 'Report', 'Offer', 'General'];
const TASK_STATUSES = ['Open', 'InProgress', 'Completed'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];
// ── Create Task ──
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    titleAr: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(TASK_TYPES).default('General'),
    priority: zod_1.z.enum(TASK_PRIORITIES).default('medium'),
    assignedTo: zod_1.z.string().uuid('Invalid user ID').optional(),
    playerId: zod_1.z.string().uuid('Invalid player ID').optional(),
    matchId: zod_1.z.string().uuid('Invalid match ID').optional(),
    contractId: zod_1.z.string().uuid('Invalid contract ID').optional(),
    dueDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    notes: zod_1.z.string().optional(),
});
// ── Update Task (partial — any field except assignedBy) ──
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    titleAr: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(TASK_TYPES).optional(),
    priority: zod_1.z.enum(TASK_PRIORITIES).optional(),
    assignedTo: zod_1.z.string().uuid('Invalid user ID').nullable().optional(),
    playerId: zod_1.z.string().uuid('Invalid player ID').nullable().optional(),
    matchId: zod_1.z.string().uuid('Invalid match ID').nullable().optional(),
    contractId: zod_1.z.string().uuid('Invalid contract ID').nullable().optional(),
    dueDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
// ── Update Status (dedicated endpoint for status transitions) ──
exports.updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(TASK_STATUSES, {
        errorMap: () => ({ message: 'Status must be Open, InProgress, or Completed' }),
    }),
});
// ── Query / List Tasks ──
exports.taskQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(TASK_STATUSES).optional(),
    type: zod_1.z.enum(TASK_TYPES).optional(),
    priority: zod_1.z.enum(TASK_PRIORITIES).optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=task.schema.js.map