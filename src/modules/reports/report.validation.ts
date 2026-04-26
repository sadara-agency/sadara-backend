import { z } from "zod";

const PERIOD_TYPES = ["Season", "DateRange", "LastNMatches"] as const;

export const createReportSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  title: z.string().min(1, "Title is required").max(255),
  periodType: z.enum(PERIOD_TYPES),
  periodParams: z.record(z.any()).default({}),
  notes: z.string().max(2000).optional(),
});

export const reportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  playerId: z.string().uuid().optional(),
  status: z.enum(["Draft", "Generating", "Generated", "Failed"]).optional(),
});

export const reportFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  playerContractType: z.string().optional(),
  expiryWindow: z.coerce.number().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportFilters = z.infer<typeof reportFiltersSchema>;
