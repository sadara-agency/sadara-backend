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
  nameAr: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  category: programCategoryEnum,
  estimatedMinutes: z.number().int().positive().optional(),
  durationWeeks: z.number().int().min(1).max(16).default(4),
  phase: programPhaseEnum.optional(),
  programType: programTypeEnum.default("gym"),
  trainingBlockId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateProgramSchema = createProgramSchema.partial();

export const addExerciseToProgramSchema = z.object({
  exerciseId: z.string().uuid(),
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
  trainingBlockId: z.string().uuid().optional(),
  programType: programTypeEnum.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateProgramDTO = z.infer<typeof createProgramSchema>;
export type UpdateProgramDTO = z.infer<typeof updateProgramSchema>;
export type AddExerciseToProgramDTO = z.infer<
  typeof addExerciseToProgramSchema
>;
export type ReorderExercisesDTO = z.infer<typeof reorderExercisesSchema>;
export type ListProgramsQueryDTO = z.infer<typeof listProgramsQuerySchema>;
