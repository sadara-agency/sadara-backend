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
