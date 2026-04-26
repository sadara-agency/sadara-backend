import { z } from "zod";

// ── Tournament Queries ──

export const tournamentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  category: z.string().optional(),
  tier: z.coerce.number().min(1).max(5).optional(),
  agencyValue: z.string().optional(),
  search: z.string().optional(),
});

// ── Fetch Request — trigger SAFF scrape ──

export const fetchRequestSchema = z.object({
  tournamentIds: z
    .array(z.number().int().positive())
    .min(1, "Select at least one tournament"),
  season: z.string().regex(/^\d{4}-\d{4}$/, "Season must be YYYY-YYYY format"),
  dataTypes: z
    .array(z.enum(["standings", "fixtures", "teams"]))
    .min(1)
    .default(["standings", "fixtures", "teams"]),
});

// ── Standing Queries ──

export const standingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  tournamentId: z.string().uuid().optional(),
  saffTournamentId: z.coerce.number().int().optional(),
  season: z.string().optional(),
  clubId: z.string().uuid().optional(),
});

// ── Fixture Queries ──

export const fixtureQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
  tournamentId: z.string().uuid().optional(),
  saffTournamentId: z.coerce.number().int().optional(),
  season: z.string().optional(),
  status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
  clubId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  week: z.coerce.number().int().optional(),
});

// ── Team Map Queries ──

export const teamMapQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  season: z.string().optional(),
  unmappedOnly: z.coerce.boolean().optional(),
});

// ── Map SAFF team to Sadara club ──

export const mapTeamSchema = z.object({
  saffTeamId: z.number().int().positive(),
  season: z.string(),
  clubId: z.string().uuid(),
});

// ── Import to Sadara core tables ──

export const importRequestSchema = z.object({
  tournamentIds: z.array(z.number().int().positive()).min(1),
  season: z.string().regex(/^\d{4}-\d{4}$/),
  importTypes: z.array(z.enum(["clubs", "matches", "standings"])).min(1),
});

// ── Job status polling ──

export const jobIdParamSchema = z.object({
  jobId: z.string().min(1),
});

// ── Discover tournaments from SAFF site ──

export const syncTournamentsSchema = z.object({
  season: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Season must be YYYY-YYYY format")
    .optional(),
});

// ══════════════════════════════════════════
// SCRAPED ROW SCHEMAS
//
// Validate every scraped row before staging so malformed data is
// rejected with a usable reason (and surfaced to the wizard) instead
// of silently inserted.
// ══════════════════════════════════════════

const seasonRegex = /^\d{4}-\d{4}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const scrapedStandingSchema = z.object({
  position: z.number().int().min(1).max(50),
  saffTeamId: z.number().int().positive(),
  teamNameEn: z.string().min(1).max(120),
  teamNameAr: z.string().max(120),
  played: z.number().int().min(0).max(100),
  won: z.number().int().min(0).max(100),
  drawn: z.number().int().min(0).max(100),
  lost: z.number().int().min(0).max(100),
  goalsFor: z.number().int().min(0).max(500),
  goalsAgainst: z.number().int().min(0).max(500),
  goalDifference: z.number().int().min(-500).max(500),
  points: z.number().int().min(0).max(300),
});

export const scrapedFixtureSchema = z.object({
  date: z.string().regex(dateRegex, "Fixture date must be YYYY-MM-DD"),
  time: z.string().max(10),
  saffHomeTeamId: z.number().int().positive(),
  homeTeamNameEn: z.string().min(1).max(120),
  homeTeamNameAr: z.string().max(120),
  saffAwayTeamId: z.number().int().positive(),
  awayTeamNameEn: z.string().min(1).max(120),
  awayTeamNameAr: z.string().max(120),
  homeScore: z.number().int().min(0).max(50).nullable(),
  awayScore: z.number().int().min(0).max(50).nullable(),
  stadium: z.string().max(200),
  city: z.string().max(120),
});

export const scrapedTeamSchema = z.object({
  saffTeamId: z.number().int().positive(),
  teamNameEn: z.string().min(1).max(120),
  teamNameAr: z.string().max(120),
  logoUrl: z.string().url().optional(),
});

export const scrapeResultSchema = z.object({
  tournamentId: z.number().int().positive(),
  season: z.string().regex(seasonRegex),
  standings: z.array(scrapedStandingSchema),
  fixtures: z.array(scrapedFixtureSchema),
  teams: z.array(scrapedTeamSchema),
});

// Manual upload payload (Step 2 — Upload JSON tab)
export const uploadPayloadSchema = scrapeResultSchema;

// ══════════════════════════════════════════
// IMPORT SESSION SCHEMAS
// ══════════════════════════════════════════

export const createSessionSchema = z.object({
  saffTournamentId: z.number().int().positive(),
  season: z.string().regex(seasonRegex, "Season must be YYYY-YYYY format"),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Per-team resolution (Step 3 — Map)
export const teamResolutionSchema = z.discriminatedUnion("action", [
  z.object({
    saffTeamId: z.number().int().positive(),
    action: z.literal("map"),
    clubId: z.string().uuid(),
  }),
  z.object({
    saffTeamId: z.number().int().positive(),
    action: z.literal("create"),
    newClubData: z.object({
      name: z.string().min(1).max(120),
      nameAr: z.string().min(1).max(120),
      city: z.string().max(120).optional(),
      league: z.string().max(120).optional(),
    }),
  }),
  z.object({
    saffTeamId: z.number().int().positive(),
    action: z.literal("skip"),
  }),
]);

export const updateDecisionsSchema = z.object({
  teamResolutions: z.array(teamResolutionSchema).optional(),
  conflictResolutions: z
    .array(
      z.object({
        saffTeamId: z.number().int().positive(),
        resolution: z.enum(["use_existing", "create_new"]),
        targetClubId: z.string().uuid().optional(),
      }),
    )
    .optional(),
});

export const advanceStepSchema = z.object({
  step: z.enum(["fetch", "map", "review", "apply", "aborted"]),
});

export const applySessionSchema = z.object({
  decisions: updateDecisionsSchema,
  confirmDigest: z.string().min(1, "Preview digest is required"),
});

// ── Inferred Types ──

export type TournamentQuery = z.infer<typeof tournamentQuerySchema>;
export type FetchRequest = z.infer<typeof fetchRequestSchema>;
export type StandingQuery = z.infer<typeof standingQuerySchema>;
export type FixtureQuery = z.infer<typeof fixtureQuerySchema>;
export type TeamMapQuery = z.infer<typeof teamMapQuerySchema>;
export type MapTeamInput = z.infer<typeof mapTeamSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type JobIdParams = z.infer<typeof jobIdParamSchema>;
export type SyncTournamentsInput = z.infer<typeof syncTournamentsSchema>;
export type ScrapedStandingInput = z.infer<typeof scrapedStandingSchema>;
export type ScrapedFixtureInput = z.infer<typeof scrapedFixtureSchema>;
export type ScrapedTeamInput = z.infer<typeof scrapedTeamSchema>;
export type UploadPayload = z.infer<typeof uploadPayloadSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateDecisionsInput = z.infer<typeof updateDecisionsSchema>;
export type AdvanceStepInput = z.infer<typeof advanceStepSchema>;
export type ApplySessionInput = z.infer<typeof applySessionSchema>;
export type TeamResolutionInput = z.infer<typeof teamResolutionSchema>;
