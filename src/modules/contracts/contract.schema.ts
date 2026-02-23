import { z } from 'zod';

const CONTRACT_CATEGORIES = ['Club', 'Sponsorship'] as const;
const CONTRACT_TYPES = [
  'Representation', 'CareerManagement', 'Transfer', 'Loan',
  'Renewal', 'Sponsorship', 'ImageRights', 'MedicalAuth',
] as const;
const CONTRACT_STATUSES = ['Active', 'Expiring Soon', 'Expired', 'Draft', 'Review', 'Signing', 'Terminated'] as const;
const EXCLUSIVITY_TYPES = ['Exclusive', 'NonExclusive'] as const;
const REPRESENTATION_SCOPES = ['Local', 'International', 'Both'] as const;
const CURRENCIES = ['SAR', 'USD', 'EUR'] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ── Create Contract ──
export const createContractSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
  clubId: z.string().uuid('Invalid club ID'),
  category: z.enum(CONTRACT_CATEGORIES).default('Club'),
  contractType: z.enum(CONTRACT_TYPES).default('Representation'),
  title: z.string().optional(),
  startDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
  baseSalary: z.number().positive('Salary must be positive').optional(),
  salaryCurrency: z.enum(CURRENCIES).default('SAR'),
  signingBonus: z.number().min(0).default(0),
  releaseClause: z.number().positive().optional(),
  performanceBonus: z.number().min(0).default(0),
  commissionPct: z.number().min(0).max(100, 'Commission must be 0-100%').optional(),
  // Representation fields
  exclusivity: z.enum(EXCLUSIVITY_TYPES).default('Exclusive'),
  representationScope: z.enum(REPRESENTATION_SCOPES).default('Both'),
  agentName: z.string().optional(),
  agentLicense: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

// ── Update Contract (partial) ──
export const updateContractSchema = z.object({
  category: z.enum(CONTRACT_CATEGORIES).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
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
  exclusivity: z.enum(EXCLUSIVITY_TYPES).optional(),
  representationScope: z.enum(REPRESENTATION_SCOPES).optional(),
  agentName: z.string().nullable().optional(),
  agentLicense: z.string().nullable().optional(),
  documentUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Transition Status (Draft→Review→Signing→Active) ──
export const transitionStatusSchema = z.object({
  action: z.enum([
    'submit_review',   // Draft → Review
    'approve',         // Review → Signing
    'reject_to_draft', // Review → Draft
    'sign_digital',    // Signing → Active
    'sign_upload',     // Signing → Active
    'return_review',   // Signing → Review
  ]),
  signatureData: z.string().optional(),
  signedDocumentUrl: z.string().optional(),
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
  contractType: z.enum(CONTRACT_TYPES).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
});

// ── Inferred types ──
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ContractQuery = z.infer<typeof contractQuerySchema>;