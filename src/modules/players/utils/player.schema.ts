import { z } from 'zod';

export const createPlayerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  nationality: z.string().optional(),
  secondaryNationality: z.string().optional(),
  playerType: z.enum(['Pro', 'Youth']).default('Pro'),
  position: z.string().optional(),
  secondaryPosition: z.string().optional(),
  preferredFoot: z.enum(['Left', 'Right', 'Both']).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  currentClubId: z.string().uuid().optional(),
  marketValue: z.number().positive().optional(),
  marketValueCurrency: z.enum(['SAR', 'USD', 'EUR']).default('SAR'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  speed: z.number().int().min(0).max(100).optional(),
  passing: z.number().int().min(0).max(100).optional(),
  shooting: z.number().int().min(0).max(100).optional(),
  defense: z.number().int().min(0).max(100).optional(),
  fitness: z.number().int().min(0).max(100).optional(),
  tactical: z.number().int().min(0).max(100).optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const playerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(['active', 'injured', 'inactive']).optional(),
  playerType: z.enum(['Pro', 'Youth']).optional(),
  clubId: z.string().uuid().optional(),
  position: z.string().optional(),
  nationality: z.string().optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type PlayerQuery = z.infer<typeof playerQuerySchema>;
