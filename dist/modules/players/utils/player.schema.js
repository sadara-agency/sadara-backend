"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerQuerySchema = exports.updatePlayerSchema = exports.createPlayerSchema = void 0;
const zod_1 = require("zod");
exports.createPlayerSchema = zod_1.z.object({
    firstName: zod_1.z.string()
        .min(1, 'First name is required')
        .regex(/^[\p{L}\p{M}\s'-]+$/u, 'Name contains invalid characters'),
    lastName: zod_1.z.string()
        .min(1, 'Last name is required')
        .regex(/^[\p{L}\p{M}\s'-]+$/u, 'Name contains invalid characters'),
    firstNameAr: zod_1.z.string().optional(),
    lastNameAr: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    nationality: zod_1.z.string().optional(),
    secondaryNationality: zod_1.z.string().optional(),
    playerType: zod_1.z.enum(['Pro', 'Youth']).default('Pro'),
    position: zod_1.z.string().optional(),
    secondaryPosition: zod_1.z.string().optional(),
    preferredFoot: zod_1.z.enum(['Left', 'Right', 'Both']).optional(),
    heightCm: zod_1.z.number().positive().optional(),
    weightKg: zod_1.z.number().positive().optional(),
    jerseyNumber: zod_1.z.number().int().min(1).max(99).optional(),
    currentClubId: zod_1.z.string().uuid().optional(),
    marketValue: zod_1.z.number().positive().optional(),
    marketValueCurrency: zod_1.z.enum(['SAR', 'USD', 'EUR']).default('SAR'),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    speed: zod_1.z.number().int().min(0).max(100).optional(),
    passing: zod_1.z.number().int().min(0).max(100).optional(),
    shooting: zod_1.z.number().int().min(0).max(100).optional(),
    defense: zod_1.z.number().int().min(0).max(100).optional(),
    fitness: zod_1.z.number().int().min(0).max(100).optional(),
    tactical: zod_1.z.number().int().min(0).max(100).optional(),
});
exports.updatePlayerSchema = exports.createPlayerSchema.partial();
exports.playerQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'injured', 'inactive']).optional(),
    playerType: zod_1.z.enum(['Pro', 'Youth']).optional(),
    clubId: zod_1.z.string().uuid().optional(),
    position: zod_1.z.string().optional(),
    nationality: zod_1.z.string().optional(),
});
//# sourceMappingURL=player.schema.js.map