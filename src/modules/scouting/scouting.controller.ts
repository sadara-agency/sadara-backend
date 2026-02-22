import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as scoutingService from './scouting.service';

// ══════════════════════════════════════════
// WATCHLIST
// ══════════════════════════════════════════



export async function listWatchlist(req: AuthRequest, res: Response) {
  const result = await scoutingService.listWatchlist(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getWatchlistById(req: AuthRequest, res: Response) {
  const item = await scoutingService.getWatchlistById(req.params.id);
  sendSuccess(res, item);
}

export async function createWatchlist(req: AuthRequest, res: Response) {
  const item = await scoutingService.createWatchlist(req.body, req.user!.id);
  await logAudit('CREATE', 'watchlists', item.id, buildAuditContext(req.user!, req.ip), `Added prospect: ${item.prospectName}`);
  sendCreated(res, item);
}

export async function updateWatchlist(req: AuthRequest, res: Response) {
  const item = await scoutingService.updateWatchlist(req.params.id, req.body);
  await logAudit('UPDATE', 'watchlists', item.id, buildAuditContext(req.user!, req.ip), `Updated prospect: ${item.prospectName}`);
  sendSuccess(res, item, 'Prospect updated');
}

export async function updateWatchlistStatus(req: AuthRequest, res: Response) {
  const item = await scoutingService.updateWatchlistStatus(req.params.id, req.body.status);
  await logAudit('UPDATE', 'watchlists', item.id, buildAuditContext(req.user!, req.ip), `Status → ${item.status}`);
  sendSuccess(res, item, `Status updated to ${item.status}`);
}

export async function deleteWatchlist(req: AuthRequest, res: Response) {
  const result = await scoutingService.deleteWatchlist(req.params.id);
  await logAudit('DELETE', 'watchlists', result.id, buildAuditContext(req.user!, req.ip), 'Prospect removed');
  sendSuccess(res, result, 'Prospect deleted');
}

// ══════════════════════════════════════════
// SCREENING CASES
// ══════════════════════════════════════════

export async function createScreening(req: AuthRequest, res: Response) {
  const sc = await scoutingService.createScreeningCase(req.body, req.user!.id);
  await logAudit('CREATE', 'screening_cases', sc.id, buildAuditContext(req.user!, req.ip), `Screening ${sc.caseNumber} created`);
  sendCreated(res, sc);
}

export async function getScreening(req: AuthRequest, res: Response) {
  const sc = await scoutingService.getScreeningCase(req.params.id);
  sendSuccess(res, sc);
}

export async function updateScreening(req: AuthRequest, res: Response) {
  const sc = await scoutingService.updateScreeningCase(req.params.id, req.body);
  await logAudit('UPDATE', 'screening_cases', sc.id, buildAuditContext(req.user!, req.ip), `Screening ${sc.caseNumber} updated`);
  sendSuccess(res, sc, 'Screening case updated');
}

export async function markPackReady(req: AuthRequest, res: Response) {
  const sc = await scoutingService.markPackReady(req.params.id, req.user!.id);
  await logAudit('UPDATE', 'screening_cases', sc.id, buildAuditContext(req.user!, req.ip), `Pack ready for ${sc.caseNumber}`);
  sendSuccess(res, sc, 'Pack marked as ready');
}

// ══════════════════════════════════════════
// SELECTION DECISIONS
// ══════════════════════════════════════════

export async function createDecision(req: AuthRequest, res: Response) {
  console.log('📦 Decision body:', JSON.stringify(req.body));
  const d = await scoutingService.createDecision(req.body, req.user!.id);
  await logAudit('CREATE', 'selection_decisions', d.id, buildAuditContext(req.user!, req.ip), `Decision: ${d.decision}`);
  sendCreated(res, d);
}

export async function getDecision(req: AuthRequest, res: Response) {
  const d = await scoutingService.getDecision(req.params.id);
  sendSuccess(res, d);
}

// ── Pipeline Summary ──

export async function pipelineSummary(req: AuthRequest, res: Response) {
  const summary = await scoutingService.getPipelineSummary();
  sendSuccess(res, summary);
}