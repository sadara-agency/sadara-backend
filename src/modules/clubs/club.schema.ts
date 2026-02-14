import { z } from 'zod';

export const createClubSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  type: z.enum(['Club', 'Sponsor']).default('Club'),
  country: z.string().optional(),
  city: z.string().optional(),
  league: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().optional(),
  foundedYear: z.number().int().optional(),
  stadium: z.string().optional(),
  stadiumCapacity: z.number().int().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClubSchema = createClubSchema.partial();

export const clubQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  type: z.enum(['Club', 'Sponsor']).optional(),
  country: z.string().optional(),
});
