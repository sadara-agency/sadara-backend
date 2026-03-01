import { Response } from 'express';
import { sendSuccess, sendCreated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { AuthRequest } from '../../shared/types';
import * as portalService from './portal.service';

// ── My Profile ──

export async function getMyProfile(req: AuthRequest, res: Response) {
  const data = await portalService.getMyProfile(req.user!.id);
  sendSuccess(res, data);
}

// ── My Schedule ──

export async function getMySchedule(req: AuthRequest, res: Response) {
  const data = await portalService.getMySchedule(req.user!.id, req.query);
  sendSuccess(res, data);
}

// ── My Documents ──

export async function getMyDocuments(req: AuthRequest, res: Response) {
  const data = await portalService.getMyDocuments(req.user!.id);
  sendSuccess(res, data);
}

// ── My Development Plan ──

export async function getMyDevelopment(req: AuthRequest, res: Response) {
  const data = await portalService.getMyDevelopment(req.user!.id);
  sendSuccess(res, data);
}

// ── Generate Invite Link (Admin/Manager only) ──

export async function generateInvite(req: AuthRequest, res: Response) {
  const { playerId } = req.body;
  const data = await portalService.generatePlayerInvite(playerId, req.user!.id);
  await logAudit('CREATE', 'users', null, buildAuditContext(req.user!, req.ip),
    `Generated player portal invite for ${data.playerName} (${data.playerEmail})`
  );
  sendCreated(res, data);
}

// ── Complete Registration (public — no auth) ──

export async function completeRegistration(req: AuthRequest, res: Response) {
  const { token, password } = req.body;
  const data = await portalService.completePlayerRegistration(token, password);
  sendSuccess(res, data);
}