"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractQuerySchema = exports.transitionStatusSchema = exports.updateContractSchema = exports.createContractSchema = void 0;
const zod_1 = require("zod");
const CONTRACT_CATEGORIES = ['Club', 'Sponsorship'];
const CONTRACT_TYPES = [
    'Representation', 'CareerManagement', 'Transfer', 'Loan',
    'Renewal', 'Sponsorship', 'ImageRights', 'MedicalAuth',
];
const CONTRACT_STATUSES = ['Active', 'Expiring Soon', 'Expired', 'Draft', 'Review', 'Signing', 'Terminated'];
const EXCLUSIVITY_TYPES = ['Exclusive', 'NonExclusive'];
const REPRESENTATION_SCOPES = ['Local', 'International', 'Both'];
const CURRENCIES = ['SAR', 'USD', 'EUR'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// ── Create Contract ──
exports.createContractSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid('Invalid player ID'),
    clubId: zod_1.z.string().uuid('Invalid club ID'),
    category: zod_1.z.enum(CONTRACT_CATEGORIES).default('Club'),
    contractType: zod_1.z.enum(CONTRACT_TYPES).default('Representation'),
    title: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
    endDate: zod_1.z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
    baseSalary: zod_1.z.number().positive('Salary must be positive').optional(),
    salaryCurrency: zod_1.z.enum(CURRENCIES).default('SAR'),
    signingBonus: zod_1.z.number().min(0).default(0),
    releaseClause: zod_1.z.number().positive().optional(),
    performanceBonus: zod_1.z.number().min(0).default(0),
    commissionPct: zod_1.z.number().min(0).max(100, 'Commission must be 0-100%').optional(),
    // Representation fields
    exclusivity: zod_1.z.enum(EXCLUSIVITY_TYPES).default('Exclusive'),
    representationScope: zod_1.z.enum(REPRESENTATION_SCOPES).default('Both'),
    agentName: zod_1.z.string().optional(),
    agentLicense: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), { message: 'End date must be after start date', path: ['endDate'] });
// ── Update Contract (partial) ──
exports.updateContractSchema = zod_1.z.object({
    category: zod_1.z.enum(CONTRACT_CATEGORIES).optional(),
    contractType: zod_1.z.enum(CONTRACT_TYPES).optional(),
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
    exclusivity: zod_1.z.enum(EXCLUSIVITY_TYPES).optional(),
    representationScope: zod_1.z.enum(REPRESENTATION_SCOPES).optional(),
    agentName: zod_1.z.string().nullable().optional(),
    agentLicense: zod_1.z.string().nullable().optional(),
    documentUrl: zod_1.z.string().url().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
// ── Transition Status (Draft→Review→Signing→Active) ──
exports.transitionStatusSchema = zod_1.z.object({
    action: zod_1.z.enum([
        'submit_review', // Draft → Review
        'approve', // Review → Signing
        'reject_to_draft', // Review → Draft
        'sign_digital', // Signing → Active
        'sign_upload', // Signing → Active
        'return_review', // Signing → Review
    ]),
    signatureData: zod_1.z.string().optional(),
    signedDocumentUrl: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
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
    contractType: zod_1.z.enum(CONTRACT_TYPES).optional(),
    playerId: zod_1.z.string().uuid().optional(),
    clubId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=contract.schema.js.map