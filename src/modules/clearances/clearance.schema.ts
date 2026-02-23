// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.schema.ts
// Zod validation schemas for clearance (مخالصة) endpoints.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CLEARANCE_STATUSES = ['Processing', 'Completed'] as const;
const CURRENCIES = ['SAR', 'USD', 'EUR'] as const;

// ── Create Clearance ──
export const createClearanceSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  reason: z.string().min(1, 'Reason is required').max(2000),
  terminationDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
  hasOutstanding: z.boolean().default(false),
  outstandingAmount: z.number().min(0).default(0),
  outstandingCurrency: z.enum(CURRENCIES).default('SAR'),
  outstandingDetails: z.string().optional(),
  noClaimsDeclaration: z.boolean().default(false),
  declarationText: z.string().optional(),
  notes: z.string().optional(),
});

// ── Update Clearance ──
export const updateClearanceSchema = z.object({
  reason: z.string().min(1).max(2000).optional(),
  terminationDate: z.string().regex(DATE_REGEX).optional(),
  hasOutstanding: z.boolean().optional(),
  outstandingAmount: z.number().min(0).optional(),
  outstandingCurrency: z.enum(CURRENCIES).optional(),
  outstandingDetails: z.string().nullable().optional(),
  noClaimsDeclaration: z.boolean().optional(),
  declarationText: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Complete Clearance (sign & finalize) ──
export const completeClearanceSchema = z.object({
  action: z.enum(['sign_digital', 'sign_upload', 'complete']),
  signatureData: z.string().optional(),        // base64 for digital
  signedDocumentUrl: z.string().optional(),     // URL for upload
}).refine(
  (data) => {
    if (data.action === 'sign_digital') return !!data.signatureData;
    if (data.action === 'sign_upload') return !!data.signedDocumentUrl;
    return true;
  },
  { message: 'Signature data required for signing actions' },
);

// ── Query ──
export const clearanceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(CLEARANCE_STATUSES).optional(),
  contractId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
});

// ── Inferred types ──
export type CreateClearanceInput = z.infer<typeof createClearanceSchema>;
export type UpdateClearanceInput = z.infer<typeof updateClearanceSchema>;
export type CompleteClearanceInput = z.infer<typeof completeClearanceSchema>;
export type ClearanceQuery = z.infer<typeof clearanceQuerySchema>;