"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDecisionSchema = exports.markPackReadySchema = exports.updateScreeningSchema = exports.createScreeningSchema = exports.watchlistQuerySchema = exports.updateWatchlistStatusSchema = exports.updateWatchlistSchema = exports.createWatchlistSchema = void 0;
const zod_1 = require("zod");
// ── Watchlist ──
exports.createWatchlistSchema = zod_1.z.object({
    prospectName: zod_1.z.string().min(1).max(255),
    prospectNameAr: zod_1.z.string().max(255).optional(),
    dateOfBirth: zod_1.z.string().optional(),
    nationality: zod_1.z.string().max(100).optional(),
    position: zod_1.z.string().max(100).optional(),
    currentClub: zod_1.z.string().max(255).optional(),
    currentLeague: zod_1.z.string().max(255).optional(),
    source: zod_1.z.string().max(255).optional(),
    videoClips: zod_1.z.number().int().min(0).default(0),
    priority: zod_1.z.enum(['High', 'Medium', 'Low']).default('Medium'),
    technicalRating: zod_1.z.number().int().min(1).max(10).optional(),
    physicalRating: zod_1.z.number().int().min(1).max(10).optional(),
    mentalRating: zod_1.z.number().int().min(1).max(10).optional(),
    potentialRating: zod_1.z.number().int().min(1).max(10).optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateWatchlistSchema = exports.createWatchlistSchema.partial();
exports.updateWatchlistStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['Active', 'Shortlisted', 'Archived', 'Rejected']),
});
exports.watchlistQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['Active', 'Shortlisted', 'Archived', 'Rejected']).optional(),
    priority: zod_1.z.enum(['High', 'Medium', 'Low']).optional(),
    position: zod_1.z.string().optional(),
    nationality: zod_1.z.string().optional(),
});
// ── Screening Case ──
exports.createScreeningSchema = zod_1.z.object({
    watchlistId: zod_1.z.string().uuid(),
    notes: zod_1.z.string().optional(),
});
exports.updateScreeningSchema = zod_1.z.object({
    identityCheck: zod_1.z.enum(['Verified', 'Pending', 'Failed']).optional(),
    passportVerified: zod_1.z.boolean().optional(),
    ageVerified: zod_1.z.boolean().optional(),
    fitAssessment: zod_1.z.string().optional(),
    riskAssessment: zod_1.z.string().optional(),
    medicalClearance: zod_1.z.boolean().optional(),
    baselineStats: zod_1.z.record(zod_1.z.any()).optional(),
    notes: zod_1.z.string().optional(),
});
exports.markPackReadySchema = zod_1.z.object({
    isPackReady: zod_1.z.literal(true),
});
// ── Selection Decision (immutable — create only) ──
exports.createDecisionSchema = zod_1.z.object({
    screeningCaseId: zod_1.z.string().uuid(),
    committeeName: zod_1.z.string().min(1).max(255),
    decision: zod_1.z.enum(['Approved', 'Rejected', 'Deferred']),
    decisionScope: zod_1.z.enum(['Full', 'Transfer-Only']).default('Full'),
    decisionDate: zod_1.z.string().optional(),
    votesFor: zod_1.z.number().int().min(0).default(0),
    votesAgainst: zod_1.z.number().int().min(0).default(0),
    votesAbstain: zod_1.z.number().int().min(0).default(0),
    voteDetails: zod_1.z.array(zod_1.z.object({
        member: zod_1.z.string(),
        vote: zod_1.z.enum(['Approve', 'Reject', 'Abstain']),
        comment: zod_1.z.string().optional(),
    })).optional(),
    rationale: zod_1.z.string().optional(),
    conditions: zod_1.z.string().optional(),
    dissentingOpinion: zod_1.z.string().optional(),
});
//# sourceMappingURL=scouting.schema.js.map