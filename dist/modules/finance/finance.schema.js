"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valuationQuerySchema = exports.createValuationSchema = exports.ledgerQuerySchema = exports.createLedgerEntrySchema = exports.paymentQuerySchema = exports.updatePaymentStatusSchema = exports.createPaymentSchema = exports.invoiceQuerySchema = exports.updateInvoiceStatusSchema = exports.updateInvoiceSchema = exports.createInvoiceSchema = void 0;
const zod_1 = require("zod");
const paymentStatuses = ['Paid', 'Expected', 'Overdue', 'Cancelled'];
const paymentTypes = ['Commission', 'Sponsorship', 'Bonus'];
const ledgerSides = ['Debit', 'Credit'];
const trends = ['up', 'down', 'stable'];
// ── Invoice ──
exports.createInvoiceSchema = zod_1.z.object({
    contractId: zod_1.z.string().uuid().optional(),
    playerId: zod_1.z.string().uuid().optional(),
    clubId: zod_1.z.string().uuid().optional(),
    amount: zod_1.z.number().positive(),
    taxAmount: zod_1.z.number().min(0).default(0),
    totalAmount: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).default('SAR'),
    dueDate: zod_1.z.string(),
    issueDate: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    lineItems: zod_1.z.array(zod_1.z.any()).optional(),
});
exports.updateInvoiceSchema = zod_1.z.object({
    amount: zod_1.z.number().positive().optional(),
    taxAmount: zod_1.z.number().min(0).optional(),
    totalAmount: zod_1.z.number().positive().optional(),
    dueDate: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    lineItems: zod_1.z.array(zod_1.z.any()).optional(),
    documentUrl: zod_1.z.string().url().optional(),
});
exports.updateInvoiceStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(paymentStatuses),
    paidDate: zod_1.z.string().optional(),
});
exports.invoiceQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(paymentStatuses).optional(),
    playerId: zod_1.z.string().uuid().optional(),
    clubId: zod_1.z.string().uuid().optional(),
});
// ── Payment ──
exports.createPaymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string().uuid().optional(),
    milestoneId: zod_1.z.string().uuid().optional(),
    playerId: zod_1.z.string().uuid().optional(),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).default('SAR'),
    paymentType: zod_1.z.enum(paymentTypes).default('Commission'),
    dueDate: zod_1.z.string(),
    reference: zod_1.z.string().optional(),
    payer: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.updatePaymentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(paymentStatuses),
    paidDate: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
});
exports.paymentQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('due_date'),
    order: zod_1.z.enum(['asc', 'desc']).default('asc'),
    status: zod_1.z.enum(paymentStatuses).optional(),
    paymentType: zod_1.z.enum(paymentTypes).optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
// ── Ledger ──
exports.createLedgerEntrySchema = zod_1.z.object({
    transactionId: zod_1.z.string().uuid().optional(),
    side: zod_1.z.enum(ledgerSides),
    account: zod_1.z.string().min(1).max(255),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).default('SAR'),
    description: zod_1.z.string().optional(),
    referenceType: zod_1.z.string().optional(),
    referenceId: zod_1.z.string().uuid().optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
exports.ledgerQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('posted_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    side: zod_1.z.enum(ledgerSides).optional(),
    account: zod_1.z.string().optional(),
    playerId: zod_1.z.string().uuid().optional(),
});
// ── Valuation ──
exports.createValuationSchema = zod_1.z.object({
    playerId: zod_1.z.string().uuid(),
    value: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).default('SAR'),
    source: zod_1.z.string().optional(),
    trend: zod_1.z.enum(trends).default('stable'),
    changePct: zod_1.z.number().optional(),
    valuedAt: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.valuationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('valued_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    playerId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=finance.schema.js.map