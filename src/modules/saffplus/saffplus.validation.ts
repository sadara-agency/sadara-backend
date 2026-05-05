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

// ── Phase 2: club-squad sync ──

export const clubIdParamSchema = z.object({
  clubId: z.string().uuid(),
});

export const syncClubSquadsBodySchema = z.object({
  /** SAFF+ club slug — required because we don't store it on the Club model. */
  clubSlug: z.string().min(1).max(120),
  season: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Season must be YYYY-YYYY format")
    .optional(),
});

export type SyncLeaguesInput = z.infer<typeof syncLeaguesSchema>;
export type CompetitionQuery = z.infer<typeof competitionQuerySchema>;
export type SyncClubSquadsInput = z.infer<typeof syncClubSquadsBodySchema>;

// ── Phase 3: match events + media ──

export const matchIdParamSchema = z.object({
  matchId: z.string().uuid(),
});

// ── Phase 4: Player profile enrichment ──

// Accepts either a bare saffPlayerId or a full saffplus.sa URL.
// Extracts the trailing path segment in both cases.
const saffPlayerIdOrUrl = z
  .string()
  .min(1)
  .transform((val) => {
    const match = /\/entity\/player\/([^/?#]+)/.exec(val);
    return match ? match[1] : val;
  });

export const syncPlayerSchema = z.object({
  sadaraPlayerId: z.string().uuid(),
  saffPlayerId: saffPlayerIdOrUrl,
  overwrite: z.boolean().optional().default(false),
});

export const saffPlayerIdParamSchema = z.object({
  saffPlayerId: z.string().min(1).max(200),
});

export type SyncPlayerInput = z.infer<typeof syncPlayerSchema>;
