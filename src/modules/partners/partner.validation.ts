import { z } from "zod";

const CAPACITIES = ["Introducer", "FIFA Agent"] as const;
const STATUSES = ["Active", "Suspended", "Withdrawn"] as const;

export const createPartnerSchema = z.object({
  nameEn: z.string().min(2).max(200),
  nameAr: z.string().max(200).optional(),
  capacity: z.enum(CAPACITIES),
  corridor: z.string().max(100).optional(),
  fifaAgentId: z.string().max(100).optional(),
  contactEmail: z.string().email(),
  validFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  validThrough: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  userId: z.string().uuid().optional(),
});

export const updatePartnerSchema = createPartnerSchema
  .extend({
    status: z.enum(STATUSES).optional(),
  })
  .partial();

export const getPartnerSchema = z.object({ id: z.string().uuid() });

export type CreatePartnerDTO = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerDTO = z.infer<typeof updatePartnerSchema>;
