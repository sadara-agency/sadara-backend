import { z } from "zod";
import { RTP_PHASES } from "./rtp.model";

export const createRtpProtocolSchema = z.object({
  injuryId: z.string().uuid(),
  playerId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  targetReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  medicalNotes: z.string().max(2000).optional().nullable(),
  medicalNotesAr: z.string().max(2000).optional().nullable(),
});

export const updateRtpProtocolSchema = z
  .object({
    targetReturnDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    actualReturnDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    status: z.enum(["active", "completed", "aborted"]).optional(),
    medicalNotes: z.string().max(2000).optional().nullable(),
    medicalNotesAr: z.string().max(2000).optional().nullable(),
  })
  .partial();

export const advancePhaseSchema = z.object({
  painLevel: z.number().int().min(0).max(10).optional().nullable(),
  fitnessTestPassed: z.boolean().optional().nullable(),
  medicalClearance: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
  notesAr: z.string().max(2000).optional().nullable(),
  exitedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const rtpQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  injuryId: z.string().uuid().optional(),
  status: z.enum(["active", "completed", "aborted"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export const rtpParamSchema = z.object({ id: z.string().uuid() });
export const rtpInjuryParamSchema = z.object({ injuryId: z.string().uuid() });

export type CreateRtpProtocolInput = z.infer<typeof createRtpProtocolSchema>;
export type UpdateRtpProtocolInput = z.infer<typeof updateRtpProtocolSchema>;
export type AdvancePhaseInput = z.infer<typeof advancePhaseSchema>;
export type RtpQuery = z.infer<typeof rtpQuerySchema>;
