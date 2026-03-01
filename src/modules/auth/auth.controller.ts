import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as authService from './auth.service';

// ── Public Register (no token returned, account inactive) ──
export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);

  await logAudit('REGISTER', 'users', result.user.id, {
    userId: result.user.id,
    userName: result.user.fullName ?? result.user.fullNameAr,
    userRole: result.user.role as any,
    ip: req.ip,
  });

  sendCreated(res, { user: { id: result.user.id, email: result.user.email } }, 'Registration successful. Please check your email for verification.');
}

// ── Admin Invite (creates active user with assigned role) ──
export async function invite(req: AuthRequest, res: Response) {
  const result = await authService.invite(req.body);

  await logAudit('INVITE', 'users', result.user.id, buildAuditContext(req.user!, req.ip), `Invited ${result.user.email} as ${result.user.role}`);

  sendCreated(res, result, 'User invited successfully');
}

// ── Login ──
export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);

  await logAudit('LOGIN', 'users', result.user.id, {
    userId: result.user.id,
    userName: result.user.fullName ?? result.user.fullNameAr,
    userRole: result.user.role as any,
    ip: req.ip,
  });

  sendSuccess(res, result, 'Login successful');
}

// ── Profile ──
export async function getProfile(req: AuthRequest, res: Response) {
  const user = await authService.getProfile(req.user!.id);
  sendSuccess(res, user);
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const user = await authService.updateProfile(req.user!.id, req.body);
  await logAudit('UPDATE', 'users', req.user!.id, buildAuditContext(req.user!, req.ip), 'Profile updated');
  sendSuccess(res, user, 'Profile updated');
}

export async function changePassword(req: AuthRequest, res: Response) {
  const result = await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword
  );
  await logAudit('UPDATE', 'users', req.user!.id, buildAuditContext(req.user!, req.ip), 'Password changed');
  sendSuccess(res, result);
}

// ── Forgot Password (public — request reset link) ──
export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, result);
}

// ── Reset Password (public — set new password with token) ──
export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, result);
}