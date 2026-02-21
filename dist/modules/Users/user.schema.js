"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userQuerySchema = exports.resetPasswordSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/Users/user.schema.ts
// Zod validation schemas for the User CRUD module.
//
// NOTE: This is separate from auth.schema.ts (register/login).
// This module is for admin user management — creating users
// on behalf of the org, updating roles, deactivating, etc.
// ─────────────────────────────────────────────────────────────
const zod_1 = require("zod");
// ── Shared constants ──
const USER_ROLES = ['Admin', 'Manager', 'Analyst', 'Scout'];
// ── Create User (Admin creates a new team member) ──
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(2, 'Full name is required'),
    fullNameAr: zod_1.z.string().optional(),
    role: zod_1.z.enum(USER_ROLES).default('Analyst'),
    avatarUrl: zod_1.z.string().url('Invalid URL').optional(),
    isActive: zod_1.z.boolean().default(true),
});
// ── Update User (partial — any field can be updated) ──
// Password is handled separately via resetPassword endpoint
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').optional(),
    fullName: zod_1.z.string().min(2).optional(),
    fullNameAr: zod_1.z.string().optional(),
    role: zod_1.z.enum(USER_ROLES).optional(),
    avatarUrl: zod_1.z.string().url('Invalid URL').nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
});
// ── Admin Reset Password (force-set a new password for a user) ──
exports.resetPasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
// ── Query / List Users ──
exports.userQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sort: zod_1.z.string().default('created_at'),
    order: zod_1.z.enum(['asc', 'desc']).default('desc'),
    search: zod_1.z.string().optional(),
    role: zod_1.z.enum(USER_ROLES).optional(),
    isActive: zod_1.z.coerce.boolean().optional(),
});
//# sourceMappingURL=user.schema.js.map