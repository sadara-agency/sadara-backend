import { z } from "zod";

// ── Base (shared shape for create + update) ──

const socialPostBaseSchema = z.object({
  title: z.string().max(500).optional(),
  titleAr: z.string().max(500).optional(),
  contentEn: z.string().optional(),
  contentAr: z.string().optional(),
  postType: z.enum([
    "match_day",
    "transfer",
    "injury_update",
    "achievement",
    "general",
    "custom",
  ]),
  platforms: z
    .array(z.enum(["twitter", "instagram", "linkedin", "facebook", "tiktok"]))
    .min(1),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

// ── Create ──
// Requires at least one language for the title.

export const createSocialPostSchema = socialPostBaseSchema.refine(
  (d) => !!(d.title?.trim() || d.titleAr?.trim()),
  {
    message: "Title is required (English or Arabic)",
    path: ["title"],
  },
);

// ── Update ──

export const updateSocialPostSchema = socialPostBaseSchema.partial();

// ── Update Status ──

export const updateSocialPostStatusSchema = z.object({
  status: z.enum(["draft", "scheduled", "published", "archived"]),
});

// ── Query ──

export const socialPostQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z
    .enum(["created_at", "scheduled_at", "published_at"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  postType: z
    .enum([
      "match_day",
      "transfer",
      "injury_update",
      "achievement",
      "general",
      "custom",
    ])
    .optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  search: z.string().optional(),
});

// ── Inferred Types ──

export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>;
export type UpdateSocialPostInput = z.infer<typeof updateSocialPostSchema>;
export type UpdateSocialPostStatusInput = z.infer<
  typeof updateSocialPostStatusSchema
>;
export type SocialPostQuery = z.infer<typeof socialPostQuerySchema>;
