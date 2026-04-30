import { z } from "zod";

const designTypeEnum = z.enum([
  "pre_match",
  "post_match",
  "profile_card",
  "match_day_poster",
  "social_post",
  "motm",
  "quote",
  "milestone",
]);

const designStatusEnum = z.enum([
  "draft",
  "in_progress",
  "review",
  "approved",
  "published",
  "archived",
]);

const designFormatEnum = z.enum([
  "square_1080",
  "portrait_1080x1350",
  "landscape_1920x1080",
  "custom",
]);

export const createDesignSchema = z.object({
  title: z.string().min(1).max(200),
  type: designTypeEnum,
  status: designStatusEnum.default("draft"),
  format: designFormatEnum.default("square_1080"),
  playerId: z.string().uuid().optional().nullable(),
  matchId: z.string().uuid().optional().nullable(),
  clubId: z.string().uuid().optional().nullable(),
  assetUrl: z.string().url().max(500).optional().nullable(),
  assetWidth: z.number().int().positive().optional().nullable(),
  assetHeight: z.number().int().positive().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional().nullable(),
});

export const updateDesignSchema = createDesignSchema.partial();

export const designQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sort: z
    .enum(["created_at", "updated_at", "title", "status", "type"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: designStatusEnum.optional(),
  type: designTypeEnum.optional(),
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
});

export type CreateDesignInput = z.infer<typeof createDesignSchema>;
export type UpdateDesignInput = z.infer<typeof updateDesignSchema>;
export type DesignQuery = z.infer<typeof designQuerySchema>;
