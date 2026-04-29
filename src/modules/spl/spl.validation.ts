// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.validation.ts
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

// ── Phase A — Pulselive fixtures + match details ──

const fixtureStatusSchema = z.enum(["C", "U", "L"]);

export const syncFixturesSchema = z.object({
  seasonId: z.number().int().positive().optional(),
  statuses: z.array(fixtureStatusSchema).optional(),
  teamId: z.number().int().positive().optional(),
});

export const syncFixtureDetailParamsSchema = z.object({
  pulselivefixtureId: z.string().regex(/^\d+$/, "fixture ID must be numeric"),
});

export const syncAllFixtureDetailsSchema = z.object({
  seasonId: z.number().int().positive().optional(),
  sinceDate: z.string().optional(),
});

// ── Phase B — Pulselive match-level player stats ──

export const syncMatchStatsParamsSchema = z.object({
  pulselivefixtureId: z.string().regex(/^\d+$/, "fixture ID must be numeric"),
});

export const syncAllMatchStatsSchema = z.object({
  seasonId: z.number().int().positive().optional(),
  sinceDate: z.string().optional(),
});

// ── Phase C — Squad rosters + team-season stats ──

export const syncTeamRosterParamsSchema = z.object({
  pulseLiveTeamId: z.string().regex(/^\d+$/),
});

export const syncTeamRosterSchema = z.object({
  seasonId: z.number().int().positive().optional(),
});

export const syncAllRostersSchema = z.object({
  seasonId: z.number().int().positive().optional(),
});

// ── Phase D — Historical backfill ──

const backfillScopeSchema = z.object({
  fixtures: z.boolean().optional(),
  fixtureDetails: z.boolean().optional(),
  matchStats: z.boolean().optional(),
  rosters: z.boolean().optional(),
  teamStats: z.boolean().optional(),
});

export const backfillSeasonSchema = z.object({
  seasonId: z.number().int().positive(),
  scope: backfillScopeSchema,
});

export const backfillAllSchema = z.object({
  scope: backfillScopeSchema,
  fromYear: z.number().int().min(2000).max(2100).optional(),
});

// ── Inferred types ──

export type SyncPlayerInput = z.infer<typeof syncPlayerSchema>;
export type SyncTeamInput = z.infer<typeof syncTeamSchema>;
export type SyncFixturesInput = z.infer<typeof syncFixturesSchema>;
export type SyncAllFixtureDetailsInput = z.infer<
  typeof syncAllFixtureDetailsSchema
>;
export type SyncAllMatchStatsInput = z.infer<typeof syncAllMatchStatsSchema>;
export type SyncTeamRosterInput = z.infer<typeof syncTeamRosterSchema>;
export type SyncAllRostersInput = z.infer<typeof syncAllRostersSchema>;
export type BackfillSeasonInput = z.infer<typeof backfillSeasonSchema>;
export type BackfillAllInput = z.infer<typeof backfillAllSchema>;
