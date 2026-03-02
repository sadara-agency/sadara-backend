// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.schema.ts
// Zod validation schemas for the Club module.
//
// Updated: Added exported inferred types to match the pattern
// used in player.schema.ts, user.schema.ts, task.schema.ts,
// and contract.schema.ts.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod';

// ── Create Club ──
export const createClubSchema = z.object({
  name: z.string().min(1, 'Club name is required'),
  nameAr: z.string().optional(),
  type: z.enum(['Club', 'Sponsor']).default('Club'),
  country: z.string().optional(),
  city: z.string().optional(),
  league: z.string().optional(),
  logoUrl: z.string().url('Invalid URL').optional(),
  website: z.string().optional(),
  foundedYear: z.number().int().optional(),
  stadium: z.string().optional(),
  stadiumCapacity: z.number().int().positive().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  notes: z.string().optional(),
});

// ── Update Club (partial) ──
export const updateClubSchema = createClubSchema.partial();

// ── Query / List Clubs ──
export const clubQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  type: z.enum(['Club', 'Sponsor']).optional(),
  country: z.string().optional(),
});

// ── Create Contact ──
export const createContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  name_ar: z.string().optional(),
  role: z.string().min(1, 'Contact role is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  is_primary: z.boolean().default(false),
});

// ── Update Contact (partial) ──
export const updateContactSchema = createContactSchema.partial();

// ── Inferred types for service layer ──
export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type ClubQuery = z.infer<typeof clubQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;