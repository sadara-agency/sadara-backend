import { z } from "zod";

// Whitelist - the ONLY fields a player may propose. Anything else is rejected.
export const submitProfileChangeSchema = z
  .object({
    weightKg: z.number().min(30).max(200).optional(),
    heightCm: z.number().min(100).max(250).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
      .optional(),
    preferredFoot: z.enum(["Left", "Right", "Both"]).optional(),
    position: z.string().min(1).max(50).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export type SubmitProfileChangeDTO = z.infer<typeof submitProfileChangeSchema>;

export const ALLOWED_FIELDS = [
  "weightKg",
  "heightCm",
  "dateOfBirth",
  "preferredFoot",
  "position",
] as const;
