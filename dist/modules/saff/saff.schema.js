"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRequestSchema = exports.mapTeamSchema = exports.teamMapQuerySchema = exports.fixtureQuerySchema = exports.standingQuerySchema = exports.fetchRequestSchema = exports.tournamentQuerySchema = void 0;
const zod_1 = require("zod");
// ── Tournament Queries ──
exports.tournamentQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    category: zod_1.z.string().optional(),
    tier: zod_1.z.coerce.number().min(1).max(5).optional(),
    agencyValue: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
// ── Fetch Request — trigger SAFF scrape ──
exports.fetchRequestSchema = zod_1.z.object({
    tournamentIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, 'Select at least one tournament'),
    season: zod_1.z.string().regex(/^\d{4}-\d{4}$/, 'Season must be YYYY-YYYY format'),
    dataTypes: zod_1.z.array(zod_1.z.enum(['standings', 'fixtures', 'teams'])).min(1).default(['standings', 'fixtures', 'teams']),
});
// ── Standing Queries ──
exports.standingQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    tournamentId: zod_1.z.string().uuid().optional(),
    saffTournamentId: zod_1.z.coerce.number().int().optional(),
    season: zod_1.z.string().optional(),
    clubId: zod_1.z.string().uuid().optional(),
});
// ── Fixture Queries ──
exports.fixtureQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    tournamentId: zod_1.z.string().uuid().optional(),
    saffTournamentId: zod_1.z.coerce.number().int().optional(),
    season: zod_1.z.string().optional(),
    status: zod_1.z.enum(['upcoming', 'completed', 'cancelled']).optional(),
    clubId: zod_1.z.string().uuid().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    week: zod_1.z.coerce.number().int().optional(),
});
// ── Team Map Queries ──
exports.teamMapQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(200).default(50),
    season: zod_1.z.string().optional(),
    unmappedOnly: zod_1.z.coerce.boolean().optional(),
});
// ── Map SAFF team to Sadara club ──
exports.mapTeamSchema = zod_1.z.object({
    saffTeamId: zod_1.z.number().int().positive(),
    season: zod_1.z.string(),
    clubId: zod_1.z.string().uuid(),
});
// ── Import to Sadara core tables ──
exports.importRequestSchema = zod_1.z.object({
    tournamentIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1),
    season: zod_1.z.string().regex(/^\d{4}-\d{4}$/),
    importTypes: zod_1.z.array(zod_1.z.enum(['clubs', 'matches', 'standings'])).min(1),
});
//# sourceMappingURL=saff.schema.js.map