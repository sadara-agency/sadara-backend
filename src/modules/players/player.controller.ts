import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as playerService from './player.service';

export async function list(req: AuthRequest, res: Response) {
  // queryParams are handled inside the service with Sequelize Operators (Op)
  const result = await playerService.listPlayers(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const player = await playerService.getPlayerById(req.params.id);
  sendSuccess(res, player);
}

export async function create(req: AuthRequest, res: Response) {
  // req.user!.id is passed as createdBy
  const player = await playerService.createPlayer(req.body, req.user!.id);
  
  // Using the new Sequelize property names for the audit log
  await logAudit(
    'CREATE', 
    'players', 
    player.id, 
    buildAuditContext(req.user!, req.ip),
    `Created player: ${player.firstName} ${player.lastName}`
  );
  
  sendCreated(res, player);
}

export async function update(req: AuthRequest, res: Response) {
  const player = await playerService.updatePlayer(req.params.id, req.body);
  
  await logAudit(
    'UPDATE', 
    'players', 
    player.id, 
    buildAuditContext(req.user!, req.ip),
    `Updated player: ${player.firstName} ${player.lastName}`
  );
  
  sendSuccess(res, player, 'Player updated');
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await playerService.deletePlayer(req.params.id);
  
  await logAudit(
    'DELETE', 
    'players', 
    result.id, 
    buildAuditContext(req.user!, req.ip), 
    'Player deleted'
  );
  
  sendSuccess(res, result, 'Player deleted');
}

// export async function getStats(req: AuthRequest, res: Response) {
//   const stats = await playerService.getPlayerStats(req.params.id);
//   sendSuccess(res, stats);
// }