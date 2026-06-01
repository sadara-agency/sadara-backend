import { z } from "zod";

export const programCategoryEnum = z.enum([
  "strength",
  "hypertrophy",
  "cardio",
  "recovery",
  "mixed",
]);

export const programPhaseEnum = z.enum([
  "accumulation",
  "intensification",
  "realization",
  "mixed",
]);

export const programTypeEnum = z.enum([
  "gym",
  "field",
  "rehab",
  "recovery",
  "mixed",
]);

export const createProgramSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).nullish(),
  description: z.string().max(2000).nullish(),
  category: programCategoryEnum,
  estimatedMinutes: z.number().int().positive().nullish(),
  durationWeeks: z.number().int().min(1).max(16).default(4),
  phase: programPhaseEnum.nullish(),
  programType: programTypeEnum.default("gym"),
  playerId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  isTemplate: z.boolean().optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

export const cloneProgramSchema = z.object({
  playerId: z.string().uuid().nullish(),
  asTemplate: z.boolean().default(false),
});

export const updateExerciseSchema = z.object({
  targetSets: z.number().int().positive().optional(),
  targetReps: z.string().min(1).max(20).optional(),
  targetWeightKg: z.number().positive().nullish(),
  restSeconds: z.number().int().positive().nullish(),
  notes: z.string().max(500).nullish(),
});

export const addExerciseToProgramSchema = z.object({
  exerciseId: z.string().uuid(),
  daySessionId: z.string().uuid().optional(),
  orderIndex: z.number().int().min(0).optional(),
  targetSets: z.number().int().positive().optional(),
  targetReps: z.string().max(20).optional(),
  targetWeightKg: z.number().positive().optional(),
  restSeconds: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const reorderExercisesSchema = z.object({
  orderedExerciseIds: z.array(z.string().uuid()).min(1),
});

export const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  programType: programTypeEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  playerId: z.string().uuid().optional(),
  isTemplate: z.coerce.boolean().optional(),
});

export type CreateProgramDTO = z.infer<typeof createProgramSchema>;
export type UpdateProgramDTO = z.infer<typeof updateProgramSchema>;
export type CloneProgramDTO = z.infer<typeof cloneProgramSchema>;
export type UpdateExerciseDTO = z.infer<typeof updateExerciseSchema>;
export type AddExerciseToProgramDTO = z.infer<
  typeof addExerciseToProgramSchema
>;
export type ReorderExercisesDTO = z.infer<typeof reorderExercisesSchema>;
export type ListProgramsQueryDTO = z.infer<typeof listProgramsQuerySchema>;

// ── DaySession schemas ──

export const createDaySessionSchema = z.object({
  label: z.string().min(1).max(100),
  labelAr: z.string().max(100).nullish(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  orderIndex: z.number().int().min(0).optional(),
  estimatedMinutes: z.number().int().positive().nullish(),
  notes: z.string().max(1000).optional(),
});

export const updateDaySessionSchema = createDaySessionSchema.partial();

export const daySessionParamsSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export type CreateDaySessionDTO = z.infer<typeof createDaySessionSchema>;
export type UpdateDaySessionDTO = z.infer<typeof updateDaySessionSchema>;
