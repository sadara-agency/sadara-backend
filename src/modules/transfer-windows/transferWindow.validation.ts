import { z } from "zod";

const weightsSchema = z
  .object({
    performance: z.number().min(0).max(100),
    contractFit: z.number().min(0).max(100),
    commercial: z.number().min(0).max(100),
    culturalFit: z.number().min(0).max(100),
  })
  .refine(
    (w) => w.performance + w.contractFit + w.commercial + w.culturalFit === 100,
    { message: "Weights must sum to 100" },
  );

const tierTargetsSchema = z.object({
  A: z.number().int().min(0),
  B: z.number().int().min(0),
  C: z.number().int().min(0),
});

export const createTransferWindowSchema = z.object({
  season: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  saffWindowStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  saffWindowEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  shortlistThreshold: z.number().int().min(0).max(100).default(60),
  weights: weightsSchema.optional(),
  tierTargets: tierTargetsSchema.optional(),
  status: z.enum(["Upcoming", "Active", "Closed"]).default("Upcoming"),
  notes: z.string().optional(),
});

export const updateTransferWindowSchema = createTransferWindowSchema.partial();

export const transferWindowQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["season", "start_date", "end_date", "status", "created_at"])
    .default("start_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["Upcoming", "Active", "Closed"]).optional(),
});

export type CreateTransferWindowInput = z.infer<
  typeof createTransferWindowSchema
>;
export type UpdateTransferWindowInput = z.infer<
  typeof updateTransferWindowSchema
>;
export type TransferWindowQuery = z.infer<typeof transferWindowQuerySchema>;
