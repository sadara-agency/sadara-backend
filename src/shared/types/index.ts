import { Request } from 'express';

// ── User Roles ──
export type UserRole = 'Admin' | 'Manager' | 'Analyst' | 'Scout' | 'Player';

// ── Authenticated Request ──
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ── API Response ──
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

// ── Pagination ──
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
  order?: 'asc' | 'desc';
  search?: string;
}

// ── Audit Context ──
export interface AuditContext {
  userId: string;
  userName: string;
  userRole: UserRole;
  ip?: string;
}
