import { z } from "zod";

export const EVENT_TYPES = [
  "goal",
  "assist",
  "shot",
  "shot_on_target",
  "pass",
  "pass_incomplete",
  "key_pass",
  "tackle",
  "interception",
  "foul",
  "yellow",
  "red",
  "dribble",
  "dribble_failed",
  "duel_won",
  "duel_lost",
  "save",
] as const;

export const createEventTagSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  tagType: z.enum(EVENT_TYPES),
  timestampSec: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const listEventTagsSchema = z.object({
  playerId: z.string().uuid().optional(),
});

export type CreateEventTagDTO = z.infer<typeof createEventTagSchema>;
export type ListEventTagsQuery = z.infer<typeof listEventTagsSchema>;
