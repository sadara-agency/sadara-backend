// ─────────────────────────────────────────────────────────────
// src/modules/analystviews/analystview.validation.ts
// ─────────────────────────────────────────────────────────────
import { z } from "zod";
import {
  ANALYST_PERSONAS,
  ANALYST_VIEW_SHARE_SCOPES,
} from "@modules/analystviews/analystview.model";

// 16 KB cap on serialised params — protects against runaway view payloads
export const PARAMS_JSON_MAX_BYTES = 16 * 1024;

const paramsJsonSchema = z
  .record(z.unknown())
  .refine(
    (v) =>
      Buffer.byteLength(JSON.stringify(v), "utf8") <= PARAMS_JSON_MAX_BYTES,
    { message: `params_json exceeds ${PARAMS_JSON_MAX_BYTES} bytes` },
  );

export const personaSchema = z.enum(ANALYST_PERSONAS);

export const createAnalystViewSchema = z.object({
  persona: personaSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  routePath: z.string().trim().min(1).max(255),
  paramsJson: paramsJsonSchema.default({}),
  isPinned: z.boolean().optional(),
  isShared: z.boolean().optional(),
  shareScope: z.enum(ANALYST_VIEW_SHARE_SCOPES).optional(),
  sharedRoleIds: z.array(z.string().min(1)).optional().nullable(),
});

export const updateAnalystViewSchema = createAnalystViewSchema.partial();

export const analystViewIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const analystViewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z
    .enum(["last_viewed_at", "created_at", "name", "view_count"])
    .default("last_viewed_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  persona: personaSchema.optional(),
  pinnedOnly: z.coerce.boolean().optional(),
});

export type CreateAnalystViewDTO = z.infer<typeof createAnalystViewSchema>;
export type UpdateAnalystViewDTO = z.infer<typeof updateAnalystViewSchema>;
export type AnalystViewQuery = z.infer<typeof analystViewQuerySchema>;
