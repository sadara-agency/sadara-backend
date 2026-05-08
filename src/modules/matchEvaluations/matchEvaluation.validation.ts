import { z } from "zod";
import { EVAL_STATUSES, REFERRAL_TARGETS } from "./matchEvaluation.model";

const rating5 = z.number().int().min(1).max(5).nullable().optional();
const rating10 = z.number().int().min(1).max(10).nullable().optional();

export const createMatchEvaluationSchema = z.object({
  playerId: z.string().uuid(),
  matchId: z.string().uuid().nullable().optional(),
  matchDate: z.string().date().nullable().optional(),
  opponent: z.string().max(100).nullable().optional(),
  competition: z.string().max(100).nullable().optional(),
  playerPosition: z.string().max(50).nullable().optional(),
  minutesPlayed: z.number().int().min(0).max(120).nullable().optional(),
  overallRating: rating10,
  // Fitness
  fitStrength: rating5,
  fitSpeed: rating5,
  fitAgility: rating5,
  fitFlexibility: rating5,
  fitEndurance: rating5,
  // Technical
  techDribbling: rating5,
  techPassing: rating5,
  techInsideKick: rating5,
  techOutsideKick: rating5,
  techTrapping: rating5,
  techHeading: rating5,
  techChestControl: rating5,
  techThighControl: rating5,
  techBallAbsorption: rating5,
  techAssimilation: rating5,
  techConcentration: rating5,
  techQuickThinking: rating5,
  techCoordination: rating5,
  techReactionSpeed: rating5,
  // Tactical
  tacAttacking: rating5,
  tacDefending: rating5,
  tacPositioning: rating5,
  tacMovement: rating5,
  tacTactics: rating5,
  tacAssimilation: rating5,
  // Contribution
  conOffensive: rating5,
  conDefensive: rating5,
  conCrosses: rating5,
  conDribbles: rating5,
  conKeyPasses: rating5,
  conShots: rating5,
  conTackles: rating5,
  conBallRecovery: rating5,
  conBallLoss: rating5,
  conDecisionMaking: rating5,
  conTacticalDiscipline: rating5,
  // Text
  summary: z.string().max(2000).nullable().optional(),
  highlights: z.string().max(1000).nullable().optional(),
  mistakes: z.string().max(1000).nullable().optional(),
  strengths: z.string().max(1000).nullable().optional(),
  weaknesses: z.string().max(1000).nullable().optional(),
  recommendation: z.string().max(1000).nullable().optional(),
  needsReferral: z.boolean().optional(),
  referralTarget: z.enum(REFERRAL_TARGETS).nullable().optional(),
});

// Submit requires summary and recommendation
export const submitMatchEvaluationSchema = createMatchEvaluationSchema.extend({
  summary: z.string().min(1).max(2000),
  recommendation: z.string().min(1).max(1000),
});

export const updateMatchEvaluationSchema =
  createMatchEvaluationSchema.partial();

export const getMatchEvaluationSchema = z.object({
  id: z.string().uuid(),
});

export const listMatchEvaluationsSchema = z.object({
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  analystId: z.string().uuid().optional(),
  status: z.enum(EVAL_STATUSES).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const approveEvaluationSchema = z.object({
  id: z.string().uuid(),
});

export const requestRevisionSchema = z.object({
  revisionComment: z.string().min(1).max(1000),
});

export type CreateMatchEvaluationDTO = z.infer<
  typeof createMatchEvaluationSchema
>;
export type UpdateMatchEvaluationDTO = z.infer<
  typeof updateMatchEvaluationSchema
>;
export type ListMatchEvaluationsDTO = z.infer<
  typeof listMatchEvaluationsSchema
>;
export type SubmitMatchEvaluationDTO = z.infer<
  typeof submitMatchEvaluationSchema
>;
