// ─────────────────────────────────────────────────────────────
// src/modules/saff/saff.controller.ts
// ─────────────────────────────────────────────────────────────

import { Response } from 'express';
import { sendSuccess, sendPaginated, sendCreated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { AuthRequest } from '../../shared/types';
import * as saffService from './saff.service';
import { getSyncStatus as getSchedulerStatus, runSync } from './saff.scheduler';

// ── Tournaments ──

export async function listTournaments(req: AuthRequest, res: Response) {
  const result = await saffService.listTournaments(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function seedTournaments(req: AuthRequest, res: Response) {
  const count = await saffService.seedTournaments();
  await logAudit('CREATE', 'saff_tournaments', null, buildAuditContext(req.user!, req.ip), `Seeded ${count} SAFF tournaments`);
  sendSuccess(res, { count }, `Seeded ${count} new tournaments`);
}

// ── Fetch (Scrape) ──

export async function fetchFromSaff(req: AuthRequest, res: Response) {
  const result = await saffService.fetchFromSaff(req.body);
  await logAudit('CREATE', 'saff_standings', null, buildAuditContext(req.user!, req.ip),
    `SAFF fetch: ${result.results} tournaments, ${result.standings} standings, ${result.fixtures} fixtures`
  );
  sendSuccess(res, result, `Fetched data from ${result.results} tournaments`);
}

// ── Standings ──

export async function listStandings(req: AuthRequest, res: Response) {
  const result = await saffService.listStandings(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Fixtures ──

export async function listFixtures(req: AuthRequest, res: Response) {
  const result = await saffService.listFixtures(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Team Maps ──

export async function listTeamMaps(req: AuthRequest, res: Response) {
  const result = await saffService.listTeamMaps(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function mapTeam(req: AuthRequest, res: Response) {
  const result = await saffService.mapTeamToClub(req.body);
  await logAudit('UPDATE', 'saff_team_maps', null, buildAuditContext(req.user!, req.ip),
    `Mapped SAFF team ${req.body.saffTeamId} → club ${req.body.clubId}`
  );
  sendSuccess(res, result, 'Team mapped successfully');
}

// ── Import ──

export async function importToSadara(req: AuthRequest, res: Response) {
  const result = await saffService.importToSadara(req.body);
  await logAudit('CREATE', 'clubs', null, buildAuditContext(req.user!, req.ip),
    `SAFF import: ${result.clubs} clubs, ${result.matches} matches`
  );
  sendSuccess(res, { imported: result }, 'Import completed');
}

// ── Stats ──

export async function getStats(req: AuthRequest, res: Response) {
  const stats = await saffService.getStats();
  sendSuccess(res, stats);
}

// ── Sync (Scheduler) ──

export async function getSyncStatus(req: AuthRequest, res: Response) {
  const status = getSchedulerStatus();
  sendSuccess(res, status);
}

export async function triggerSync(req: AuthRequest, res: Response) {
  const { agencyValues = ['Critical', 'High'], season = '2025-2026' } = req.body;

  // Run in background — don't await
  runSync(agencyValues, season, `manual:${req.user!.email}`);

  sendSuccess(res, { agencyValues, season }, 'Sync triggered in background');
}