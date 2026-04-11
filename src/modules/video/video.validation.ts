import { z } from "zod";

const TAG_TYPES = [
  "goal",
  "assist",
  "defensive_action",
  "set_piece",
  "pressing",
  "transition",
  "mistake",
  "custom",
] as const;

export const createClipSchema = z.object({
  matchId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  titleAr: z.string().max(200).optional(),
  storageProvider: z.enum(["gcs", "external"]).optional(),
  storagePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  thumbnailPath: z.string().optional(),
  durationSec: z.number().int().positive().optional(),
  fileSizeMb: z.number().positive().optional(),
  mimeType: z.string().max(50).optional(),
  startTime: z.number().int().min(0).optional(),
  endTime: z.number().int().min(0).optional(),
  status: z.enum(["processing", "ready", "failed"]).optional(),
});

export const updateClipSchema = createClipSchema.partial();

export const listClipsSchema = z.object({
  matchId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
  status: z.enum(["processing", "ready", "failed"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createTagSchema = z.object({
  tagType: z.enum(TAG_TYPES),
  label: z.string().max(100).optional(),
  labelAr: z.string().max(100).optional(),
  timestampSec: z.number().int().min(0).optional(),
  playerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateTagSchema = createTagSchema.partial();

export type CreateClipDTO = z.infer<typeof createClipSchema>;
export type UpdateClipDTO = z.infer<typeof updateClipSchema>;
export type ListClipsQuery = z.infer<typeof listClipsSchema>;
export type CreateTagDTO = z.infer<typeof createTagSchema>;
export type UpdateTagDTO = z.infer<typeof updateTagSchema>;
