import { z } from "zod";

const ARABIC_RE =
  /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s'-]+$/;
const ENGLISH_NAME_RE = /^[A-Za-z\s'-]+$/;

const technicalAttributesSchema = z
  .object({
    group: z.enum(["GK", "DEF", "CDM", "CAM_WING", "ST"]),
    attributes: z.record(z.string(), z.number().int().min(0).max(100)),
  })
  .nullable()
  .optional();

export const createPlayerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or less")
    .regex(ENGLISH_NAME_RE, "First name must be in English characters only"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or less")
    .regex(ENGLISH_NAME_RE, "Last name must be in English characters only"),
  firstNameAr: z
    .string()
    .min(1, "Arabic first name is required")
    .max(100, "Arabic first name must be 100 characters or less")
    .regex(ARABIC_RE, "Arabic first name must be in Arabic characters only"),
  lastNameAr: z
    .string()
    .min(1, "Arabic last name is required")
    .max(100, "Arabic last name must be 100 characters or less")
    .regex(ARABIC_RE, "Arabic last name must be in Arabic characters only"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .refine(
      (val) => new Date(val) <= new Date(),
      "Date of birth cannot be in the future",
    ),
  nationality: z.string().min(1, "Nationality is required"),
  secondaryNationality: z.string().optional(),
  playerType: z.enum(["Pro", "Youth", "Amateur"]).default("Pro"),
  contractType: z
    .enum(["Professional", "Amateur", "Youth"])
    .default("Professional"),
  position: z.string().min(1, "Position is required"),
  secondaryPosition: z.string().optional(),
  preferredFoot: z.enum(["Left", "Right", "Both"]),
  heightCm: z.number().positive().min(50).max(250),
  weightKg: z.number().positive().min(20).max(200),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  currentClubId: z.string().uuid().optional(),
  marketValue: z.number().positive().optional(),
  marketValueCurrency: z.enum(["SAR", "USD", "EUR"]).default("SAR"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[+\d][\d\s\-().]{4,25}$/, "Invalid phone number format"),
  overallGrade: z
    .string()
    .max(10, "Grade must be 10 characters or less")
    .optional(),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
  // Physical attributes (0-100)
  pace: z.number().int().min(0).max(100).optional(),
  stamina: z.number().int().min(0).max(100).optional(),
  strength: z.number().int().min(0).max(100).optional(),
  agility: z.number().int().min(0).max(100).optional(),
  jumping: z.number().int().min(0).max(100).optional(),
  // Technical attributes (position-specific JSONB)
  technicalAttributes: technicalAttributesSchema,
  // Legacy (deprecated — kept for backward compat)
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
  sort: z
    .enum([
      "created_at",
      "updated_at",
      "first_name",
      "last_name",
      "date_of_birth",
      "position",
      "nationality",
      "jersey_number",
      "market_value",
    ])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.enum(["active", "injured", "inactive"]).optional(),
  playerType: z.enum(["Pro", "Youth", "Amateur"]).optional(),
  contractType: z.enum(["Professional", "Amateur", "Youth"]).optional(),
  clubId: z.string().uuid().optional(),
  position: z.string().optional(),
  nationality: z.string().optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type PlayerQuery = z.infer<typeof playerQuerySchema>;
