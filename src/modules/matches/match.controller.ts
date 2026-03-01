import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as svc from './match.service';
import { generateAutoTasks } from './matchAutoTasks';

// ═══════════════════════════════════════════════════════════════
//  MATCH CRUD
// ═══════════════════════════════════════════════════════════════

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listMatches(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const match = await svc.getMatchById(req.params.id);
  sendSuccess(res, match);
}

export async function upcoming(req: AuthRequest, res: Response) {
  const days = Number(req.query.days) || 7;
  const limit = Number(req.query.limit) || 10;
  const matches = await svc.getUpcomingMatches(days, limit);
  sendSuccess(res, matches);
}

export async function create(req: AuthRequest, res: Response) {
  const match = await svc.createMatch(req.body);
  await logAudit('CREATE', 'matches', match.id, buildAuditContext(req.user!, req.ip),
    `Created match: ${match.competition || 'Match'} on ${match.matchDate}`);
  sendCreated(res, match);
}

export async function update(req: AuthRequest, res: Response) {
  const match = await svc.updateMatch(req.params.id, req.body);
  await logAudit('UPDATE', 'matches', match.id, buildAuditContext(req.user!, req.ip),
    `Updated match ${match.id}`);
  sendSuccess(res, match, 'Match updated');
}

export async function updateScore(req: AuthRequest, res: Response) {
  const match = await svc.updateScore(req.params.id, req.body);
  await logAudit('UPDATE', 'matches', match.id, buildAuditContext(req.user!, req.ip),
    `Score updated: ${match.homeScore}-${match.awayScore}`);
  sendSuccess(res, match, 'Score updated');
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const match = await svc.updateMatchStatus(req.params.id, req.body.status);
  await logAudit('UPDATE', 'matches', match.id, buildAuditContext(req.user!, req.ip),
    `Match status changed to ${match.status}`);

  // ── Auto-generate tasks when match is completed ──
  if (req.body.status === 'completed') {
    generateAutoTasks(req.params.id, req.user!.id)
      .then(result => {
        if (result.created > 0) {
          console.log(`[AutoTasks] Match completed → Created ${result.created} tasks for match ${req.params.id}`);
        }
      })
      .catch(err => {
        console.error('[AutoTasks] Error on match completion:', err.message);
      });
  }

  sendSuccess(res, match, `Match status updated to ${match.status}`);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteMatch(req.params.id);
  await logAudit('DELETE', 'matches', result.id, buildAuditContext(req.user!, req.ip), 'Match deleted');
  sendSuccess(res, result, 'Match deleted');
}

// ═══════════════════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════════════════

export async function calendar(req: AuthRequest, res: Response) {
  const matches = await svc.getCalendar(req.query as any);
  sendSuccess(res, matches);
}

// ═══════════════════════════════════════════════════════════════
//  MATCH PLAYERS
// ═══════════════════════════════════════════════════════════════

export async function getPlayers(req: AuthRequest, res: Response) {
  const players = await svc.getMatchPlayers(req.params.id);
  sendSuccess(res, players);
}

export async function assignPlayers(req: AuthRequest, res: Response) {
  const players = await svc.assignPlayers(req.params.id, req.body.players);
  await logAudit('UPDATE', 'matches', req.params.id, buildAuditContext(req.user!, req.ip),
    `Assigned ${req.body.players.length} players to match`);
  sendSuccess(res, players, 'Players assigned');
}

export async function updatePlayer(req: AuthRequest, res: Response) {
  const mp = await svc.updateMatchPlayer(req.params.id, req.params.playerId, req.body);
  sendSuccess(res, mp, 'Player assignment updated');
}

export async function removePlayer(req: AuthRequest, res: Response) {
  const result = await svc.removePlayerFromMatch(req.params.id, req.params.playerId);
  await logAudit('DELETE', 'matches', req.params.id, buildAuditContext(req.user!, req.ip),
    `Removed player ${req.params.playerId} from match`);
  sendSuccess(res, result, 'Player removed from match');
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER MATCH STATS
// ═══════════════════════════════════════════════════════════════

export async function getStats(req: AuthRequest, res: Response) {
  const stats = await svc.getMatchStats(req.params.id);
  sendSuccess(res, stats);
}

export async function upsertStats(req: AuthRequest, res: Response) {
  const stats = await svc.upsertStats(req.params.id, req.body.stats);
  await logAudit('UPDATE', 'matches', req.params.id, buildAuditContext(req.user!, req.ip),
    `Updated stats for ${req.body.stats.length} players`);

  // ── Auto-generate tasks based on stats (fire-and-forget) ──
  generateAutoTasks(req.params.id, req.user!.id)
    .then(result => {
      if (result.created > 0) {
        console.log(`[AutoTasks] Created ${result.created} tasks for match ${req.params.id}: ${result.rules.join(', ')}`);
      }
    })
    .catch(err => {
      console.error('[AutoTasks] Error generating auto-tasks:', err.message);
    });

  sendSuccess(res, stats, 'Stats saved');
}

export async function updatePlayerStats(req: AuthRequest, res: Response) {
  const stats = await svc.updatePlayerStats(req.params.id, req.params.playerId, req.body);
  sendSuccess(res, stats, 'Player stats updated');
}

export async function deletePlayerStats(req: AuthRequest, res: Response) {
  const result = await svc.deletePlayerStats(req.params.id, req.params.playerId);
  sendSuccess(res, result, 'Player stats deleted');
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER-CENTRIC (for player profile)
// ═══════════════════════════════════════════════════════════════

export async function playerMatches(req: AuthRequest, res: Response) {
  const result = await svc.getPlayerMatches(req.params.playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function playerAggregateStats(req: AuthRequest, res: Response) {
  const stats = await svc.getPlayerAggregateStats(req.params.playerId, req.query as any);
  sendSuccess(res, stats);
}