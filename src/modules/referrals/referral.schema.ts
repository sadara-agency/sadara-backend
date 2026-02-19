import { z } from 'zod';

const referralTypes = ['Performance', 'Mental', 'Medical'] as const;
const referralStatuses = ['Open', 'InProgress', 'Resolved', 'Escalated'] as const;
const referralPriorities = ['Low', 'Medium', 'High', 'Critical'] as const;

// ── Create Referral ──

export const createReferralSchema = z.object({
    referralType: z.enum(referralTypes),
    playerId: z.string().uuid('Invalid player ID'),
    triggerDesc: z.string().optional(),
    priority: z.enum(referralPriorities).default('Medium'),
    assignedTo: z.string().uuid().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    isRestricted: z.boolean().default(false),
    restrictedTo: z.array(z.string().uuid()).optional(),
});

// ── Update Referral ──

export const updateReferralSchema = z.object({
    referralType: z.enum(referralTypes).optional(),
    priority: z.enum(referralPriorities).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    notes: z.string().optional(),
    evidenceCount: z.number().int().min(0).optional(),
    sessionCount: z.number().int().min(0).optional(),
    isRestricted: z.boolean().optional(),
    restrictedTo: z.array(z.string().uuid()).optional(),
});

// ── Update Status ──

export const updateReferralStatusSchema = z.object({
    status: z.enum(referralStatuses),
    outcome: z.string().optional(),
    notes: z.string().optional(),
});

// ── Query Referrals ──

export const referralQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    status: z.enum(referralStatuses).optional(),
    referralType: z.enum(referralTypes).optional(),
    priority: z.enum(referralPriorities).optional(),
    playerId: z.string().uuid().optional(),
    assignedTo: z.string().uuid().optional(),
});

// ── Inferred Types ──

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;
export type UpdateReferralStatusInput = z.infer<typeof updateReferralStatusSchema>;
export type ReferralQuery = z.infer<typeof referralQuerySchema>;