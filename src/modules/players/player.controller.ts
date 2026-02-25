import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { invalidateMultiple, CachePrefix } from '../../shared/utils/cache';
import * as playerService from './player.service';

export async function list(req: AuthRequest, res: Response) {
  const result = await playerService.listPlayers(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const player = await playerService.getPlayerById(req.params.id);
  sendSuccess(res, player);
}

export async function create(req: AuthRequest, res: Response) {
  const player = await playerService.createPlayer(req.body, req.user!.id);

  await logAudit(
    'CREATE',
    'players',
    player.id,
    buildAuditContext(req.user!, req.ip),
    `Created player: ${player.firstName} ${player.lastName}`
  );

  // Bust caches: player lists + dashboard (count changed)
  await invalidateMultiple([CachePrefix.PLAYERS, CachePrefix.DASHBOARD]);

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

  // Bust caches: player detail + lists + dashboard
  await invalidateMultiple([CachePrefix.PLAYERS, CachePrefix.PLAYER, CachePrefix.DASHBOARD]);

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

  // Bust caches: everything player-related + contracts + dashboard
  await invalidateMultiple([
    CachePrefix.PLAYERS,
    CachePrefix.PLAYER,
    CachePrefix.CONTRACTS,
    CachePrefix.DASHBOARD,
  ]);

  sendSuccess(res, result, 'Player deleted');
}