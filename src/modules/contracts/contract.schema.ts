import { z } from 'zod';

const CONTRACT_CATEGORIES = ['Club', 'Sponsorship'] as const;
const CONTRACT_STATUSES = ['Active', 'Expiring Soon', 'Expired', 'Draft', 'Review', 'Signing'] as const;
const CURRENCIES = ['SAR', 'USD', 'EUR'] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ── Create Contract ──
export const createContractSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
  clubId: z.string().uuid('Invalid club ID'),
  category: z.enum(CONTRACT_CATEGORIES).default('Club'),
  title: z.string().optional(),
  startDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
  baseSalary: z.number().positive('Salary must be positive').optional(),
  salaryCurrency: z.enum(CURRENCIES).default('SAR'),
  signingBonus: z.number().min(0).default(0),
  releaseClause: z.number().positive().optional(),
  performanceBonus: z.number().min(0).default(0),
  commissionPct: z.number().min(0).max(100, 'Commission must be 0-100%').optional(),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

// ── Update Contract (partial) ──
export const updateContractSchema = z.object({
  category: z.enum(CONTRACT_CATEGORIES).optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  title: z.string().optional(),
  startDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD').optional(),
  baseSalary: z.number().positive().optional(),
  salaryCurrency: z.enum(CURRENCIES).optional(),
  signingBonus: z.number().min(0).optional(),
  releaseClause: z.number().positive().nullable().optional(),
  performanceBonus: z.number().min(0).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  documentUrl: z.string().url().nullable().optional(),
  signedDocumentUrl: z.string().nullable().optional(),
  signingMethod: z.enum(['digital', 'upload']).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Status Transition ──
// Valid transitions: Draft→Review, Review→Signing, Review→Draft,
//                    Signing→Active, Signing→Review
export const transitionStatusSchema = z.object({
  action: z.enum([
    'submit_review',   // Draft → Review
    'approve',         // Review → Signing
    'reject_to_draft', // Review → Draft
    'sign_digital',    // Signing → Active (digital signature)
    'sign_upload',     // Signing → Active (upload signed scan)
    'return_review',   // Signing → Review
  ]),
  signatureData: z.string().optional(),        // base64 signature image for digital
  signedDocumentUrl: z.string().optional(),     // URL for uploaded signed PDF
  notes: z.string().optional(),
});

// ── Query / List Contracts ──
export const contractQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  category: z.enum(CONTRACT_CATEGORIES).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
});

// ── Inferred types ──
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
export type ContractQuery = z.infer<typeof contractQuerySchema>;