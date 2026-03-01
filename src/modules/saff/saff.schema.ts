import { z } from 'zod';

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
  tournamentIds: z.array(z.number().int().positive()).min(1, 'Select at least one tournament'),
  season: z.string().regex(/^\d{4}-\d{4}$/, 'Season must be YYYY-YYYY format'),
  dataTypes: z.array(z.enum(['standings', 'fixtures', 'teams'])).min(1).default(['standings', 'fixtures', 'teams']),
});

// ── Standing Queries ──

export const standingQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tournamentId: z.string().uuid().optional(),
  saffTournamentId: z.coerce.number().int().optional(),
  season: z.string().optional(),
  clubId: z.string().uuid().optional(),
});

// ── Fixture Queries ──

export const fixtureQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tournamentId: z.string().uuid().optional(),
  saffTournamentId: z.coerce.number().int().optional(),
  season: z.string().optional(),
  status: z.enum(['upcoming', 'completed', 'cancelled']).optional(),
  clubId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  week: z.coerce.number().int().optional(),
});

// ── Team Map Queries ──

export const teamMapQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
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
  importTypes: z.array(z.enum(['clubs', 'matches', 'standings'])).min(1),
});

// ── Inferred Types ──

export type TournamentQuery = z.infer<typeof tournamentQuerySchema>;
export type FetchRequest = z.infer<typeof fetchRequestSchema>;
export type StandingQuery = z.infer<typeof standingQuerySchema>;
export type FixtureQuery = z.infer<typeof fixtureQuerySchema>;
export type TeamMapQuery = z.infer<typeof teamMapQuerySchema>;
export type MapTeamInput = z.infer<typeof mapTeamSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
