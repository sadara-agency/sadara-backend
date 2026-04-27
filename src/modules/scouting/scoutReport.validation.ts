import { z } from "zod";

const rating = () => z.number().int().min(1).max(10).nullable().optional();

export const upsertScoutReportSchema = z.object({
  pace: rating(),
  strength: rating(),
  stamina: rating(),
  ballControl: rating(),
  passing: rating(),
  shooting: rating(),
  defending: rating(),
  decisionMaking: rating(),
  leadership: rating(),
  workRate: rating(),
  positioning: rating(),
  pressingScore: rating(),
  tacticalAwareness: rating(),
  overallScore: z.number().min(0).max(10).nullable().optional(),
  recommendation: z.enum(["Sign", "Monitor", "Reject"]).nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
  notesAr: z.string().max(3000).nullable().optional(),
});

export const watchlistIdParamsSchema = z.object({
  watchlistId: z.string().uuid(),
});

export type UpsertScoutReportDTO = z.infer<typeof upsertScoutReportSchema>;
