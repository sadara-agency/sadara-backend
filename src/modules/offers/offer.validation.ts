import { z } from "zod";

// ── Pipeline Phase ──

export const OFFER_PHASES = [
  "ID",
  "Acquire",
  "Map",
  "Negotiate",
  "Media",
  "Close",
] as const;
export type OfferPhase = (typeof OFFER_PHASES)[number];

// ── Create Offer ──

export const createOfferSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  fromClubId: z.string().uuid("Invalid club ID").optional(),
  toClubId: z.string().uuid("Invalid club ID").optional(),
  offerType: z.enum(["Transfer", "Loan"]).default("Transfer"),
  transferFee: z.number().min(0).optional(),
  salaryOffered: z.number().min(0).optional(),
  contractYears: z.number().int().min(1).max(10).optional(),
  agentFee: z.number().min(0).optional(),
  feeCurrency: z.enum(["SAR", "USD", "EUR"]).default("SAR"),
  conditions: z.array(z.record(z.unknown())).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .refine(
      (d) => new Date(d) >= new Date(new Date().toISOString().split("T")[0]),
      { message: "Deadline cannot be in the past" },
    )
    .optional(),
  notes: z.string().optional(),
  phase: z
    .enum(["ID", "Acquire", "Map", "Negotiate", "Media", "Close"])
    .optional(),
  windowId: z.string().uuid().optional(),
});

// ── Update Offer ──

export const updateOfferSchema = createOfferSchema.partial();

// ── Update Offer Phase ──

export const updateOfferPhaseSchema = z.object({
  phase: z.enum(["ID", "Acquire", "Map", "Negotiate", "Media", "Close"]),
  saffRegDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  itcFiledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  medicalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  hotSignedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  blockerNotes: z.string().max(2000).optional().nullable(),
});
export type UpdateOfferPhaseInput = z.infer<typeof updateOfferPhaseSchema>;

// ── Update Offer Status ──

export const updateOfferStatusSchema = z.object({
  status: z.enum([
    "New",
    "Under Review",
    "Negotiation",
    "Accepted",
    "Rejected",
    "Closed",
  ]),
  counterOffer: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

// ── Query Offers ──

export const offerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum([
      "created_at",
      "updated_at",
      "deadline",
      "transfer_fee",
      "status",
      "offer_type",
    ])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z
    .enum([
      "New",
      "Under Review",
      "Negotiation",
      "Accepted",
      "Rejected",
      "Closed",
    ])
    .optional(),
  offerType: z.enum(["Transfer", "Loan"]).optional(),
  playerId: z.string().uuid().optional(),
  fromClubId: z.string().uuid().optional(),
  toClubId: z.string().uuid().optional(),
  phase: z
    .enum(["ID", "Acquire", "Map", "Negotiate", "Media", "Close"])
    .optional(),
  windowId: z.string().uuid().optional(),
});

// ── Inferred Types ──

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type UpdateOfferStatusInput = z.infer<typeof updateOfferStatusSchema>;
export type OfferQuery = z.infer<typeof offerQuerySchema>;
// UpdateOfferPhaseInput exported above alongside its schema
