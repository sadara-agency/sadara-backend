"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clubQuerySchema = exports.updateClubSchema = exports.createClubSchema = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.schema.ts
// Zod validation schemas for the Club module.
//
// Updated: Added exported inferred types to match the pattern
// used in player.schema.ts, user.schema.ts, task.schema.ts,
// and contract.schema.ts.
// ─────────────────────────────────────────────────────────────
const zod_1 = require("zod");
// ── Create Club ──
exports.createClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Club name is required'),
    nameAr: zod_1.z.string().optional(),
    type: zod_1.z.enum(['Club', 'Sponsor']).default('Club'),
    country: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    league: zod_1.z.string().optional(),
    logoUrl: zod_1.z.string().url('Invalid URL').optional(),
    website: zod_1.z.string().optional(),
    foundedYear: zod_1.z.number().int().optional(),
    stadium: zod_1.z.string().optional(),
    stadiumCapacity: zod_1.z.number().int().positive().optional(),
    primaryColor: zod_1.z.string().optional(),
    secondaryColor: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// ── Update Club (partial) ──
exports.updateClubSchema = exports.createClubSchema.partial();
// ── Query / List Clubs ──
exports.clubQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('name'),
    order: zod_1.z.enum(['asc', 'desc']).default('asc'),
    search: zod_1.z.string().optional(),
    type: zod_1.z.enum(['Club', 'Sponsor']).optional(),
    country: zod_1.z.string().optional(),
});
//# sourceMappingURL=club.schema.js.map