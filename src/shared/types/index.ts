import { Request } from "express";

// ── Re-export shared types ──
export type {
  UserRole,
  ApiResponse,
  PaginationMeta,
  PaginationQuery,
} from "@sadara/shared";
import type { UserRole } from "@sadara/shared";

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
