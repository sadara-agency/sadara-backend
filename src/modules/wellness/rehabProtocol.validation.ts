import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATUSES = ["active", "completed", "paused"] as const;
const FOCUS_AREAS = [
  "hamstrings",
  "quadriceps",
  "proprioception",
  "stretching",
  "glutes",
  "calves",
  "shoulders",
  "lower_back",
  "general",
] as const;
const LOAD_LEVELS = ["bodyweight", "light", "moderate", "heavy"] as const;

// ── Protocol ──

export const createRehabProtocolSchema = z.object({
  playerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional().nullable(),
  status: z.enum(STATUSES).default("active"),
  injuryId: z.string().uuid().optional().nullable(),
  clearanceRequired: z.boolean().default(false),
  startDate: z.string().regex(DATE_RE).optional().nullable(),
  targetEndDate: z.string().regex(DATE_RE).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateRehabProtocolSchema = createRehabProtocolSchema
  .omit({ playerId: true })
  .partial();

export const listRehabProtocolsQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const protocolIdParamSchema = z.object({ id: z.string().uuid() });

// ── Phase ──

export const createRehabPhaseSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional().nullable(),
  orderIndex: z.number().int().min(0).default(0),
  focusArea: z.enum(FOCUS_AREAS).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateRehabPhaseSchema = createRehabPhaseSchema.partial();

export const phaseParamSchema = z.object({
  id: z.string().uuid(),
  phaseId: z.string().uuid(),
});

// ── Phase Exercise ──

export const createRehabPhaseExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  orderIndex: z.number().int().min(0).default(0),
  targetSets: z.number().int().positive().default(3),
  targetReps: z.string().min(1).max(20).default("10"),
  targetWeightKg: z.number().positive().optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  loadLevel: z.enum(LOAD_LEVELS).default("bodyweight"),
  caution: z.boolean().default(false),
  cautionNote: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateRehabPhaseExerciseSchema = createRehabPhaseExerciseSchema
  .omit({ exerciseId: true })
  .partial();

export const exerciseParamSchema = z.object({
  id: z.string().uuid(),
  phaseId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});

// ── Clearance ──

export const grantClearanceSchema = z.object({});

// ── Types ──

export type CreateRehabProtocolDTO = z.infer<typeof createRehabProtocolSchema>;
export type UpdateRehabProtocolDTO = z.infer<typeof updateRehabProtocolSchema>;
export type ListRehabProtocolsQueryDTO = z.infer<
  typeof listRehabProtocolsQuerySchema
>;
export type CreateRehabPhaseDTO = z.infer<typeof createRehabPhaseSchema>;
export type UpdateRehabPhaseDTO = z.infer<typeof updateRehabPhaseSchema>;
export type CreateRehabPhaseExerciseDTO = z.infer<
  typeof createRehabPhaseExerciseSchema
>;
export type UpdateRehabPhaseExerciseDTO = z.infer<
  typeof updateRehabPhaseExerciseSchema
>;
