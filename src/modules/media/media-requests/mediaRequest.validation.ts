import { z } from "zod";

// ── Create Media Request ──

export const createMediaRequestSchema = z.object({
  journalistName: z.string().min(1).max(255),
  journalistNameAr: z.string().max(255).optional(),
  outlet: z.string().min(1).max(255),
  outletAr: z.string().max(255).optional(),
  journalistEmail: z.string().email().optional(),
  journalistPhone: z.string().max(100).optional(),
  requestType: z
    .enum([
      "interview",
      "press_conference",
      "photo_shoot",
      "statement",
      "other",
    ])
    .default("interview"),
  subject: z.string().min(1).max(500),
  subjectAr: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  deadline: z.string().datetime({ offset: true }).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().optional(),
  mediaContactId: z.string().uuid().optional(),
});

// ── Update Media Request ──

export const updateMediaRequestSchema = createMediaRequestSchema.partial();

// ── Update Status ──

export const updateMediaRequestStatusSchema = z.object({
  status: z.enum(["pending", "approved", "scheduled", "completed", "declined"]),
  declineReason: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

// ── Query ──

export const mediaRequestQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["created_at", "updated_at", "deadline", "status", "priority"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z
    .enum(["pending", "approved", "scheduled", "completed", "declined"])
    .optional(),
  requestType: z
    .enum([
      "interview",
      "press_conference",
      "photo_shoot",
      "statement",
      "other",
    ])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  playerId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

// ── Inferred Types ──

export type CreateMediaRequestInput = z.infer<typeof createMediaRequestSchema>;
export type UpdateMediaRequestInput = z.infer<typeof updateMediaRequestSchema>;
export type UpdateMediaRequestStatusInput = z.infer<
  typeof updateMediaRequestStatusSchema
>;
export type MediaRequestQuery = z.infer<typeof mediaRequestQuerySchema>;
