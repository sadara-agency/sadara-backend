import { z } from "zod";

const nonNegInt = z.number().int().min(0).optional();
const pct = z.number().min(0).max(100).optional();

export const upsertPlayerSeasonStatsSchema = z.object({
  matchesPlayed: nonNegInt,
  minutesPlayed: nonNegInt,
  goals: nonNegInt,
  assists: nonNegInt,
  yellowCards: nonNegInt,
  redCards: nonNegInt,
  passCompletionRate: pct,
  distanceCovered: z.number().min(0).optional(),
  cleanSheets: nonNegInt,
  savesMade: nonNegInt,
  savePercentage: pct,
  penaltiesSaved: nonNegInt,
  goalsConceded: nonNegInt,
  accurateLongBalls: nonNegInt,
  clearances: nonNegInt,
  tacklesMade: nonNegInt,
  tackleSuccessRate: pct,
  interceptions: nonNegInt,
  aerialDuelsWon: nonNegInt,
  blocks: nonNegInt,
  recoveries: nonNegInt,
  totalTouches: nonNegInt,
  passingAccuracy: pct,
  keyPasses: nonNegInt,
  chancesCreated: nonNegInt,
  finalThirdPasses: nonNegInt,
  progressiveCarries: nonNegInt,
  ballRecoveries: nonNegInt,
  shotsOnTarget: nonNegInt,
  shotAccuracy: pct,
  bigChancesConverted: nonNegInt,
  bigChancesMissed: nonNegInt,
  successfulDribblesRate: pct,
  xg: z.number().min(0).max(20).optional(),
  boxTouches: nonNegInt,
});

const rating = z.number().min(0).max(10).optional();

export const applyMatchToSeasonSchema = z.object({
  matchId: z.string().uuid(),
  stats: z.object({
    minutesPlayed: nonNegInt,
    goals: nonNegInt,
    assists: nonNegInt,
    shotsTotal: nonNegInt,
    shotsOnTarget: nonNegInt,
    yellowCards: nonNegInt,
    redCards: nonNegInt,
    rating,
    tacklesTotal: nonNegInt,
    keyPasses: nonNegInt,
    interceptions: nonNegInt,
    saves: nonNegInt,
    cleanSheet: z.boolean().optional(),
    goalsConceded: nonNegInt,
    penaltiesSaved: nonNegInt,
  }),
});

// ── Envelope schema for the redesigned, accountable edit flow ──
// Body carries only changed fields + mandatory justification + optional match link.
// Field-level value rules (negative, percent range, lower-than-current) are enforced
// in the service against the canonical field map, since they need the stored value.
export const seasonStatsEditSchema = z
  .object({
    changes: z.record(z.string(), z.number()),
    matchId: z.string().uuid().optional(),
    justification: z.string().trim().min(10),
    isCorrection: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (Object.keys(val.changes).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changes"],
        message: "At least one field must be changed",
      });
    }
    if (val.isCorrection && val.justification.trim().length < 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["justification"],
        message:
          "Corrections require a justification of at least 30 characters",
      });
    }
  });

export const editHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  fieldName: z.string().optional(),
  matchId: z.string().uuid().optional(),
  isCorrection: z.coerce.boolean().optional(),
});

export const seasonParamSchema = z.object({
  playerId: z.string().uuid(),
  season: z.string().min(4).max(10),
});

export const playerIdParamSchema = z.object({
  playerId: z.string().uuid(),
});

export type UpsertPlayerSeasonStatsDTO = z.infer<
  typeof upsertPlayerSeasonStatsSchema
>;

export type ApplyMatchToSeasonDTO = z.infer<typeof applyMatchToSeasonSchema>;

export type SeasonStatsEditDTO = z.infer<typeof seasonStatsEditSchema>;

export type EditHistoryQueryDTO = z.infer<typeof editHistoryQuerySchema>;
