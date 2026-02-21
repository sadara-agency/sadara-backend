"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerQuerySchema = exports.updateOfferStatusSchema = exports.updateOfferSchema = exports.createOfferSchema = void 0;
const zod_1 = require("zod");
// ── Create Offer ──
exports.createOfferSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    fromClubId: zod_1.z.string().uuid('Invalid club ID').optional(),
    toClubId: zod_1.z.string().uuid('Invalid club ID').optional(),
    offerType: zod_1.z.enum(['Transfer', 'Loan']).default('Transfer'),
    transferFee: zod_1.z.number().min(0).optional(),
    salaryOffered: zod_1.z.number().min(0).optional(),
    contractYears: zod_1.z.number().int().min(1).max(10).optional(),
    agentFee: zod_1.z.number().min(0).optional(),
    feeCurrency: zod_1.z.enum(['SAR', 'USD', 'EUR']).default('SAR'),
    conditions: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    deadline: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    notes: zod_1.z.string().optional(),
});
// ── Update Offer ──
exports.updateOfferSchema = exports.createOfferSchema.partial();
// ── Update Offer Status ──
exports.updateOfferStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['New', 'Under Review', 'Negotiation', 'Closed']),
    counterOffer: zod_1.z.record(zod_1.z.unknown()).optional(),
    notes: zod_1.z.string().optional(),
});
// ── Query Offers ──
exports.offerQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['New', 'Under Review', 'Negotiation', 'Closed']).optional(),
    offerType: zod_1.z.enum(['Transfer', 'Loan']).optional(),
    playerId: zod_1.z.string().uuid().optional(),
    fromClubId: zod_1.z.string().uuid().optional(),
    toClubId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=offer.schema.js.map