import { z } from "zod";

export const createPersonalNoteSchema = z.object({
  title: z.string().max(500).default(""),
  body: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPinned: z.boolean().optional(),
});

export const updatePersonalNoteSchema = z.object({
  title: z.string().max(500).optional(),
  body: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPinned: z.boolean().optional(),
});

export const personalNoteQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  search: z.string().optional(),
  tag: z.string().optional(),
  isPinned: z.enum(["true", "false"]).optional(),
});

export const personalNoteParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreatePersonalNoteDTO = z.infer<typeof createPersonalNoteSchema>;
export type UpdatePersonalNoteDTO = z.infer<typeof updatePersonalNoteSchema>;
export type PersonalNoteQuery = z.infer<typeof personalNoteQuerySchema>;
