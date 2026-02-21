"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractQuerySchema = exports.updateContractSchema = exports.createContractSchema = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.schema.ts
// Zod validation schemas for the Contract module.
// ─────────────────────────────────────────────────────────────
const zod_1 = require("zod");
const CONTRACT_CATEGORIES = ['Club', 'Sponsorship'];
const CONTRACT_STATUSES = ['Active', 'Expiring Soon', 'Expired', 'Draft'];
const CURRENCIES = ['SAR', 'USD', 'EUR'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// ── Create Contract ──
exports.createContractSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    clubId: zod_1.z.string().uuid('Invalid club ID'),
    category: zod_1.z.enum(CONTRACT_CATEGORIES).default('Club'),
    title: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
    endDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
    baseSalary: zod_1.z.number().positive('Salary must be positive').optional(),
    salaryCurrency: zod_1.z.enum(CURRENCIES).default('SAR'),
    signingBonus: zod_1.z.number().min(0).default(0),
    releaseClause: zod_1.z.number().positive().optional(),
    performanceBonus: zod_1.z.number().min(0).default(0),
    commissionPct: zod_1.z.number().min(0).max(100, 'Commission must be 0-100%').optional(),
    notes: zod_1.z.string().optional(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), { message: 'End date must be after start date', path: ['endDate'] });
// ── Update Contract (partial) ──
exports.updateContractSchema = zod_1.z.object({
    category: zod_1.z.enum(CONTRACT_CATEGORIES).optional(),
    status: zod_1.z.enum(CONTRACT_STATUSES).optional(),
    title: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD').optional(),
    endDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD').optional(),
    baseSalary: zod_1.z.number().positive().optional(),
    salaryCurrency: zod_1.z.enum(CURRENCIES).optional(),
    signingBonus: zod_1.z.number().min(0).optional(),
    releaseClause: zod_1.z.number().positive().nullable().optional(),
    performanceBonus: zod_1.z.number().min(0).optional(),
    commissionPct: zod_1.z.number().min(0).max(100).optional(),
    documentUrl: zod_1.z.string().url().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
// ── Query / List Contracts ──
exports.contractQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(CONTRACT_STATUSES).optional(),
    category: zod_1.z.enum(CONTRACT_CATEGORIES).optional(),
    playerId: zod_1.z.string().uuid().optional(),
    clubId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=contract.schema.js.map