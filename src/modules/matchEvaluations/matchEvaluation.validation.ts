import { z } from "zod";

// ── Shared item schema ──
const ratedItemSchema = z.object({
  rating: z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  note: z.string().max(500).nullable().optional(),
});

// ── Section schemas ──
export const fitnessScoresSchema = z.object({
  strength: ratedItemSchema,
  speed: ratedItemSchema,
  agility: ratedItemSchema,
  flexibility: ratedItemSchema,
  endurance: ratedItemSchema,
});

export const technicalScoresSchema = z.object({
  dribbling: ratedItemSchema,
  passing: ratedItemSchema,
  insideKick: ratedItemSchema,
  outsideKick: ratedItemSchema,
  trappingAndReceiving: ratedItemSchema,
  heading: ratedItemSchema,
  chestControl: ratedItemSchema,
  thighControl: ratedItemSchema,
  ballAbsorption: ratedItemSchema,
  technicalAssimilation: ratedItemSchema,
  concentration: ratedItemSchema,
  quickThinking: ratedItemSchema,
  technicalCoordination: ratedItemSchema,
  reactionSpeed: ratedItemSchema,
});

export const tacticalScoresSchema = z.object({
  attacking: ratedItemSchema,
  defending: ratedItemSchema,
  positioning: ratedItemSchema,
  movement: ratedItemSchema,
  tactics: ratedItemSchema,
  tacticalAssimilation: ratedItemSchema,
});

export const contributionScoresSchema = z.object({
  offensivePerformance: ratedItemSchema,
  defensivePerformance: ratedItemSchema,
  crosses: ratedItemSchema,
  successfulDribbles: ratedItemSchema,
  keyPasses: ratedItemSchema,
  shots: ratedItemSchema,
  tackles: ratedItemSchema,
  ballRecovery: ratedItemSchema,
  ballLoss: ratedItemSchema,
  decisionMaking: ratedItemSchema,
  tacticalDiscipline: ratedItemSchema,
});

// ── Default empty section helpers for Draft saves ──
const defaultRatedItem = () => ({ rating: 3 as const, note: null });

export const defaultFitnessScores = () => ({
  strength: defaultRatedItem(),
  speed: defaultRatedItem(),
  agility: defaultRatedItem(),
  flexibility: defaultRatedItem(),
  endurance: defaultRatedItem(),
});

export const defaultTechnicalScores = () => ({
  dribbling: defaultRatedItem(),
  passing: defaultRatedItem(),
  insideKick: defaultRatedItem(),
  outsideKick: defaultRatedItem(),
  trappingAndReceiving: defaultRatedItem(),
  heading: defaultRatedItem(),
  chestControl: defaultRatedItem(),
  thighControl: defaultRatedItem(),
  ballAbsorption: defaultRatedItem(),
  technicalAssimilation: defaultRatedItem(),
  concentration: defaultRatedItem(),
  quickThinking: defaultRatedItem(),
  technicalCoordination: defaultRatedItem(),
  reactionSpeed: defaultRatedItem(),
});

export const defaultTacticalScores = () => ({
  attacking: defaultRatedItem(),
  defending: defaultRatedItem(),
  positioning: defaultRatedItem(),
  movement: defaultRatedItem(),
  tactics: defaultRatedItem(),
  tacticalAssimilation: defaultRatedItem(),
});

export const defaultContributionScores = () => ({
  offensivePerformance: defaultRatedItem(),
  defensivePerformance: defaultRatedItem(),
  crosses: defaultRatedItem(),
  successfulDribbles: defaultRatedItem(),
  keyPasses: defaultRatedItem(),
  shots: defaultRatedItem(),
  tackles: defaultRatedItem(),
  ballRecovery: defaultRatedItem(),
  ballLoss: defaultRatedItem(),
  decisionMaking: defaultRatedItem(),
  tacticalDiscipline: defaultRatedItem(),
});

// ── CRUD schemas ──

export const createMatchEvaluationSchema = z.object({
  matchPlayerId: z.string().uuid(),
  overallRating: z.number().int().min(1).max(10),
  fitnessScores: fitnessScoresSchema.optional(),
  technicalScores: technicalScoresSchema.optional(),
  tacticalScores: tacticalScoresSchema.optional(),
  contributionScores: contributionScoresSchema.optional(),
  summary: z.string().max(2000).optional(),
  highlights: z.string().max(1000).nullable().optional(),
  mistakes: z.string().max(1000).nullable().optional(),
  strengths: z.string().max(1000).nullable().optional(),
  weaknesses: z.string().max(1000).nullable().optional(),
  recommendation: z.string().max(2000).optional(),
  needsReferral: z.boolean().optional(),
});

export const updateMatchEvaluationSchema = z
  .object({
    overallRating: z.number().int().min(1).max(10),
    fitnessScores: fitnessScoresSchema,
    technicalScores: technicalScoresSchema,
    tacticalScores: tacticalScoresSchema,
    contributionScores: contributionScoresSchema,
    summary: z.string().min(1).max(2000),
    highlights: z.string().max(1000).nullable(),
    mistakes: z.string().max(1000).nullable(),
    strengths: z.string().max(1000).nullable(),
    weaknesses: z.string().max(1000).nullable(),
    recommendation: z.string().max(2000),
    needsReferral: z.boolean(),
  })
  .partial();

export const getMatchEvaluationSchema = z.object({
  id: z.string().uuid(),
});

export const submitMatchEvaluationSchema = z.object({
  summary: z.string().min(1).max(2000),
  recommendation: z.string().min(1).max(2000),
});

export const reviseMatchEvaluationSchema = z.object({
  comment: z.string().min(1).max(1000),
});

export const createEvaluationReferralSchema = z.object({
  referralType: z.enum([
    "Performance",
    "Physical",
    "Skill",
    "Tactical",
    "Mental",
    "Nutrition",
    "Medical",
    "Administrative",
    "SportDecision",
    "Goalkeeper",
  ]),
  referralTarget: z
    .enum([
      "FitnessCoach",
      "Coach",
      "SkillCoach",
      "TacticalCoach",
      "GoalkeeperCoach",
      "Analyst",
      "NutritionSpecialist",
      "MentalCoach",
      "Manager",
    ])
    .nullable()
    .optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const listMatchEvaluationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  analystId: z.string().uuid().optional(),
  status: z
    .enum(["Draft", "PendingReview", "Approved", "NeedsRevision"])
    .optional(),
});

export type CreateMatchEvaluationDTO = z.infer<
  typeof createMatchEvaluationSchema
>;
export type UpdateMatchEvaluationDTO = z.infer<
  typeof updateMatchEvaluationSchema
>;
export type CreateEvaluationReferralDTO = z.infer<
  typeof createEvaluationReferralSchema
>;
export type ListMatchEvaluationsQuery = z.infer<
  typeof listMatchEvaluationsQuerySchema
>;
