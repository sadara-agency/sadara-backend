// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.schema.ts
// Zod validation schemas for the Task module.
//
// These were previously defined inline in task.routes.ts.
// Now they're in their own file matching the player/club/user
// pattern, with proper type exports.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod';

// ── Shared constants ──
const TASK_TYPES = ['Match', 'Contract', 'Health', 'Report', 'Offer', 'General'] as const;
const TASK_STATUSES = ['Open', 'InProgress', 'Completed'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

// ── Create Task ──
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(TASK_TYPES).default('General'),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  assignedTo: z.string().uuid('Invalid user ID').optional(),
  playerId: z.string().uuid('Invalid player ID').optional(),
  matchId: z.string().uuid('Invalid match ID').optional(),
  contractId: z.string().uuid('Invalid contract ID').optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  notes: z.string().optional(),
});

// ── Update Task (partial — any field except assignedBy) ──
export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedTo: z.string().uuid('Invalid user ID').nullable().optional(),
  playerId: z.string().uuid('Invalid player ID').nullable().optional(),
  matchId: z.string().uuid('Invalid match ID').nullable().optional(),
  contractId: z.string().uuid('Invalid contract ID').nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Update Status (dedicated endpoint for status transitions) ──
export const updateStatusSchema = z.object({
  status: z.enum(TASK_STATUSES, {
    errorMap: () => ({ message: 'Status must be Open, InProgress, or Completed' }),
  }),
});

// ── Query / List Tasks ──
export const taskQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  type: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedTo: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
});

// ── Inferred types ──
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;