import { z } from "zod";

const PERIOD_TYPES = [
  "pre-season",
  "in-season",
  "off-season",
  "rehab",
] as const;
const PLAN_STATUSES = ["draft", "active", "completed", "archived"] as const;
const INTENSITIES = ["low", "moderate", "high", "peak", "recovery"] as const;

export const createTrainingPlanSchema = z.object({
  playerId: z.string().uuid(),
  title: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  position: z.string().max(50).optional(),
  periodType: z.enum(PERIOD_TYPES).default("in-season"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weeklyHours: z.number().positive().max(168).optional(),
  goals: z.record(z.unknown()).optional(),
  status: z.enum(PLAN_STATUSES).default("active"),
  notes: z.string().optional(),
});

export const updateTrainingPlanSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  titleAr: z.string().max(255).optional(),
  position: z.string().max(50).optional(),
  periodType: z.enum(PERIOD_TYPES).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  weeklyHours: z.number().positive().max(168).optional(),
  goals: z.record(z.unknown()).optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  notes: z.string().optional(),
});

export const trainingPlanQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  periodType: z.enum(PERIOD_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export const upsertWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  theme: z.string().max(255).optional(),
  themeAr: z.string().max(255).optional(),
  intensity: z.enum(INTENSITIES).default("moderate"),
  workoutTemplateIds: z.array(z.string().uuid()).optional(),
  sessionIds: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
});

export const logProgressSchema = z.object({
  weekNumber: z.number().int().positive(),
  completionPct: z.number().min(0).max(100),
  coachNotes: z.string().optional(),
  playerFeedback: z.string().optional(),
  adjustmentsMade: z.string().optional(),
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateTrainingPlanInput = z.infer<typeof createTrainingPlanSchema>;
export type UpdateTrainingPlanInput = z.infer<typeof updateTrainingPlanSchema>;
export type TrainingPlanQuery = z.infer<typeof trainingPlanQuerySchema>;
export const trainingPlanParamSchema = z.object({ id: z.string().uuid() });
export const playerParamSchema = z.object({ playerId: z.string().uuid() });

export type UpsertWeekInput = z.infer<typeof upsertWeekSchema>;
export type LogProgressInput = z.infer<typeof logProgressSchema>;
