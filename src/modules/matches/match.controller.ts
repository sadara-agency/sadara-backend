import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as matchService from './match.service';

// ── List Matches ──

export async function list(req: AuthRequest, res: Response) {
  const result = await matchService.listMatches(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get Match by ID ──

export async function getById(req: AuthRequest, res: Response) {
  const match = await matchService.getMatchById(req.params.id);
  sendSuccess(res, match);
}

// ── Get Upcoming Matches ──

export async function upcoming(req: AuthRequest, res: Response) {
  const days = Number(req.query.days) || 7;
  const limit = Number(req.query.limit) || 10;
  const matches = await matchService.getUpcomingMatches(days, limit);
  sendSuccess(res, matches);
}

// ── Create Match ──

export async function create(req: AuthRequest, res: Response) {
  const match = await matchService.createMatch(req.body);

  await logAudit(
    'CREATE',
    'matches',
    match.id,
    buildAuditContext(req.user!, req.ip),
    `Created match: ${match.competition || 'Match'} on ${match.matchDate}`
  );

  sendCreated(res, match);
}

// ── Update Match ──

export async function update(req: AuthRequest, res: Response) {
  const match = await matchService.updateMatch(req.params.id, req.body);

  await logAudit(
    'UPDATE',
    'matches',
    match.id,
    buildAuditContext(req.user!, req.ip),
    `Updated match ${match.id}`
  );

  sendSuccess(res, match, 'Match updated');
}

// ── Update Score ──

export async function updateScore(req: AuthRequest, res: Response) {
  const match = await matchService.updateScore(req.params.id, req.body);

  await logAudit(
    'UPDATE',
    'matches',
    match.id,
    buildAuditContext(req.user!, req.ip),
    `Score updated: ${match.homeScore}-${match.awayScore}`
  );

  sendSuccess(res, match, 'Score updated');
}

// ── Update Status ──

export async function updateStatus(req: AuthRequest, res: Response) {
  const match = await matchService.updateMatchStatus(req.params.id, req.body.status);

  await logAudit(
    'UPDATE',
    'matches',
    match.id,
    buildAuditContext(req.user!, req.ip),
    `Match status changed to ${match.status}`
  );

  sendSuccess(res, match, `Match status updated to ${match.status}`);
}

// ── Delete Match ──

export async function remove(req: AuthRequest, res: Response) {
  const result = await matchService.deleteMatch(req.params.id);

  await logAudit(
    'DELETE',
    'matches',
    result.id,
    buildAuditContext(req.user!, req.ip),
    'Match deleted'
  );

  sendSuccess(res, result, 'Match deleted');
}