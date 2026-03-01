"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.inviteSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ── Public Registration (no role selection) ──
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(2, 'Full name is required'),
    fullNameAr: zod_1.z.string().optional(),
});
// ── Login ──
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ── Admin Invite (only Admin can assign roles) ──
exports.inviteSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(2, 'Full name is required'),
    fullNameAr: zod_1.z.string().optional(),
    role: zod_1.z.enum(['Admin', 'Manager', 'Analyst', 'Scout', 'Player']),
});
// ── Profile Update ──
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).optional(),
    fullNameAr: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().url().optional(),
});
// ── Change Password ──
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
// ── Forgot Password (request reset link) ──
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
// ── Reset Password (set new password with token) ──
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
//# sourceMappingURL=auth.schema.js.map