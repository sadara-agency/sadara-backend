import { Request } from "express";

// ── Shared types (inlined from @sadara/shared) ──
export type UserRole =
  | "Admin"
  | "Manager"
  | "Analyst"
  | "Scout"
  | "Player"
  | "Legal"
  | "Finance"
  | "Coach"
  | "SkillCoach"
  | "TacticalCoach"
  | "FitnessCoach"
  | "NutritionSpecialist"
  | "GymCoach"
  | "Media"
  | "Executive"
  | "GoalkeeperCoach"
  | "MentalCoach";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | { field: string; message: string }[];
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

// ── Role constants — use these instead of hardcoded strings ──
export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  SCOUT: "Scout",
  PLAYER: "Player",
  LEGAL: "Legal",
  FINANCE: "Finance",
  COACH: "Coach",
  SKILL_COACH: "SkillCoach",
  TACTICAL_COACH: "TacticalCoach",
  FITNESS_COACH: "FitnessCoach",
  NUTRITION_SPECIALIST: "NutritionSpecialist",
  GYM_COACH: "GymCoach",
  MEDIA: "Media",
  EXECUTIVE: "Executive",
  GOALKEEPER_COACH: "GoalkeeperCoach",
  MENTAL_COACH: "MentalCoach",
} as const satisfies Record<string, UserRole>;

// ── Authenticated Request (Express-specific, stays in backend) ──
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  playerId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ── Audit Context ──
export interface AuditContext {
  userId: string;
  userName: string;
  userRole: UserRole;
  ip?: string;
}
