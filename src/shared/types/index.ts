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
  | "Media"
  | "Executive"
  | "GymCoach";

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
