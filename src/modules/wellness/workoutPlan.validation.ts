import { z } from "zod";

const phaseRuleSchema = z.object({
  weekStart: z.number().int().min(1),
  weekEnd: z.number().int().min(1),
  weightDeltaKg: z.number().optional(),
  repsDelta: z.number().int().optional(),
  restDeltaSeconds: z.number().int().optional(),
  label: z.string().max(100).optional(),
});

const planExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  orderIndex: z.number().int().min(0).default(0),
  targetSets: z.number().int().min(1).default(3),
  targetReps: z.string().max(20).default("8-12"),
  targetWeightKg: z.number().positive().nullable().optional(),
  restSeconds: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const planDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isRest: z.boolean().default(false),
  label: z.string().max(100).nullable().optional(),
  exercises: z.array(planExerciseSchema).default([]),
});

export const createWorkoutPlanSchema = z.object({
  playerId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).nullable().optional(),
  goal: z.enum(["strength", "hypertrophy", "cardio", "recovery", "rehab"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationWeeks: z.number().int().min(1).max(52),
  status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
  phaseConfig: z.array(phaseRuleSchema).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  days: z.array(planDaySchema).min(1).max(7),
});

export const updateWorkoutPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  goal: z
    .enum(["strength", "hypertrophy", "cardio", "recovery", "rehab"])
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  phaseConfig: z.array(phaseRuleSchema).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const logSetSchema = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  actualReps: z.number().int().min(0).nullable().optional(),
  actualWeightKg: z.number().min(0).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const getWorkoutPlanSchema = z.object({
  id: z.string().uuid(),
});

export type CreateWorkoutPlanDTO = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanDTO = z.infer<typeof updateWorkoutPlanSchema>;
export type LogSetDTO = z.infer<typeof logSetSchema>;
