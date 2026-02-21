"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchQuerySchema = exports.updateMatchStatusSchema = exports.updateScoreSchema = exports.updateMatchSchema = exports.createMatchSchema = void 0;
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
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
});
//# sourceMappingURL=match.schema.js.map