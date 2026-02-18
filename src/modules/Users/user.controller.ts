// ─────────────────────────────────────────────────────────────
// src/modules/Users/user.controller.ts
// Thin controller layer — delegates to user.service.ts,
// handles audit logging, and sends standardized responses.
//
// Follows the same pattern as player.controller.ts.
// ─────────────────────────────────────────────────────────────
import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as userService from './user.service';

// ── List Users ──
export async function list(req: AuthRequest, res: Response) {
  const result = await userService.listUsers(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get User by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, user);
}

// ── Create User ──
export async function create(req: AuthRequest, res: Response) {
  const user = await userService.createUser(req.body);

  await logAudit(
    'CREATE',
    'users',
    user.id,
    buildAuditContext(req.user!, req.ip),
    `Created user: ${user.fullName} (${user.role})`,
  );

  sendCreated(res, user);
}

// ── Update User ──
export async function update(req: AuthRequest, res: Response) {
  const user = await userService.updateUser(req.params.id, req.body);

  await logAudit(
    'UPDATE',
    'users',
    user.id,
    buildAuditContext(req.user!, req.ip),
    `Updated user: ${user.fullName}`,
  );

  sendSuccess(res, user, 'User updated');
}

// ── Reset Password ──
export async function resetPassword(req: AuthRequest, res: Response) {
  const result = await userService.resetPassword(req.params.id, req.body.newPassword);

  await logAudit(
    'UPDATE',
    'users',
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    'Admin reset user password',
  );

  sendSuccess(res, result);
}

// ── Delete User ──
export async function remove(req: AuthRequest, res: Response) {
  const result = await userService.deleteUser(req.params.id, req.user!.id);

  await logAudit(
    'DELETE',
    'users',
    result.id,
    buildAuditContext(req.user!, req.ip),
    'User deleted',
  );

  sendSuccess(res, result, 'User deleted');
}