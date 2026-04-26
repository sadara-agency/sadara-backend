import { z } from "zod";

// ── Base (shared shape for create + update) ──

const pressReleaseBaseSchema = z.object({
  title: z.string().max(500).optional(),
  titleAr: z.string().max(500).optional(),
  category: z
    .enum(["transfer", "injury", "achievement", "announcement", "general"])
    .default("general"),
  contentEn: z.string().optional(),
  contentAr: z.string().optional(),
  excerptEn: z.string().max(1000).optional(),
  excerptAr: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().max(500).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

// ── Create Press Release ──
// Requires at least one language for the title.

export const createPressReleaseSchema = pressReleaseBaseSchema.refine(
  (d) => !!(d.title?.trim() || d.titleAr?.trim()),
  {
    message: "Title is required (English or Arabic)",
    path: ["title"],
  },
);

// ── Update Press Release ──

export const updatePressReleaseSchema = pressReleaseBaseSchema.partial();

// ── Update Status ──

export const updatePressReleaseStatusSchema = z.object({
  status: z.enum(["draft", "review", "approved", "published", "archived"]),
});

// ── Query ──

export const pressReleaseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z
    .enum(["created_at", "updated_at", "published_at", "title", "status"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z
    .enum(["draft", "review", "approved", "published", "archived"])
    .optional(),
  category: z
    .enum(["transfer", "injury", "achievement", "announcement", "general"])
    .optional(),
});

// ── Inferred Types ──

export type CreatePressReleaseInput = z.infer<typeof createPressReleaseSchema>;
export type UpdatePressReleaseInput = z.infer<typeof updatePressReleaseSchema>;
export type UpdatePressReleaseStatusInput = z.infer<
  typeof updatePressReleaseStatusSchema
>;
export type PressReleaseQuery = z.infer<typeof pressReleaseQuerySchema>;
