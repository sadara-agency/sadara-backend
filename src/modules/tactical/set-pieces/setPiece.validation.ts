import { z } from "zod";

export const createSetPieceSchema = z.object({
  matchId: z.string().uuid(),
  type: z.enum(["corner", "free_kick", "penalty", "throw_in"]),
  side: z.enum(["attacking", "defending"]),
  minute: z.coerce.number().int().min(0).max(120).optional().nullable(),
  takerId: z.string().uuid().optional().nullable(),
  outcome: z
    .enum([
      "goal",
      "shot_on_target",
      "shot_off_target",
      "cleared",
      "penalty_won",
      "penalty_missed",
      "other",
    ])
    .optional()
    .nullable(),
  deliveryType: z
    .enum(["inswinger", "outswinger", "short", "direct", "driven"])
    .optional()
    .nullable(),
  targetZone: z
    .enum(["near_post", "far_post", "center", "edge_of_box", "penalty_spot"])
    .optional()
    .nullable(),
  scorerId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateSetPieceSchema = createSetPieceSchema
  .omit({ matchId: true })
  .partial();

export const setPieceQuerySchema = z.object({
  matchId: z.string().uuid().optional(),
  type: z.enum(["corner", "free_kick", "penalty", "throw_in"]).optional(),
  side: z.enum(["attacking", "defending"]).optional(),
  takerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export type CreateSetPieceInput = z.infer<typeof createSetPieceSchema>;
export type UpdateSetPieceInput = z.infer<typeof updateSetPieceSchema>;
export type SetPieceQuery = z.infer<typeof setPieceQuerySchema>;
