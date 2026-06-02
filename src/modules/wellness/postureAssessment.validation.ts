import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GRADES = ["excellent", "good", "needs_attention", "poor"] as const;

const angleDeg = z.number().min(-180).max(180).nullable().optional();

export const createPostureAssessmentSchema = z.object({
  playerId: z.string().uuid(),
  scanDate: z.string().regex(DATE_RE, "scanDate must be YYYY-MM-DD"),
  bodyAlignmentDeg: angleDeg,
  headTiltDeg: angleDeg,
  shoulderAlignmentDeg: angleDeg,
  pelvicTiltDeg: angleDeg,
  kneeAlignmentDeg: angleDeg,
  feetAngleDeg: z.number().min(0).max(90).nullable().optional(),
  overallGrade: z.enum(GRADES).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  notesAr: z.string().max(5000).nullable().optional(),
  assessmentTool: z.string().max(50).nullable().optional(),
});

export const updatePostureAssessmentSchema = createPostureAssessmentSchema
  .omit({ playerId: true })
  .partial();

export const listPostureAssessmentsQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  from: z.string().regex(DATE_RE, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(DATE_RE, "to must be YYYY-MM-DD").optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export const getPostureAssessmentSchema = z.object({
  id: z.string().uuid(),
});

export const playerIdParamSchema = z.object({
  playerId: z.string().uuid(),
});

export type CreatePostureAssessmentDTO = z.infer<
  typeof createPostureAssessmentSchema
>;
export type UpdatePostureAssessmentDTO = z.infer<
  typeof updatePostureAssessmentSchema
>;
export type ListPostureAssessmentsQueryDTO = z.infer<
  typeof listPostureAssessmentsQuerySchema
>;
