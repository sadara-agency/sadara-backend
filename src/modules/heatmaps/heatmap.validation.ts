import { z } from "zod";

const HALVES = ["first", "second"] as const;
const COORDINATE_SYSTEMS = ["normalized_0_100", "meters"] as const;
const SOURCES = ["manual", "sportmonks", "upload", "api"] as const;

const positionTripletSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    timestamp: z.number().finite().min(0),
  })
  .strict();

export const createHeatmapDataSchema = z
  .object({
    playerId: z.string().uuid("Invalid player ID"),
    matchId: z.string().uuid("Invalid match ID").nullable().optional(),
    positions: z
      .array(positionTripletSchema)
      .min(1, "At least one position required")
      .max(20000, "Too many positions (max 20000)"),
    durationSeconds: z.number().int().min(0).max(36000).nullable().optional(),
    coordinateSystem: z.enum(COORDINATE_SYSTEMS).optional(),
    half: z.enum(HALVES).nullable().optional(),
    source: z.enum(SOURCES).optional(),
    /** Replace existing data for (playerId, matchId, half) instead of 409. */
    replace: z.boolean().optional(),
  })
  .strict();

export const playerHeatmapsQuerySchema = z.object({
  matchId: z.string().uuid().optional(),
  half: z.enum(HALVES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const aggregateHeatmapQuerySchema = z.object({
  half: z.enum(HALVES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const heatmapIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const playerIdParamsSchema = z.object({
  playerId: z.string().uuid(),
});

export const matchIdParamsSchema = z.object({
  matchId: z.string().uuid(),
});

export type CreateHeatmapInput = z.infer<typeof createHeatmapDataSchema>;
export type PlayerHeatmapsQuery = z.infer<typeof playerHeatmapsQuerySchema>;
export type AggregateHeatmapQuery = z.infer<typeof aggregateHeatmapQuerySchema>;
