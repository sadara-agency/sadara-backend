// ─────────────────────────────────────────────────────────────
// src/modules/Users/user.schema.ts
// Zod validation schemas for the User CRUD module.
//
// NOTE: This is separate from auth.schema.ts (register/login).
// This module is for admin user management — creating users
// on behalf of the org, updating roles, deactivating, etc.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod';

// ── Shared constants ──
const USER_ROLES = ['Admin', 'Manager', 'Analyst', 'Scout'] as const;

// ── Create User (Admin creates a new team member) ──
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  fullNameAr: z.string().optional(),
  role: z.enum(USER_ROLES).default('Analyst'),
  avatarUrl: z.string().url('Invalid URL').optional(),
  isActive: z.boolean().default(true),
});

// ── Update User (partial — any field can be updated) ──
// Password is handled separately via resetPassword endpoint
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  fullName: z.string().min(2).optional(),
  fullNameAr: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  avatarUrl: z.string().url('Invalid URL').nullable().optional(),
  isActive: z.boolean().optional(),
});

// ── Admin Reset Password (force-set a new password for a user) ──
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ── Query / List Users ──
export const userQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.coerce.boolean().optional(),
});

// ── Inferred types for service layer ──
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;