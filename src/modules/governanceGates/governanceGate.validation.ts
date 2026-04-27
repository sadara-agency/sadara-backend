import { z } from "zod";

const GATE_TYPES = [
  "cross_border_transfer",
  "external_share",
  "restricted_data",
  "publish",
] as const;

const GATE_STATUSES = ["pending", "approved", "rejected", "bypassed"] as const;

export const triggerGateSchema = z.object({
  gateType: z.enum(GATE_TYPES),
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  entityTitle: z.string().max(255).optional(),
  justification: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const resolveGateSchema = z.object({
  action: z.enum(["approve", "reject", "bypass"]),
  reviewerNotes: z.string().max(2000).optional(),
});

export const listGatesSchema = z.object({
  status: z.enum(GATE_STATUSES).optional(),
  gateType: z.enum(GATE_TYPES).optional(),
  entityType: z.string().max(50).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(v ? parseInt(v, 10) : 20, 100)),
});

export type TriggerGateDTO = z.infer<typeof triggerGateSchema>;
export type ResolveGateDTO = z.infer<typeof resolveGateSchema>;
