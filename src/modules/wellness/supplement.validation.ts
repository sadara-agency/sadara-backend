import { z } from "zod";

const UNITS = ["g", "mg", "IU", "ml"] as const;
const TIMINGS = [
  "morning",
  "pre_workout",
  "during_workout",
  "post_workout",
  "with_meal",
  "evening",
  "bedtime",
] as const;
const PRIORITIES = ["essential", "recommended", "optional"] as const;

export const createSupplementSchema = z.object({
  playerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional().nullable(),
  dose: z.number().positive(),
  unit: z.enum(UNITS),
  timing: z.enum(TIMINGS),
  priority: z.enum(PRIORITIES).default("recommended"),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateSupplementSchema = createSupplementSchema
  .omit({ playerId: true })
  .partial();

export const listSupplementsQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const getSupplementSchema = z.object({
  id: z.string().uuid(),
});

export type CreateSupplementDTO = z.infer<typeof createSupplementSchema>;
export type UpdateSupplementDTO = z.infer<typeof updateSupplementSchema>;
export type ListSupplementsQueryDTO = z.infer<
  typeof listSupplementsQuerySchema
>;
