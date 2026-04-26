import { z } from "zod";

// ── Generate Player Profile ──

export const generatePlayerKitSchema = z.object({
  language: z.enum(["en", "ar", "both"]).default("both"),
});

// ── Generate Squad Roster ──

export const generateSquadKitSchema = z.object({
  language: z.enum(["en", "ar", "both"]).default("both"),
});

// ── Query History ──

export const mediaKitHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z.enum(["created_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  templateType: z.enum(["player_profile", "squad_roster"]).optional(),
  playerId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
});

// ── Inferred Types ──

export type GeneratePlayerKitInput = z.infer<typeof generatePlayerKitSchema>;
export type GenerateSquadKitInput = z.infer<typeof generateSquadKitSchema>;
export type MediaKitHistoryQuery = z.infer<typeof mediaKitHistoryQuerySchema>;
