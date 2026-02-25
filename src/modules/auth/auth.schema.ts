import { z } from 'zod';

// ── Public Registration (no role selection) ──
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  fullNameAr: z.string().optional(),
});

// ── Login ──
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Admin Invite (only Admin can assign roles) ──
export const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  fullNameAr: z.string().optional(),
  role: z.enum(['Admin', 'Manager', 'Analyst', 'Scout', 'Player']),
});

// ── Profile Update ──
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  fullNameAr: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

// ── Change Password ──
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ── Forgot Password (request reset link) ──
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ── Reset Password (set new password with token) ──
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;