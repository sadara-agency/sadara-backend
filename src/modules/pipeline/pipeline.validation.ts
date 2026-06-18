import { z } from "zod";
import { PIPELINE_PHASES } from "./pipeline.model";

export const submitPlayerSchema = z.object({
  partnerId: z.string().uuid(),
  playerNameEn: z.string().min(2).max(200),
  playerNameAr: z.string().max(200).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  nationality: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  currentClub: z.string().max(200).optional(),
  corridor: z.string().max(100).optional(),
  contractExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  wageExpectation: z.string().max(100).optional(),
  videoLink: z.string().url().optional(),
  dataLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export const advancePhaseSchema = z.object({
  phase: z.enum(PIPELINE_PHASES),
  nextAction: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  hqOwner: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSubmissionSchema = submitPlayerSchema.partial().extend({
  conflictNote: z.string().optional(),
});

export const getPipelineSchema = z.object({ id: z.string().uuid() });

export type SubmitPlayerDTO = z.infer<typeof submitPlayerSchema>;
export type AdvancePhaseDTO = z.infer<typeof advancePhaseSchema>;
export type UpdateSubmissionDTO = z.infer<typeof updateSubmissionSchema>;
