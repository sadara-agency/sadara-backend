import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createRecoveryActivitySchema = z.object({
  playerId: z.string().uuid(),
  activityDate: z.string().regex(DATE_RE, "activityDate must be YYYY-MM-DD"),

  saunaMinutes: z.number().int().min(0).optional().nullable(),
  poolMinutes: z.number().int().min(0).optional().nullable(),
  walkMinutes: z.number().int().min(0).optional().nullable(),
  coldTubMinutes: z.number().int().min(0).optional().nullable(),
  steps: z.number().int().min(0).optional().nullable(),

  notes: z.string().optional().nullable(),
});

export const updateRecoveryActivitySchema = createRecoveryActivitySchema
  .omit({ playerId: true })
  .partial();

export const listRecoveryActivityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  from: z.string().regex(DATE_RE, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(DATE_RE, "to must be YYYY-MM-DD").optional(),
});

export const getRecoveryActivitySchema = z.object({
  id: z.string().uuid(),
});

export type CreateRecoveryActivityDTO = z.infer<
  typeof createRecoveryActivitySchema
>;
export type UpdateRecoveryActivityDTO = z.infer<
  typeof updateRecoveryActivitySchema
>;
export type ListRecoveryActivityQueryDTO = z.infer<
  typeof listRecoveryActivityQuerySchema
>;
