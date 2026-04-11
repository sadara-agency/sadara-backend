import { z } from "zod";

// ── KPI Dashboard query ──
export const kpiDashboardQuerySchema = z.object({
  playerId: z.string().uuid(),
  season: z.string().max(20).optional(),
});

// ── Stat Trend query ──
export const statTrendQuerySchema = z.object({
  playerId: z.string().uuid(),
  stat: z.string().max(50),
  last: z.coerce.number().int().min(1).max(50).default(10),
});

// ── Benchmark comparison query ──
export const benchmarkCompareQuerySchema = z.object({
  playerId: z.string().uuid(),
  position: z.string().max(50),
  league: z.string().max(50).default("internal"),
  season: z.string().max(20).optional(),
});

// ── Season summary query ──
export const seasonSummaryQuerySchema = z.object({
  playerId: z.string().uuid(),
  season: z.string().max(20).optional(),
});

// ── Positional Benchmark CRUD ──
export const createBenchmarkSchema = z.object({
  position: z.string().max(50),
  league: z.string().max(50),
  season: z.string().max(20),
  stat: z.string().max(50),
  avgValue: z.coerce.number().optional().nullable(),
  p75Value: z.coerce.number().optional().nullable(),
  p90Value: z.coerce.number().optional().nullable(),
  sampleSize: z.coerce.number().int().min(0).optional().nullable(),
  source: z.enum(["internal", "sportmonks", "manual"]).default("manual"),
});

export const updateBenchmarkSchema = createBenchmarkSchema.partial().omit({
  position: true,
  league: true,
  season: true,
  stat: true,
});

export const benchmarkQuerySchema = z.object({
  position: z.string().max(50).optional(),
  league: z.string().max(50).optional(),
  season: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type KpiDashboardQuery = z.infer<typeof kpiDashboardQuerySchema>;
export type StatTrendQuery = z.infer<typeof statTrendQuerySchema>;
export type BenchmarkCompareQuery = z.infer<typeof benchmarkCompareQuerySchema>;
export type SeasonSummaryQuery = z.infer<typeof seasonSummaryQuerySchema>;
export type CreateBenchmarkInput = z.infer<typeof createBenchmarkSchema>;
export type UpdateBenchmarkInput = z.infer<typeof updateBenchmarkSchema>;
export type BenchmarkQuery = z.infer<typeof benchmarkQuerySchema>;
