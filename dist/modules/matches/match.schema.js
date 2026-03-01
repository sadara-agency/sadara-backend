"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerMatchesQuerySchema = exports.updateStatsSchema = exports.bulkStatsSchema = exports.playerMatchStatsSchema = exports.updateMatchPlayerSchema = exports.assignPlayersSchema = exports.matchPlayerSchema = exports.calendarQuerySchema = exports.matchQuerySchema = exports.updateMatchStatusSchema = exports.updateScoreSchema = exports.updateMatchSchema = exports.createMatchSchema = void 0;
const zod_1 = require("zod");
// ── Create Match ──
exports.createMatchSchema = zod_1.z.object({
    homeClubId: zod_1.z.string().uuid('Invalid club ID').optional(),
    awayClubId: zod_1.z.string().uuid('Invalid club ID').optional(),
    competition: zod_1.z.string().min(1, 'Competition is required').optional(),
    season: zod_1.z.string().max(20).optional(),
    matchDate: zod_1.z.string().min(1, 'Match date is required'),
    venue: zod_1.z.string().optional(),
    status: zod_1.z.enum(['upcoming', 'live', 'completed', 'cancelled']).default('upcoming'),
    homeScore: zod_1.z.number().int().min(0).optional(),
    awayScore: zod_1.z.number().int().min(0).optional(),
    attendance: zod_1.z.number().int().min(0).optional(),
    referee: zod_1.z.string().optional(),
    broadcast: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// ── Update Match ──
exports.updateMatchSchema = exports.createMatchSchema.partial();
// ── Update Match Score ──
exports.updateScoreSchema = zod_1.z.object({
    homeScore: zod_1.z.number().int().min(0),
    awayScore: zod_1.z.number().int().min(0),
    status: zod_1.z.enum(['live', 'completed']).optional(),
});
// ── Update Match Status ──
exports.updateMatchStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['upcoming', 'live', 'completed', 'cancelled']),
});
// ── Query Matches ──
exports.matchQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('match_date'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['upcoming', 'live', 'completed', 'cancelled']).optional(),
    competition: zod_1.z.string().optional(),
    season: zod_1.z.string().optional(),
    clubId: zod_1.z.string().uuid().optional(),
    playerId: zod_1.z.string().uuid().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
});
// ── Calendar Query ──
exports.calendarQuerySchema = zod_1.z.object({
    from: zod_1.z.string().min(1, 'Start date required'),
    to: zod_1.z.string().min(1, 'End date required'),
    playerId: zod_1.z.string().uuid().optional(),
    clubId: zod_1.z.string().uuid().optional(),
    competition: zod_1.z.string().optional(),
});
// ── Match Players (assign/update players to match) ──
exports.matchPlayerSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    availability: zod_1.z.enum(['starter', 'bench', 'injured', 'suspended', 'not_called']).default('starter'),
    positionInMatch: zod_1.z.string().max(50).optional(),
    minutesPlayed: zod_1.z.number().int().min(0).optional(),
    notes: zod_1.z.string().optional(),
});
exports.assignPlayersSchema = zod_1.z.object({
    players: zod_1.z.array(exports.matchPlayerSchema).min(1, 'At least one player required'),
});
exports.updateMatchPlayerSchema = exports.matchPlayerSchema.partial().omit({ playerId: true });
// ── Player Match Stats ──
exports.playerMatchStatsSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    minutesPlayed: zod_1.z.number().int().min(0).optional(),
    goals: zod_1.z.number().int().min(0).optional(),
    assists: zod_1.z.number().int().min(0).optional(),
    shotsTotal: zod_1.z.number().int().min(0).optional(),
    shotsOnTarget: zod_1.z.number().int().min(0).optional(),
    passesTotal: zod_1.z.number().int().min(0).optional(),
    passesCompleted: zod_1.z.number().int().min(0).optional(),
    tacklesTotal: zod_1.z.number().int().min(0).optional(),
    interceptions: zod_1.z.number().int().min(0).optional(),
    duelsWon: zod_1.z.number().int().min(0).optional(),
    duelsTotal: zod_1.z.number().int().min(0).optional(),
    dribblesCompleted: zod_1.z.number().int().min(0).optional(),
    dribblesAttempted: zod_1.z.number().int().min(0).optional(),
    foulsCommitted: zod_1.z.number().int().min(0).optional(),
    foulsDrawn: zod_1.z.number().int().min(0).optional(),
    yellowCards: zod_1.z.number().int().min(0).optional(),
    redCards: zod_1.z.number().int().min(0).optional(),
    rating: zod_1.z.number().min(0).max(10).optional(),
    positionInMatch: zod_1.z.string().max(50).optional(),
});
exports.bulkStatsSchema = zod_1.z.object({
    stats: zod_1.z.array(exports.playerMatchStatsSchema).min(1),
});
exports.updateStatsSchema = exports.playerMatchStatsSchema.partial().omit({ playerId: true });
// ── Player Matches Query (for player profile) ──
exports.playerMatchesQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    status: zod_1.z.enum(['upcoming', 'live', 'completed', 'cancelled']).optional(),
    competition: zod_1.z.string().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
});
//# sourceMappingURL=match.schema.js.map