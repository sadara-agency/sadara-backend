import { z } from "zod";

// ── Create Conversation ──

export const createConversationSchema = z
  .object({
    type: z.enum(["direct", "group"]).default("direct"),
    title: z.string().max(255).optional(),
    titleAr: z.string().max(255).optional(),
    participantIds: z.array(z.string().uuid()).min(1).max(50),
  })
  .refine(
    (data) => data.type !== "group" || (data.title && data.title.trim()),
    { message: "Group conversations require a title", path: ["title"] },
  );

// ── Send Message ──

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000),
  contentAr: z.string().max(5000).optional(),
});

// ── Update Conversation (group rename) ──

export const updateConversationSchema = z.object({
  title: z.string().max(255).optional(),
  titleAr: z.string().max(255).optional(),
});

// ── Add Participants ──

export const addParticipantsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

// ── Query Conversations ──

export const conversationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  archived: z.coerce.boolean().default(false),
});

// ── Query Messages ──

export const messageQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  before: z.string().optional(), // ISO timestamp cursor
});

// ── Search Messages ──

export const searchMessagesSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
});

// ── Inferred Types ──

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;
export type ConversationQuery = z.infer<typeof conversationQuerySchema>;
export type MessageQuery = z.infer<typeof messageQuerySchema>;
export type SearchMessagesQuery = z.infer<typeof searchMessagesSchema>;
