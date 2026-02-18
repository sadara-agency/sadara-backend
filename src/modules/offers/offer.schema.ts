import { z } from 'zod';

// ── Create Offer ──

export const createOfferSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
  fromClubId: z.string().uuid('Invalid club ID').optional(),
  toClubId: z.string().uuid('Invalid club ID').optional(),
  offerType: z.enum(['Transfer', 'Loan']).default('Transfer'),
  transferFee: z.number().min(0).optional(),
  salaryOffered: z.number().min(0).optional(),
  contractYears: z.number().int().min(1).max(10).optional(),
  agentFee: z.number().min(0).optional(),
  feeCurrency: z.enum(['SAR', 'USD', 'EUR']).default('SAR'),
  conditions: z.array(z.record(z.unknown())).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  notes: z.string().optional(),
});

// ── Update Offer ──

export const updateOfferSchema = createOfferSchema.partial();

// ── Update Offer Status ──

export const updateOfferStatusSchema = z.object({
  status: z.enum(['New', 'Under Review', 'Negotiation', 'Closed']),
  counterOffer: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

// ── Query Offers ──

export const offerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(['New', 'Under Review', 'Negotiation', 'Closed']).optional(),
  offerType: z.enum(['Transfer', 'Loan']).optional(),
  playerId: z.string().uuid().optional(),
  fromClubId: z.string().uuid().optional(),
  toClubId: z.string().uuid().optional(),
});

// ── Inferred Types ──

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type UpdateOfferStatusInput = z.infer<typeof updateOfferStatusSchema>;
export type OfferQuery = z.infer<typeof offerQuerySchema>;