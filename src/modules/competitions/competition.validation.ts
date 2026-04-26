import { z } from "zod";

// ── Create Competition ──
export const createCompetitionSchema = z.object({
  name: z.string().min(1, "Competition name is required"),
  nameAr: z.string().optional(),
  country: z.string().default("Saudi Arabia"),
  type: z.enum(["league", "cup", "super_cup", "friendly"]).default("league"),
  tier: z.number().int().min(1).max(5).default(1),
  ageGroup: z.string().max(20).nullable().optional(),
  gender: z.enum(["men", "women"]).default("men"),
  format: z.enum(["outdoor", "futsal", "beach", "esports"]).default("outdoor"),
  agencyValue: z
    .enum(["Critical", "High", "Medium", "Low", "Scouting", "Niche"])
    .default("Medium"),
  sportmonksLeagueId: z.number().int().nullable().optional(),
  saffId: z.number().int().nullable().optional(),
});

// ── Update Competition ──
export const updateCompetitionSchema = createCompetitionSchema.partial();

// ── Query / List ──
export const competitionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  sort: z.enum(["name", "tier", "created_at", "agency_value"]).default("tier"),
  order: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  type: z.enum(["league", "cup", "super_cup", "friendly"]).optional(),
  tier: z.coerce.number().int().min(1).max(5).optional(),
  ageGroup: z.string().optional(),
  gender: z.enum(["men", "women"]).optional(),
  format: z.enum(["outdoor", "futsal", "beach", "esports"]).optional(),
  agencyValue: z
    .enum(["Critical", "High", "Medium", "Low", "Scouting", "Niche"])
    .optional(),
  isActive: z.coerce.boolean().optional(),
});

// ── Add/Remove Club ──
export const addClubSchema = z.object({
  clubId: z.string().uuid(),
  season: z.string().min(4).max(20),
});

export const clubsQuerySchema = z.object({
  season: z.string().optional(),
});

// ── Inferred types ──
export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
export type CompetitionQuery = z.infer<typeof competitionQuerySchema>;
export type AddClubInput = z.infer<typeof addClubSchema>;
export type ClubsQuery = z.infer<typeof clubsQuerySchema>;
