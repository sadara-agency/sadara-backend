"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referralQuerySchema = exports.updateReferralStatusSchema = exports.updateReferralSchema = exports.createReferralSchema = void 0;
const zod_1 = require("zod");
const referralTypes = ['Performance', 'Mental', 'Medical'];
const referralStatuses = ['Open', 'InProgress', 'Resolved', 'Escalated'];
const referralPriorities = ['Low', 'Medium', 'High', 'Critical'];
// ── Create Referral ──
exports.createReferralSchema = zod_1.z.object({
    referralType: zod_1.z.enum(referralTypes),
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    triggerDesc: zod_1.z.string().optional(),
    priority: zod_1.z.enum(referralPriorities).default('Medium'),
    assignedTo: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    isRestricted: zod_1.z.boolean().default(false),
    restrictedTo: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
// ── Update Referral ──
exports.updateReferralSchema = zod_1.z.object({
    referralType: zod_1.z.enum(referralTypes).optional(),
    priority: zod_1.z.enum(referralPriorities).optional(),
    assignedTo: zod_1.z.string().uuid().nullable().optional(),
    dueDate: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().optional(),
    evidenceCount: zod_1.z.number().int().min(0).optional(),
    sessionCount: zod_1.z.number().int().min(0).optional(),
    isRestricted: zod_1.z.boolean().optional(),
    restrictedTo: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
// ── Update Status ──
exports.updateReferralStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(referralStatuses),
    outcome: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// ── Query Referrals ──
exports.referralQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(referralStatuses).optional(),
    referralType: zod_1.z.enum(referralTypes).optional(),
    priority: zod_1.z.enum(referralPriorities).optional(),
    playerId: zod_1.z.string().uuid().optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=referral.schema.js.map