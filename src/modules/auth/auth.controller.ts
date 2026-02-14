import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as authService from './auth.service';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);

  await logAudit('REGISTER', 'users', result.user.id, {
    userId: result.user.id,
    userName: result.user.fullName,
    userRole: result.user.role as any,
    ip: req.ip,
  });

  sendCreated(res, result, 'Registration successful');
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);

  await logAudit('LOGIN', 'users', result.user.id, {
    userId: result.user.id,
    userName: result.user.fullName,
    userRole: result.user.role as any,
    ip: req.ip,
  });

  sendSuccess(res, result, 'Login successful');
}

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
