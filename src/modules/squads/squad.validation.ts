// ─────────────────────────────────────────────────────────────
// src/modules/squads/squad.validation.ts
// Zod schemas for the read-only squads API. Squads are created
// indirectly by the SAFF wizard (Phase 3 of the refactor) via
// findOrCreateSquad — there is no public create/update endpoint.
// ─────────────────────────────────────────────────────────────
import { z } from "zod";
import { SQUAD_AGE_CATEGORIES } from "@modules/squads/squad.model";

export const ageCategorySchema = z.enum(SQUAD_AGE_CATEGORIES);

export const squadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  sort: z
    .enum(["display_name", "age_category", "created_at", "updated_at"])
    .default("display_name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().trim().min(1).optional(),
  clubId: z.string().uuid().optional(),
  ageCategory: ageCategorySchema.optional(),
  division: z.string().trim().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const squadIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const squadByClubParamSchema = z.object({
  clubId: z.string().uuid(),
});

export type SquadQuery = z.infer<typeof squadQuerySchema>;
