import { z } from "zod";

export const createClubNeedSchema = z.object({
  clubId: z.string().uuid(),
  windowId: z.string().uuid(),
  position: z.string().min(1).max(30),
  positionalGapNotes: z.string().optional(),
  dealPreference: z.enum(["Transfer", "Loan", "Either"]).default("Either"),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  sadaraOpportunity: z.string().optional(),
  matchScore: z.number().int().min(1).max(10).optional(),
});

export const updateClubNeedSchema = createClubNeedSchema
  .partial()
  .omit({ clubId: true, windowId: true });

export const clubNeedQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  sort: z.enum(["priority", "position", "created_at"]).default("priority"),
  order: z.enum(["asc", "desc"]).default("desc"),
  windowId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
});

export type CreateClubNeedInput = z.infer<typeof createClubNeedSchema>;
export type UpdateClubNeedInput = z.infer<typeof updateClubNeedSchema>;
export type ClubNeedQuery = z.infer<typeof clubNeedQuerySchema>;
