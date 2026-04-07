import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { logger } from "@config/logger";
import * as scoutingService from "@modules/scouting/scouting.service";

// ══════════════════════════════════════════
// WATCHLIST
// ══════════════════════════════════════════

export async function listWatchlist(req: AuthRequest, res: Response) {
  const result = await scoutingService.listWatchlist(req.query, req.user);
  sendPaginated(res, result.data, result.meta);
}

export async function getWatchlistById(req: AuthRequest, res: Response) {
  const item = await scoutingService.getWatchlistById(req.params.id, req.user);
  sendSuccess(res, item);
}

export async function createWatchlist(req: AuthRequest, res: Response) {
  const item = await scoutingService.createWatchlist(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "watchlists",
    item.id,
    buildAuditContext(req.user!, req.ip),
    `Added prospect: ${item.prospectName}`,
  );
  sendCreated(res, item);
}

export async function updateWatchlist(req: AuthRequest, res: Response) {
  const item = await scoutingService.updateWatchlist(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "watchlists",
    item.id,
    buildAuditContext(req.user!, req.ip),
    `Updated prospect: ${item.prospectName}`,
  );
  sendSuccess(res, item, "Prospect updated");
}

export async function updateWatchlistStatus(req: AuthRequest, res: Response) {
  const item = await scoutingService.updateWatchlistStatus(
    req.params.id,
    req.body.status,
  );
  await logAudit(
    "UPDATE",
    "watchlists",
    item.id,
    buildAuditContext(req.user!, req.ip),
    `Status → ${item.status}`,
  );
  sendSuccess(res, item, `Status updated to ${item.status}`);
}

export async function deleteWatchlist(req: AuthRequest, res: Response) {
  const result = await scoutingService.deleteWatchlist(req.params.id);
  await logAudit(
    "DELETE",
    "watchlists",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Prospect removed",
  );
  sendSuccess(res, result, "Prospect deleted");
}

export async function checkDuplicate(req: AuthRequest, res: Response) {
  const { name, dob, club } = req.query as Record<string, string>;
  const matches = await scoutingService.checkDuplicate(name, dob, club);
  sendSuccess(res, matches);
}

// ══════════════════════════════════════════
// BULK OPERATIONS
// ══════════════════════════════════════════

export async function bulkStatus(req: AuthRequest, res: Response) {
  const { ids, status } = req.body;
  const result = await scoutingService.bulkUpdateStatus(ids, status);
  await logAudit(
    "UPDATE",
    "watchlists",
    null,
    buildAuditContext(req.user!, req.ip),
    `Bulk status → ${status} (${ids.length} prospects)`,
  );
  sendSuccess(res, result, `${result.updated} prospects updated`);
}

export async function bulkPriority(req: AuthRequest, res: Response) {
  const { ids, priority } = req.body;
  const result = await scoutingService.bulkUpdatePriority(ids, priority);
  await logAudit(
    "UPDATE",
    "watchlists",
    null,
    buildAuditContext(req.user!, req.ip),
    `Bulk priority → ${priority} (${ids.length} prospects)`,
  );
  sendSuccess(res, result, `${result.updated} prospects updated`);
}

export async function bulkDelete(req: AuthRequest, res: Response) {
  const { ids } = req.body;
  const result = await scoutingService.bulkDelete(ids);
  await logAudit(
    "DELETE",
    "watchlists",
    null,
    buildAuditContext(req.user!, req.ip),
    `Bulk delete (${ids.length} prospects)`,
  );
  sendSuccess(res, result, `${result.deleted} prospects deleted`);
}

export async function exportCsv(req: AuthRequest, res: Response) {
  const { ids } = req.body;
  const csv = await scoutingService.exportWatchlistCsv(ids);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=scouting-export.csv",
  );
  res.send("\uFEFF" + csv); // BOM for Excel Arabic support
}

// ══════════════════════════════════════════
// SCREENING CASES
// ══════════════════════════════════════════

export async function createScreening(req: AuthRequest, res: Response) {
  const sc = await scoutingService.createScreeningCase(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "screening_cases",
    sc.id,
    buildAuditContext(req.user!, req.ip),
    `Screening ${sc.caseNumber} created`,
  );
  sendCreated(res, sc);
}

export async function getScreening(req: AuthRequest, res: Response) {
  const sc = await scoutingService.getScreeningCase(req.params.id);
  sendSuccess(res, sc);
}

export async function updateScreening(req: AuthRequest, res: Response) {
  const sc = await scoutingService.updateScreeningCase(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "screening_cases",
    sc.id,
    buildAuditContext(req.user!, req.ip),
    `Screening ${sc.caseNumber} updated`,
  );
  sendSuccess(res, sc, "Screening case updated");
}

export async function markPackReady(req: AuthRequest, res: Response) {
  const sc = await scoutingService.markPackReady(req.params.id, req.user!.id);
  await logAudit(
    "UPDATE",
    "screening_cases",
    sc.id,
    buildAuditContext(req.user!, req.ip),
    `Pack ready for ${sc.caseNumber}`,
  );
  sendSuccess(res, sc, "Pack marked as ready");
}

// ══════════════════════════════════════════
// SELECTION DECISIONS
// ══════════════════════════════════════════

export async function createDecision(req: AuthRequest, res: Response) {
  logger.debug("Decision body", { body: req.body });
  const d = await scoutingService.createDecision(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "selection_decisions",
    d.id,
    buildAuditContext(req.user!, req.ip),
    `Decision: ${d.decision}`,
  );
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

export async function scoutDashboard(req: AuthRequest, res: Response) {
  const data = await scoutingService.getScoutDashboard(req.user!.id);
  sendSuccess(res, data);
}

// ── Prospect Timeline ──

export async function prospectTimeline(req: AuthRequest, res: Response) {
  const events = await scoutingService.getProspectTimeline(req.params.id);
  sendSuccess(res, events);
}
