import { z } from 'zod';

// ── Create Match ──

export const createMatchSchema = z.object({
  homeClubId: z.string().uuid('Invalid club ID').optional(),
  awayClubId: z.string().uuid('Invalid club ID').optional(),
  competition: z.string().min(1, 'Competition is required').optional(),
  season: z.string().max(20).optional(),
  matchDate: z.string().min(1, 'Match date is required'),
  venue: z.string().optional(),
  status: z.enum(['upcoming', 'live', 'completed', 'cancelled']).default('upcoming'),
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  attendance: z.number().int().min(0).optional(),
  referee: z.string().optional(),
  broadcast: z.string().optional(),
  notes: z.string().optional(),
});

// ── Update Match ──

export const updateMatchSchema = createMatchSchema.partial();

// ── Update Match Score ──

export const updateScoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  status: z.enum(['live', 'completed']).optional(),
});

// ── Update Match Status ──

export const updateMatchStatusSchema = z.object({
  status: z.enum(['upcoming', 'live', 'completed', 'cancelled']),
});

// ── Query Matches ──

export const matchQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('match_date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(['upcoming', 'live', 'completed', 'cancelled']).optional(),
  competition: z.string().optional(),
  season: z.string().optional(),
  clubId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ── Calendar Query ──

export const calendarQuerySchema = z.object({
  from: z.string().min(1, 'Start date required'),
  to: z.string().min(1, 'End date required'),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  competition: z.string().optional(),
});

// ── Match Players (assign/update players to match) ──

export const matchPlayerSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
  availability: z.enum(['starter', 'bench', 'injured', 'suspended', 'not_called']).default('starter'),
  positionInMatch: z.string().max(50).optional(),
  minutesPlayed: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const assignPlayersSchema = z.object({
  players: z.array(matchPlayerSchema).min(1, 'At least one player required'),
});

export const updateMatchPlayerSchema = matchPlayerSchema.partial().omit({ playerId: true });

// ── Player Match Stats ──

export const playerMatchStatsSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
  minutesPlayed: z.number().int().min(0).optional(),
  goals: z.number().int().min(0).optional(),
  assists: z.number().int().min(0).optional(),
  shotsTotal: z.number().int().min(0).optional(),
  shotsOnTarget: z.number().int().min(0).optional(),
  passesTotal: z.number().int().min(0).optional(),
  passesCompleted: z.number().int().min(0).optional(),
  tacklesTotal: z.number().int().min(0).optional(),
  interceptions: z.number().int().min(0).optional(),
  duelsWon: z.number().int().min(0).optional(),
  duelsTotal: z.number().int().min(0).optional(),
  dribblesCompleted: z.number().int().min(0).optional(),
  dribblesAttempted: z.number().int().min(0).optional(),
  foulsCommitted: z.number().int().min(0).optional(),
  foulsDrawn: z.number().int().min(0).optional(),
  yellowCards: z.number().int().min(0).optional(),
  redCards: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(10).optional(),
  positionInMatch: z.string().max(50).optional(),
});

export const bulkStatsSchema = z.object({
  stats: z.array(playerMatchStatsSchema).min(1),
});

export const updateStatsSchema = playerMatchStatsSchema.partial().omit({ playerId: true });

// ── Player Matches Query (for player profile) ──

export const playerMatchesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['upcoming', 'live', 'completed', 'cancelled']).optional(),
  competition: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ── Inferred Types ──

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;
export type MatchQuery = z.infer<typeof matchQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type MatchPlayerInput = z.infer<typeof matchPlayerSchema>;
export type PlayerMatchStatsInput = z.infer<typeof playerMatchStatsSchema>;