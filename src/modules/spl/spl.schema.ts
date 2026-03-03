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

export type SyncPlayerInput = z.infer<typeof syncPlayerSchema>;
export type SyncTeamInput = z.infer<typeof syncTeamSchema>;
