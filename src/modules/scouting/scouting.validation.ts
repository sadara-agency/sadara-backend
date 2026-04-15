import { z } from "zod";

// ── Watchlist ──

export const createWatchlistSchema = z.object({
  prospectName: z.string().min(1).max(255),
  prospectNameAr: z.string().max(255).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  currentClub: z.string().max(255).optional(),
  currentLeague: z.string().max(255).optional(),
  source: z.string().max(255).optional(),
  videoClips: z.number().int().min(0).default(0),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  technicalRating: z.number().int().min(1).max(10).optional(),
  physicalRating: z.number().int().min(1).max(10).optional(),
  mentalRating: z.number().int().min(1).max(10).optional(),
  potentialRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
});

export const updateWatchlistSchema = createWatchlistSchema.partial();

export const updateWatchlistStatusSchema = z.object({
  status: z.enum(["Active", "Shortlisted", "Archived", "Rejected"]),
});

export const watchlistQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["created_at", "updated_at", "prospect_name", "priority", "status"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.enum(["Active", "Shortlisted", "Archived", "Rejected"]).optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  position: z.string().optional(),
  nationality: z.string().optional(),
});

export const checkDuplicateSchema = z.object({
  name: z.string().min(2).max(255),
  dob: z.string().optional(),
  club: z.string().optional(),
});

// ── Bulk Operations ──

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(["Active", "Shortlisted", "Archived", "Rejected"]),
});

export const bulkPrioritySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  priority: z.enum(["High", "Medium", "Low"]),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export const exportCsvSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

// ── Analytics ──

export const analyticsQuerySchema = z.object({
  scoutId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ── Screening Case ──

export const createScreeningSchema = z.object({
  watchlistId: z.string().uuid(),
  notes: z.string().optional(),
});

export const updateScreeningSchema = z.object({
  identityCheck: z.enum(["Verified", "Pending", "Failed"]).optional(),
  passportVerified: z.boolean().optional(),
  ageVerified: z.boolean().optional(),
  fitAssessment: z.string().optional(),
  riskAssessment: z.string().optional(),
  medicalClearance: z.boolean().optional(),
  // Stat keys stay free-form (each league publishes a different metric set),
  // but values must be finite numbers to match the frontend Record<string, number>
  // contract and prevent mixed-type payloads from leaking into JSONB.
  baselineStats: z.record(z.string().min(1), z.number().finite()).optional(),
  notes: z.string().optional(),
});

export const markPackReadySchema = z.object({
  isPackReady: z.literal(true),
});

// ── Selection Decision (immutable — create only) ──

export const createDecisionSchema = z.object({
  screeningCaseId: z.string().uuid(),
  committeeName: z.string().min(1).max(255),
  decision: z.enum(["Approved", "Rejected", "Deferred"]),
  decisionScope: z.enum(["Full", "Transfer-Only"]).default("Full"),
  decisionDate: z.string().optional(),
  votesFor: z.number().int().min(0).default(0),
  votesAgainst: z.number().int().min(0).default(0),
  votesAbstain: z.number().int().min(0).default(0),
  voteDetails: z
    .array(
      z.object({
        member: z.string(),
        vote: z.enum(["Approve", "Reject", "Abstain"]),
        comment: z.string().optional(),
      }),
    )
    .optional(),
  rationale: z.string().optional(),
  conditions: z.string().optional(),
  dissentingOpinion: z.string().optional(),
});

// ── Types ──

export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>;
export type UpdateWatchlistInput = z.infer<typeof updateWatchlistSchema>;
export type WatchlistQuery = z.infer<typeof watchlistQuerySchema>;
export type CreateScreeningInput = z.infer<typeof createScreeningSchema>;
export type UpdateScreeningInput = z.infer<typeof updateScreeningSchema>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
