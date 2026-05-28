import { z } from "zod";

const PERIOD_TYPES = ["Season", "DateRange", "LastNMatches"] as const;

export const REPORT_TYPES = [
  "PreSigning",
  "MidSeason",
  "MatchReport",
  "Periodic",
  "Scouting",
] as const;

export const REPORT_VERDICTS = [
  "Primary",
  "Monitor",
  "Reject",
  "Promote",
  "Hold",
] as const;

const ratingScale = z.number().int().min(1).max(10);

const structuredContentSchema = z
  .object({
    header: z
      .object({
        date: z.string().optional(),
        scoutName: z.string().max(120).optional(),
      })
      .partial()
      .optional(),
    ratings: z
      .object({
        technical: z.record(ratingScale).optional(),
        tactical: z.record(ratingScale).optional(),
        physical: z.record(ratingScale).optional(),
        mental: z.record(ratingScale).optional(),
      })
      .partial()
      .optional(),
    qualitative: z
      .object({
        overview: z.string().max(4000).optional(),
        strengths: z.string().max(2000).optional(),
        improvements: z.string().max(2000).optional(),
        recommendation: z.string().max(2000).optional(),
      })
      .partial()
      .optional(),
    kpis: z.record(z.number()).optional(),
  })
  .partial()
  .optional();

export const createReportSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  title: z.string().min(1, "Title is required").max(255),
  periodType: z.enum(PERIOD_TYPES),
  periodParams: z.record(z.any()).default({}),
  notes: z.string().max(2000).optional(),
  reportType: z.enum(REPORT_TYPES).optional(),
  matchContext: z.string().max(255).optional(),
  verdict: z.enum(REPORT_VERDICTS).optional(),
  readiness: z.number().int().min(1).max(10).optional(),
  potential: z.number().int().min(1).max(10).optional(),
  structuredContent: structuredContentSchema,
});

export const updateReportSchema = createReportSchema
  .omit({ playerId: true })
  .partial();

export const reportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  playerId: z.string().uuid().optional(),
  status: z
    .enum([
      "Draft",
      "Generating",
      "Generated",
      "Failed",
      "AiDraft",
      "Reviewing",
      "Published",
    ])
    .optional(),
  reportType: z.enum(REPORT_TYPES).optional(),
  sort: z.enum(["createdAt", "overall_score", "title"]).optional(),
});

export const publishReportSchema = z.object({
  editedContent: z.string().min(1).max(50_000).optional(),
});

export type PublishReportInput = z.infer<typeof publishReportSchema>;

export const reportFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  playerContractType: z.string().optional(),
  expiryWindow: z.coerce.number().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportFilters = z.infer<typeof reportFiltersSchema>;
