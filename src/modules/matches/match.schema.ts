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
  from: z.string().optional(),
  to: z.string().optional(),
});

// ── Inferred Types ──

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;
export type MatchQuery = z.infer<typeof matchQuerySchema>;