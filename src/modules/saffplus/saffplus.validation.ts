import { z } from "zod";

export const syncLeaguesSchema = z.object({
  saffIds: z.array(z.number().int().positive()).min(1).optional(),
  season: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Season must be YYYY-YYYY format")
    .optional(),
});

export const competitionQuerySchema = z.object({
  season: z
    .string()
    .regex(/^\d{4}-\d{4}$/)
    .optional(),
});

export const competitionIdSchema = z.object({
  competitionId: z.coerce.number().int().positive(),
});

export type SyncLeaguesInput = z.infer<typeof syncLeaguesSchema>;
export type CompetitionQuery = z.infer<typeof competitionQuerySchema>;
