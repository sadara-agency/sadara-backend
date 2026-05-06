import { z } from "zod";

const PROGRESS_MODES = [
  "task_count",
  "manual_percent",
  "numeric_target",
] as const;
const GOAL_STATUSES = ["active", "completed", "archived"] as const;
const TASK_STATUSES = [
  "Open",
  "InProgress",
  "Done",
  "Skipped",
  "Abandoned",
] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
const ROLLOVER_POLICIES = ["auto", "ask", "none"] as const;

// ── Goal schemas ──

export const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  titleAr: z.string().max(500).optional(),
  description: z.string().optional(),
  targetMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "targetMonth must be YYYY-MM"),
  progressMode: z.enum(PROGRESS_MODES).default("task_count"),
  targetValue: z.number().positive().optional(),
  manualPercent: z.number().int().min(0).max(100).optional(),
  color: z.string().max(20).optional(),
});

export const updateGoalSchema = z
  .object({
    title: z.string().min(1).max(500),
    titleAr: z.string().max(500).optional(),
    description: z.string().optional(),
    targetMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "targetMonth must be YYYY-MM"),
    progressMode: z.enum(PROGRESS_MODES),
    targetValue: z.number().positive().optional(),
    currentValue: z.number().min(0).optional(),
    manualPercent: z.number().int().min(0).max(100).optional(),
    color: z.string().max(20).optional(),
    status: z.enum(GOAL_STATUSES),
    sortOrder: z.number().int().min(0),
  })
  .partial();

export const getGoalSchema = z.object({
  id: z.string().uuid(),
});

export const listGoalsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Task schemas ──

export const createTaskSchema = z.object({
  goalId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  titleAr: z.string().max(500).optional(),
  notes: z.string().optional(),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD"),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "dueTime must be HH:MM or HH:MM:SS")
    .optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  timezone: z.string().max(64).default("Asia/Riyadh"),
  rolloverPolicy: z.enum(ROLLOVER_POLICIES).default("ask"),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateTaskSchema = z
  .object({
    goalId: z.string().uuid().nullable(),
    title: z.string().min(1).max(500),
    titleAr: z.string().max(500),
    notes: z.string(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueTime: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable(),
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
    timezone: z.string().max(64),
    rolloverPolicy: z.enum(ROLLOVER_POLICIES),
    sortOrder: z.number().int().min(0),
    tags: z.array(z.string().max(50)).max(10),
  })
  .partial();

export const getTaskSchema = z.object({
  id: z.string().uuid(),
});

export const listTasksQuerySchema = z.object({
  goalId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  needsRolloverDecision: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const rolloverDecisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["keep", "reschedule", "skip"]),
  newDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ── Types ──

export type CreateGoalDTO = z.infer<typeof createGoalSchema>;
export type UpdateGoalDTO = z.infer<typeof updateGoalSchema>;
export type CreateTaskDTO = z.infer<typeof createTaskSchema>;
export type UpdateTaskDTO = z.infer<typeof updateTaskSchema>;
export type RolloverDecisionDTO = z.infer<typeof rolloverDecisionSchema>;
