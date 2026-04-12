import { z } from "zod";

const kpiField = z.coerce.number().optional().nullable();

export const createTacticalKpiSchema = z.object({
  playerId: z.string().uuid(),
  matchId: z.string().uuid(),
  pressIntensity: kpiField,
  defensiveContributionPct: kpiField,
  progressivePassRate: kpiField,
  chancesCreatedPer90: kpiField,
  xgContribution: kpiField,
  territorialControl: kpiField,
  counterPressSuccess: kpiField,
  buildUpInvolvement: kpiField,
  overallTacticalScore: kpiField,
  computedBy: z.enum(["system", "manual"]).default("manual"),
  rawData: z.record(z.unknown()).optional(),
});

export const updateTacticalKpiSchema = createTacticalKpiSchema
  .omit({ playerId: true, matchId: true })
  .partial();

export const tacticalKpiQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const computeKpiSchema = z.object({
  playerId: z.string().uuid(),
  matchId: z.string().uuid(),
});

export type CreateTacticalKpiInput = z.infer<typeof createTacticalKpiSchema>;
export type UpdateTacticalKpiInput = z.infer<typeof updateTacticalKpiSchema>;
export type TacticalKpiQuery = z.infer<typeof tacticalKpiQuerySchema>;
export type ComputeKpiInput = z.infer<typeof computeKpiSchema>;
