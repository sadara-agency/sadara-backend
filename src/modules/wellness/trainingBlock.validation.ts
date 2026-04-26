import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateStr = z.string().regex(DATE_RE, "Date must be YYYY-MM-DD");

const GOAL_VALUES = ["bulk", "cut", "maintenance", "recomp", "rehab"] as const;

export const openBlockSchema = z.object({
  playerId: z.string().uuid(),
  goal: z.enum(GOAL_VALUES),
  durationWeeks: z.number().int().min(1).max(16),
  startedAt: dateStr.optional(),
  startScanId: z.string().uuid().optional().nullable(),
  targetOutcomes: z.record(z.any()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateBlockSchema = openBlockSchema
  .omit({ playerId: true })
  .partial();

export const closeBlockSchema = z.object({
  endScanId: z.string().uuid().optional().nullable(),
  closedAt: dateStr.optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const pauseBlockSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

export const resumeBlockSchema = z.object({});

export const listBlocksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  playerId: z.string().uuid().optional(),
  status: z.enum(["active", "paused", "closed"]).optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
});

export const getBlockSchema = z.object({
  id: z.string().uuid(),
});

export const getPlayerBlocksSchema = z.object({
  playerId: z.string().uuid(),
});

export type OpenBlockDTO = z.infer<typeof openBlockSchema>;
export type UpdateBlockDTO = z.infer<typeof updateBlockSchema>;
export type CloseBlockDTO = z.infer<typeof closeBlockSchema>;
export type PauseBlockDTO = z.infer<typeof pauseBlockSchema>;
export type ListBlocksQueryDTO = z.infer<typeof listBlocksQuerySchema>;
