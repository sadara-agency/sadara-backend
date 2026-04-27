import { z } from "zod";

export const SESSION_OUTCOME_TAGS = [
  "InjuryConcern",
  "FatigueFlag",
  "TacticalImprovement",
  "MentalHealthFlag",
  "NutritionAlert",
  "ExceptionalPerformance",
  "MotivationLow",
  "ReadyForMatchday",
  "RequiresMedicalReview",
  "TechniqueBreakthrough",
] as const;

export type SessionOutcomeTag = (typeof SESSION_OUTCOME_TAGS)[number];

const SESSION_TYPES = [
  "Physical",
  "Skill",
  "Tactical",
  "Mental",
  "Nutrition",
  "PerformanceAssessment",
  "Goalkeeper",
] as const;

const PROGRAM_OWNERS = [
  "FitnessCoach",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "GoalkeeperCoach",
  "Analyst",
  "NutritionSpecialist",
  "MentalCoach",
] as const;

const COMPLETION_STATUSES = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "NoShow",
] as const;

const videoTimestampSchema = z.object({
  label: z.string().min(1).max(200),
  labelAr: z.string().max(200).nullable().optional(),
  timecode: z.string().min(1).max(20),
  url: z.string().url().nullable().optional(),
});

// ── Create Session ──

export const createSessionSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  referralId: z.string().uuid("Invalid referral ID").optional(),
  matchId: z.string().uuid("Invalid match ID").nullable().optional(),
  sessionType: z.enum(SESSION_TYPES),
  programOwner: z.enum(PROGRAM_OWNERS),
  responsibleId: z.string().uuid("Invalid user ID").optional(),
  journeyStageId: z.string().uuid("Invalid journey stage ID").optional(),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  title: z.string().min(1, "Title is required").max(255),
  titleAr: z.string().max(255).optional(),
  summary: z.string().optional(),
  summaryAr: z.string().optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
  completionStatus: z.enum(COMPLETION_STATUSES).default("Scheduled"),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  videoTimestamps: z.array(videoTimestampSchema).nullable().optional(),
  resultingTicketId: z.string().uuid("Invalid ticket ID").nullable().optional(),
  outcomeTags: z.array(z.enum(SESSION_OUTCOME_TAGS)).nullable().optional(),
});

// ── Update Session ──

export const updateSessionSchema = z.object({
  sessionType: z.enum(SESSION_TYPES).optional(),
  programOwner: z.enum(PROGRAM_OWNERS).optional(),
  responsibleId: z.string().uuid().nullable().optional(),
  matchId: z.string().uuid().nullable().optional(),
  journeyStageId: z.string().uuid().nullable().optional(),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  title: z.string().max(255).nullable().optional(),
  titleAr: z.string().max(255).nullable().optional(),
  summary: z.string().nullable().optional(),
  summaryAr: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
  completionStatus: z.enum(COMPLETION_STATUSES).optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  videoTimestamps: z.array(videoTimestampSchema).nullable().optional(),
  resultingTicketId: z.string().uuid().nullable().optional(),
  outcomeTags: z.array(z.enum(SESSION_OUTCOME_TAGS)).nullable().optional(),
});

// ── Coverage Radar ──

export const coverageRadarQuerySchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be YYYY-MM-DD"),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be YYYY-MM-DD"),
  playerIds: z.string().optional(),
});

export type CoverageRadarQuery = z.infer<typeof coverageRadarQuerySchema>;

// ── Query Sessions ──

export const sessionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z
    .enum([
      "created_at",
      "updated_at",
      "session_date",
      "completion_status",
      "program_owner",
      "title",
      "session_type",
    ])
    .default("session_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  playerId: z.string().uuid().optional(),
  referralId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  sessionType: z.enum(SESSION_TYPES).optional(),
  programOwner: z.enum(PROGRAM_OWNERS).optional(),
  completionStatus: z.enum(COMPLETION_STATUSES).optional(),
  responsibleId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  outcomeTags: z.string().optional(),
});

// ── Inferred Types ──

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SessionQuery = z.infer<typeof sessionQuerySchema>;
