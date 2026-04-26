import { z } from "zod";

// ── Base (shared shape for create + update) ──

const mediaContactBaseSchema = z.object({
  name: z.string().max(255).optional(),
  nameAr: z.string().max(255).optional(),
  outlet: z.string().max(255).optional(),
  outletAr: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  notes: z.string().optional(),
});

// ── Create Media Contact ──
// Requires at least one language for name and outlet.

export const createMediaContactSchema = mediaContactBaseSchema
  .refine((d) => !!(d.name?.trim() || d.nameAr?.trim()), {
    message: "Name is required (English or Arabic)",
    path: ["name"],
  })
  .refine((d) => !!(d.outlet?.trim() || d.outletAr?.trim()), {
    message: "Outlet is required (English or Arabic)",
    path: ["outlet"],
  });

// ── Update Media Contact ──

export const updateMediaContactSchema = mediaContactBaseSchema.partial();

// ── Query ──

export const mediaContactQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
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
