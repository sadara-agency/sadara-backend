import { z } from "zod";

export const inboxCategoryEnum = z.enum([
  "management_order",
  "disciplinary",
  "fine",
  "directive",
  "mental_task",
]);

export const inboxPriorityEnum = z.enum(["low", "normal", "high", "critical"]);

export const inboxStatusEnum = z.enum([
  "Sent",
  "Viewed",
  "Acknowledged",
  "Resolved",
  "Cancelled",
]);

export const createInboxItemSchema = z
  .object({
    playerId: z.string().uuid(),
    category: inboxCategoryEnum,
    title: z.string().trim().min(1).max(500),
    titleAr: z.string().trim().max(500).optional(),
    body: z.string().trim().min(1).max(8000),
    bodyAr: z.string().trim().max(8000).optional(),
    priority: inboxPriorityEnum.optional(),
    requiresAcknowledgement: z.boolean().optional(),
    fineAmount: z.number().positive().optional(),
    fineCurrency: z.string().trim().length(3).optional(),
    dueAt: z.string().datetime().optional(),
    attachmentDocumentId: z.string().uuid().optional(),
    staffNotes: z.string().trim().max(4000).optional(),
  })
  .refine((d) => d.category !== "fine" || d.fineAmount !== undefined, {
    message: "fineAmount is required when category is 'fine'",
    path: ["fineAmount"],
  });

export const updateInboxItemSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    titleAr: z.string().trim().max(500).nullable().optional(),
    body: z.string().trim().min(1).max(8000).optional(),
    bodyAr: z.string().trim().max(8000).nullable().optional(),
    priority: inboxPriorityEnum.optional(),
    requiresAcknowledgement: z.boolean().optional(),
    fineAmount: z.number().positive().nullable().optional(),
    fineCurrency: z.string().trim().length(3).nullable().optional(),
    dueAt: z.string().datetime().nullable().optional(),
    attachmentDocumentId: z.string().uuid().nullable().optional(),
    staffNotes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const cancelInboxItemSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

const csvOrArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (Array.isArray(v)) return v;
    return [v];
  }, z.array(itemSchema).optional());

export const inboxQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sort: z
    .enum(["created_at", "status", "priority", "due_at"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  playerId: z.string().uuid().optional(),
  category: inboxCategoryEnum.optional(),
  status: inboxStatusEnum.optional(),
});

export const myInboxQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sort: z
    .enum(["created_at", "status", "priority", "due_at"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  category: csvOrArray(inboxCategoryEnum),
  status: csvOrArray(inboxStatusEnum),
  unreadOnly: z.enum(["true", "false"]).optional(),
});

export type CreateInboxItemInput = z.infer<typeof createInboxItemSchema>;
export type UpdateInboxItemInput = z.infer<typeof updateInboxItemSchema>;
export type CancelInboxItemInput = z.infer<typeof cancelInboxItemSchema>;
export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export type MyInboxQuery = z.infer<typeof myInboxQuerySchema>;
