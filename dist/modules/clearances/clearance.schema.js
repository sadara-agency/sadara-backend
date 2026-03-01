"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearanceQuerySchema = exports.completeClearanceSchema = exports.updateClearanceSchema = exports.createClearanceSchema = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.schema.ts
// Zod validation schemas for clearance (مخالصة) endpoints.
// ─────────────────────────────────────────────────────────────
const zod_1 = require("zod");
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CLEARANCE_STATUSES = ['Processing', 'Completed'];
const CURRENCIES = ['SAR', 'USD', 'EUR'];
// ── Create Clearance ──
exports.createClearanceSchema = zod_1.z.object({
    contractId: zod_1.z.string().uuid('Invalid contract ID'),
    reason: zod_1.z.string().min(1, 'Reason is required').max(2000),
    terminationDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
    hasOutstanding: zod_1.z.boolean().default(false),
    outstandingAmount: zod_1.z.number().min(0).default(0),
    outstandingCurrency: zod_1.z.enum(CURRENCIES).default('SAR'),
    outstandingDetails: zod_1.z.string().optional(),
    noClaimsDeclaration: zod_1.z.boolean().default(false),
    declarationText: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// ── Update Clearance ──
exports.updateClearanceSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(2000).optional(),
    terminationDate: zod_1.z.string().regex(DATE_REGEX).optional(),
    hasOutstanding: zod_1.z.boolean().optional(),
    outstandingAmount: zod_1.z.number().min(0).optional(),
    outstandingCurrency: zod_1.z.enum(CURRENCIES).optional(),
    outstandingDetails: zod_1.z.string().nullable().optional(),
    noClaimsDeclaration: zod_1.z.boolean().optional(),
    declarationText: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
// ── Complete Clearance (sign & finalize) ──
exports.completeClearanceSchema = zod_1.z.object({
    action: zod_1.z.enum(['sign_digital', 'sign_upload', 'complete']),
    signatureData: zod_1.z.string().optional(), // base64 for digital
    signedDocumentUrl: zod_1.z.string().optional(), // URL for upload
}).refine((data) => {
    if (data.action === 'sign_digital')
        return !!data.signatureData;
    if (data.action === 'sign_upload')
        return !!data.signedDocumentUrl;
    return true;
}, { message: 'Signature data required for signing actions' });
// ── Query ──
exports.clearanceQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    status: zod_1.z.enum(CLEARANCE_STATUSES).optional(),
    contractId: zod_1.z.string().uuid().optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=clearance.schema.js.map