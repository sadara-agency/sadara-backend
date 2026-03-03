import { z } from "zod";

const OWNER_TYPES = [
  "Player",
  "Contract",
  "Match",
  "Injury",
  "Club",
  "Offer",
] as const;

export const createNoteSchema = z.object({
  ownerType: z.enum(OWNER_TYPES),
  ownerId: z.string().uuid("Invalid owner ID"),
  content: z.string().min(1, "Content is required").max(5000),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
});

export const noteQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  ownerType: z.enum(OWNER_TYPES).optional(),
  ownerId: z.string().uuid().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type NoteQuery = z.infer<typeof noteQuerySchema>;
