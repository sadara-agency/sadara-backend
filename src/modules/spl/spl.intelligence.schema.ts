import { z } from "zod";

// ── Insight queries ──

export const insightQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(0).optional(),
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
    insightType: z
      .enum([
        "rising_star",
        "form_surge",
        "hidden_gem",
        "defensive_rock",
        "available_soon",
      ])
      .optional(),
    position: z.string().optional(),
    nationality: z.string().optional(),
    competitionId: z.string().uuid().optional(),
    showDismissed: z.coerce.boolean().optional(),
  }),
});

export const insightIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

// ── Tracked players ──

export const trackPlayerSchema = z.object({
  body: z.object({
    pulselivePlayerId: z.number().int().positive(),
    playerName: z.string().min(1).max(255),
    teamName: z.string().max(255).optional(),
    position: z.string().max(50).optional(),
    nationality: z.string().max(100).optional(),
    competitionId: z.string().uuid().optional(),
    alertConfig: z
      .object({
        goals_threshold: z.number().int().min(0).optional(),
        assists_threshold: z.number().int().min(0).optional(),
        period_days: z.number().int().min(7).max(90).optional(),
      })
      .optional(),
  }),
});

export const trackedPlayerIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const updateAlertConfigSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    alertConfig: z.object({
      goals_threshold: z.number().int().min(0).optional(),
      assists_threshold: z.number().int().min(0).optional(),
      period_days: z.number().int().min(7).max(90).optional(),
    }),
  }),
});

// ── Competitions ──

export const toggleCompetitionSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

// ── Config ──

export const updateConfigSchema = z.object({
  body: z
    .object({
      enabled: z.boolean().optional(),
      risingStarMaxAge: z.number().int().min(16).max(40).optional(),
      risingStarMinGoalsOrAssists: z.number().int().min(1).optional(),
      formSurgeMultiplier: z.number().min(1).max(5).optional(),
      hiddenGemMinPassAccuracy: z.number().min(50).max(100).optional(),
      hiddenGemMaxTeamPosition: z.number().int().min(1).max(20).optional(),
      defensiveRockTopPercentile: z.number().min(1).max(50).optional(),
      insightExpiryDays: z.number().int().min(1).max(90).optional(),
    })
    .partial(),
});
