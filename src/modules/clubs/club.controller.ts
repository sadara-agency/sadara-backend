import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as clubService from './club.service';

export async function list(req: AuthRequest, res: Response) {
  const result = await clubService.listClubs(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const club = await clubService.getClubById(req.params.id);
  sendSuccess(res, club);
}

export async function create(req: AuthRequest, res: Response) {
  const club = await clubService.createClub(req.body);
  await logAudit('CREATE', 'clubs', club.id, buildAuditContext(req.user!, req.ip), `Created club: ${club.name}`);
  sendCreated(res, club);
}

export async function update(req: AuthRequest, res: Response) {
  const club = await clubService.updateClub(req.params.id, req.body);
  await logAudit('UPDATE', 'clubs', club.id, buildAuditContext(req.user!, req.ip), `Updated club: ${club.name}`);
  sendSuccess(res, club, 'Club updated');
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await clubService.deleteClub(req.params.id);
  await logAudit('DELETE', 'clubs', result.id, buildAuditContext(req.user!, req.ip), 'Club deleted');
  sendSuccess(res, result, 'Club deleted');
}
