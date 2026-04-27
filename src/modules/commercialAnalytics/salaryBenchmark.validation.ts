import { z } from "zod";

const TIERS = ["low", "mid", "high"] as const;
const PLAYER_TYPES = ["Pro", "Youth", "Amateur"] as const;

export const createSalaryBenchmarkSchema = z.object({
  position: z.string().min(1).max(20),
  tier: z.enum(TIERS),
  annualSalarySar: z.number().positive().max(500_000_000),
  league: z.string().min(1).max(50),
  playerType: z.enum(PLAYER_TYPES).default("Pro"),
  season: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Season must be YYYY-YY format")
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateSalaryBenchmarkSchema =
  createSalaryBenchmarkSchema.partial();

export const listSalaryBenchmarksSchema = z.object({
  position: z.string().max(20).optional(),
  league: z.string().max(50).optional(),
  season: z.string().max(10).optional(),
  playerType: z.enum(PLAYER_TYPES).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(v ? parseInt(v, 10) : 50, 200)),
});

export type CreateSalaryBenchmarkDTO = z.infer<
  typeof createSalaryBenchmarkSchema
>;
export type UpdateSalaryBenchmarkDTO = z.infer<
  typeof updateSalaryBenchmarkSchema
>;
