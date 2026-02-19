import { z } from 'zod';

const paymentStatuses = ['Paid', 'Expected', 'Overdue', 'Cancelled'] as const;
const paymentTypes = ['Commission', 'Sponsorship', 'Bonus'] as const;
const ledgerSides = ['Debit', 'Credit'] as const;
const trends = ['up', 'down', 'stable'] as const;

// ── Invoice ──

export const createInvoiceSchema = z.object({
    contractId: z.string().uuid().optional(),
    playerId: z.string().uuid().optional(),
    clubId: z.string().uuid().optional(),
    amount: z.number().positive(),
    taxAmount: z.number().min(0).default(0),
    totalAmount: z.number().positive(),
    currency: z.string().length(3).default('SAR'),
    dueDate: z.string(),
    issueDate: z.string().optional(),
    description: z.string().optional(),
    lineItems: z.array(z.any()).optional(),
});

export const updateInvoiceSchema = z.object({
    amount: z.number().positive().optional(),
    taxAmount: z.number().min(0).optional(),
    totalAmount: z.number().positive().optional(),
    dueDate: z.string().optional(),
    description: z.string().optional(),
    lineItems: z.array(z.any()).optional(),
    documentUrl: z.string().url().optional(),
});

export const updateInvoiceStatusSchema = z.object({
    status: z.enum(paymentStatuses),
    paidDate: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    status: z.enum(paymentStatuses).optional(),
    playerId: z.string().uuid().optional(),
    clubId: z.string().uuid().optional(),
});

// ── Payment ──

export const createPaymentSchema = z.object({
    invoiceId: z.string().uuid().optional(),
    milestoneId: z.string().uuid().optional(),
    playerId: z.string().uuid().optional(),
    amount: z.number().positive(),
    currency: z.string().length(3).default('SAR'),
    paymentType: z.enum(paymentTypes).default('Commission'),
    dueDate: z.string(),
    reference: z.string().optional(),
    payer: z.string().optional(),
    notes: z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
    status: z.enum(paymentStatuses),
    paidDate: z.string().optional(),
    reference: z.string().optional(),
});

export const paymentQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().default('due_date'),
    order: z.enum(['asc', 'desc']).default('asc'),
    status: z.enum(paymentStatuses).optional(),
    paymentType: z.enum(paymentTypes).optional(),
    playerId: z.string().uuid().optional(),
});

// ── Ledger ──

export const createLedgerEntrySchema = z.object({
    transactionId: z.string().uuid().optional(),
    side: z.enum(ledgerSides),
    account: z.string().min(1).max(255),
    amount: z.number().positive(),
    currency: z.string().length(3).default('SAR'),
    description: z.string().optional(),
    referenceType: z.string().optional(),
    referenceId: z.string().uuid().optional(),
    playerId: z.string().uuid().optional(),
});

export const ledgerQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().default('posted_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    side: z.enum(ledgerSides).optional(),
    account: z.string().optional(),
    playerId: z.string().uuid().optional(),
});

// ── Valuation ──

export const createValuationSchema = z.object({
    playerId: z.string().uuid(),
    value: z.number().positive(),
    currency: z.string().length(3).default('SAR'),
    source: z.string().optional(),
    trend: z.enum(trends).default('stable'),
    changePct: z.number().optional(),
    valuedAt: z.string().optional(),
    notes: z.string().optional(),
});

export const valuationQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().default('valued_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    playerId: z.string().uuid().optional(),
});

// ── Types ──

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateLedgerInput = z.infer<typeof createLedgerEntrySchema>;
export type CreateValuationInput = z.infer<typeof createValuationSchema>;