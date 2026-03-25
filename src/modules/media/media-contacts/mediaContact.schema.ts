import { z } from "zod";

// ── Create Media Contact ──

export const createMediaContactSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  outlet: z.string().min(1).max(255),
  outletAr: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  notes: z.string().optional(),
});

// ── Update Media Contact ──

export const updateMediaContactSchema = createMediaContactSchema.partial();

// ── Query ──

export const mediaContactQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["created_at", "updated_at", "name", "outlet"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  outlet: z.string().optional(),
});

// ── Inferred Types ──

export type CreateMediaContactInput = z.infer<typeof createMediaContactSchema>;
export type UpdateMediaContactInput = z.infer<typeof updateMediaContactSchema>;
export type MediaContactQuery = z.infer<typeof mediaContactQuerySchema>;
