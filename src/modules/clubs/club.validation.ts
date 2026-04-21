// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.validation.ts
// Zod validation schemas for the Club module.
//
// Updated: Added exported inferred types to match the pattern
// used in player.validation.ts, user.validation.ts, task.validation.ts,
// and contract.validation.ts.
// ─────────────────────────────────────────────────────────────
import { z } from "zod";

// ── Create Club ──
const createClubBaseSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  nameAr: z.string().optional(),
  type: z.enum(["Club", "Sponsor"]).default("Club"),
  country: z.string().optional(),
  city: z.string().optional(),
  league: z.string().optional(),
  logoUrl: z.string().url("Invalid URL").optional(),
  website: z.string().optional(),
  foundedYear: z.number().int().optional(),
  stadium: z.string().optional(),
  stadiumCapacity: z.number().int().positive().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  notes: z.string().optional(),
  squadType: z
    .enum(["Senior", "U21", "U18", "U17", "U16", "U15", "Reserve"])
    .optional(),
});

export const createClubSchema = createClubBaseSchema.superRefine(
  (data, ctx) => {
    if (data.type === "Club") {
      if (!data.country || data.country.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required for clubs",
          path: ["country"],
        });
      }
      if (!data.league || data.league.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "League is required for clubs",
          path: ["league"],
        });
      }
    }
  },
);

// ── Update Club (partial) ──
export const updateClubSchema = createClubBaseSchema.partial();

// ── Query / List Clubs ──
export const clubQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z
    .enum(["name", "created_at", "updated_at", "country", "league", "type"])
    .default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  type: z.enum(["Club", "Sponsor"]).optional(),
  league: z.string().optional(),
  competitionId: z.string().uuid().optional(),
  season: z.string().optional(),
  country: z.string().optional(),
});

// ── Create Contact ──
export const createContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  nameAr: z.string().optional(),
  role: z.string().min(1, "Contact role is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

// ── Update Contact (partial) ──
export const updateContactSchema = createContactSchema.partial();

// ── Inferred types for service layer ──
export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type ClubQuery = z.infer<typeof clubQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
