import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as svc from './injury.service';

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listInjuries(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const injury = await svc.getInjuryById(req.params.id);
  sendSuccess(res, injury);
}

export async function getByPlayer(req: AuthRequest, res: Response) {
  const injuries = await svc.getPlayerInjuries(req.params.playerId);
  sendSuccess(res, injuries);
}

export async function create(req: AuthRequest, res: Response) {
  const injury = await svc.createInjury(req.body, req.user!.id);
  await logAudit('CREATE', 'injuries', injury.id, buildAuditContext(req.user!, req.ip),
    `Logged injury: ${req.body.injuryType} for player ${req.body.playerId}`);
  sendCreated(res, injury);
}

export async function update(req: AuthRequest, res: Response) {
  const injury = await svc.updateInjury(req.params.id, req.body);
  await logAudit('UPDATE', 'injuries', injury.id, buildAuditContext(req.user!, req.ip),
    `Updated injury ${injury.id}`);
  sendSuccess(res, injury, 'Injury updated');
}

export async function addUpdate(req: AuthRequest, res: Response) {
  const update = await svc.addInjuryUpdate(req.params.id, req.body, req.user!.id);
  await logAudit('UPDATE', 'injuries', req.params.id, buildAuditContext(req.user!, req.ip),
    `Added progress update to injury ${req.params.id}`);
  sendCreated(res, update);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteInjury(req.params.id);
  await logAudit('DELETE', 'injuries', result.id, buildAuditContext(req.user!, req.ip), 'Injury deleted');
  sendSuccess(res, result, 'Injury deleted');
}

export async function stats(req: AuthRequest, res: Response) {
  const data = await svc.getInjuryStats();
  sendSuccess(res, data);
}