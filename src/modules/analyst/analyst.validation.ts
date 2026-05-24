import { z } from "zod";

export const playerIdParamSchema = z.object({
  playerId: z.string().uuid(),
});

export const kpiIdParamSchema = z.object({
  kpiId: z.string().uuid(),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

export const cycleIdParamSchema = z.object({
  cycleId: z.string().uuid(),
});

export const seasonParamSchema = z.object({
  playerId: z.string().uuid(),
  season: z
    .string()
    .regex(/^\d{4}(-\d{4})?$/, "Season must be YYYY or YYYY-YYYY"),
});

export const matchStatsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const kpiTrendQuerySchema = z.object({
  lastN: z.coerce.number().int().min(1).max(30).default(10),
});

export const compareQuerySchema = z.object({
  playerIds: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim()))
    .pipe(z.array(z.string().uuid()).min(2).max(4)),
  season: z
    .string()
    .regex(/^\d{4}(-\d{4})?$/)
    .optional(),
});

export const createKpiSchema = z.object({
  matchId: z.string().uuid(),
  pressIntensity: z.number().min(0).max(100).nullable().optional(),
  defensiveContributionPct: z.number().min(0).max(100).nullable().optional(),
  progressivePassRate: z.number().min(0).max(100).nullable().optional(),
  chancesCreatedPer90: z.number().min(0).nullable().optional(),
  xgContribution: z.number().min(0).nullable().optional(),
  territorialControl: z.number().min(0).max(100).nullable().optional(),
  counterPressSuccess: z.number().min(0).max(100).nullable().optional(),
  buildUpInvolvement: z.number().min(0).nullable().optional(),
  overallTacticalScore: z.number().min(0).max(100).nullable().optional(),
  computedBy: z.enum(["system", "manual"]).default("manual"),
  rawData: z.record(z.unknown()).optional(),
});

export const updateKpiSchema = createKpiSchema
  .omit({ matchId: true })
  .partial();

export const computeKpiSchema = z.object({
  matchId: z.string().uuid(),
});

export const upsertSeasonStatsSchema = z.object({
  matchesPlayed: z.number().int().min(0).optional(),
  minutesPlayed: z.number().int().min(0).optional(),
  goals: z.number().int().min(0).optional(),
  assists: z.number().int().min(0).optional(),
  yellowCards: z.number().int().min(0).optional(),
  redCards: z.number().int().min(0).optional(),
  passCompletionRate: z.number().min(0).max(100).optional(),
  distanceCovered: z.number().min(0).optional(),
  cleanSheets: z.number().int().min(0).optional(),
  savesMade: z.number().int().min(0).optional(),
  savePercentage: z.number().min(0).max(100).optional(),
  penaltiesSaved: z.number().int().min(0).optional(),
  goalsConceded: z.number().int().min(0).optional(),
  tacklesMade: z.number().int().min(0).optional(),
  tackleSuccessRate: z.number().min(0).max(100).optional(),
  interceptions: z.number().int().min(0).optional(),
  aerialDuelsWon: z.number().int().min(0).optional(),
  blocks: z.number().int().min(0).optional(),
  recoveries: z.number().int().min(0).optional(),
  totalTouches: z.number().int().min(0).optional(),
  passingAccuracy: z.number().min(0).max(100).optional(),
  keyPasses: z.number().int().min(0).optional(),
  chancesCreated: z.number().int().min(0).optional(),
  finalThirdPasses: z.number().int().min(0).optional(),
  progressiveCarries: z.number().int().min(0).optional(),
  ballRecoveries: z.number().int().min(0).optional(),
  shotsOnTarget: z.number().int().min(0).optional(),
  shotAccuracy: z.number().min(0).max(100).optional(),
  bigChancesConverted: z.number().int().min(0).optional(),
  bigChancesMissed: z.number().int().min(0).optional(),
  successfulDribblesRate: z.number().min(0).max(100).optional(),
  xg: z.number().min(0).optional(),
  boxTouches: z.number().int().min(0).optional(),
});

export const createSessionSchema = z.object({
  sessionType: z.enum([
    "Physical",
    "Skill",
    "Tactical",
    "Mental",
    "Nutrition",
    "PerformanceAssessment",
    "Goalkeeper",
  ]),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  summary: z.string().optional(),
  summaryAr: z.string().optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
  completionStatus: z
    .enum(["Scheduled", "Completed", "Cancelled", "NoShow"])
    .default("Scheduled"),
  rating: z.number().min(0).max(10).nullable().optional(),
  locationType: z.enum(["InPerson", "Online", "PhoneCall"]).optional(),
  outcomeTags: z.array(z.string()).optional(),
});

export const updateSessionSchema = createSessionSchema.partial();

export const createEvolutionCycleSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  tier: z.enum([
    "StrugglingTalent",
    "DevelopingPerformer",
    "MatchReadyPro",
    "PeakPerformer",
  ]),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  expectedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  targetKpis: z
    .array(
      z.object({
        metric: z.string().min(1),
        metricAr: z.string().optional(),
        baseline: z.string(),
        target: z.string(),
        current: z.string().optional(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
});

export const updateEvolutionCycleSchema = createEvolutionCycleSchema
  .partial()
  .extend({
    status: z.enum(["Active", "Completed", "Paused"]).optional(),
    blockerSummary: z.string().optional(),
    blockerSummaryAr: z.string().optional(),
    actualEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  });
