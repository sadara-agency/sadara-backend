// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.schema.ts
// ─────────────────────────────────────────────────────────────

import { z } from "zod";

export const syncPlayerSchema = z.object({
  splPlayerId: z.string().regex(/^\d+$/, "SPL player ID must be numeric"),
  slug: z.string().optional(),
});

export const syncTeamSchema = z.object({
  splTeamId: z.string().regex(/^\d+$/, "SPL team ID must be numeric"),
});

export const syncAllSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Set confirm: true to sync all 18 teams" }),
  }),
});

export const seedClubIdsSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Set confirm: true to seed club IDs" }),
  }),
});

// ── PulseLive endpoints ──

const VALID_STATS = [
  "goals",
  "goal_assist",
  "total_pass",
  "appearances",
  "saves",
  "clean_sheet",
  "red_card",
  "yellow_card",
  "total_tackle",
  "interceptions_won",
  "aerial_won",
  "total_scoring_att",
] as const;

export const standingsQuerySchema = z.object({
  seasonId: z.coerce.number().int().positive().optional(),
});

export const leaderboardParamsSchema = z.object({
  stat: z.enum(VALID_STATS),
});

export const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  seasonId: z.coerce.number().int().positive().optional(),
});

export const playerDetailedStatsParamsSchema = z.object({
  id: z.string().uuid(),
});

export const playerDetailedStatsQuerySchema = z.object({
  seasonId: z.coerce.number().int().positive().optional(),
});

export const teamStatsParamsSchema = z.object({
  teamId: z.coerce.number().int().positive(),
});

export const teamStatsQuerySchema = z.object({
  seasonId: z.coerce.number().int().positive().optional(),
});

export const syncDetailedStatsSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Set confirm: true to sync detailed stats" }),
  }),
});

// ── Inferred types ──

export type SyncPlayerInput = z.infer<typeof syncPlayerSchema>;
export type SyncTeamInput = z.infer<typeof syncTeamSchema>;
