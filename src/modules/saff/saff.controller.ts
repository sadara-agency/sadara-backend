// ─────────────────────────────────────────────────────────────
// src/modules/saff/saff.controller.ts
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import {
  sendSuccess,
  sendPaginated,
  sendCreated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AuthRequest } from "@shared/types";
import * as saffService from "@modules/saff/saff.service";
import { getCurrentSeason } from "@modules/saff/saff.service";
import {
  getSyncStatus as getSchedulerStatus,
  runSync,
} from "@modules/saff/saff.scheduler";
import type {
  TournamentQuery,
  StandingQuery,
  FixtureQuery,
  TeamMapQuery,
} from "@modules/saff/saff.validation";

// ── Tournaments ──

export async function listTournaments(req: AuthRequest, res: Response) {
  const result = await saffService.listTournaments(
    req.query as unknown as TournamentQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function seedTournaments(req: AuthRequest, res: Response) {
  const count = await saffService.seedTournaments();
  await logAudit(
    "CREATE",
    "saff_tournaments",
    null,
    buildAuditContext(req.user!, req.ip),
    `Seeded ${count} SAFF tournaments`,
  );
  sendSuccess(res, { count }, `Seeded ${count} new tournaments`);
}

// ── Fetch (Scrape) ──

export async function fetchFromSaff(req: AuthRequest, res: Response) {
  const result = await saffService.fetchFromSaff(req.body);
  await logAudit(
    "CREATE",
    "saff_standings",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF fetch: ${result.results} tournaments, ${result.standings} standings, ${result.fixtures} fixtures`,
  );
  sendSuccess(res, result, `Fetched data from ${result.results} tournaments`);
}

// ── Standings ──

export async function listStandings(req: AuthRequest, res: Response) {
  const result = await saffService.listStandings(
    req.query as unknown as StandingQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── Fixtures ──

export async function listFixtures(req: AuthRequest, res: Response) {
  const result = await saffService.listFixtures(
    req.query as unknown as FixtureQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

// ── Team Maps ──

export async function listTeamMaps(req: AuthRequest, res: Response) {
  const result = await saffService.listTeamMaps(
    req.query as unknown as TeamMapQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function mapTeam(req: AuthRequest, res: Response) {
  const result = await saffService.mapTeamToClub(req.body);
  await logAudit(
    "UPDATE",
    "saff_team_maps",
    null,
    buildAuditContext(req.user!, req.ip),
    `Mapped SAFF team ${req.body.saffTeamId} → club ${req.body.clubId}`,
  );
  sendSuccess(res, result, "Team mapped successfully");
}

// ── Import ──

export async function importToSadara(req: AuthRequest, res: Response) {
  const result = await saffService.importToSadara(req.body);
  await logAudit(
    "CREATE",
    "clubs",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF import: ${result.clubs} clubs, ${result.matches} matches, ${result.playersLinked} players linked`,
  );
  sendSuccess(res, { imported: result }, "Import completed");
}

// ── Fetch Team Logos ──

export async function fetchTeamLogos(req: AuthRequest, res: Response) {
  const { season = getCurrentSeason() } = req.body;
  const result = await saffService.fetchTeamLogos(season);
  await logAudit(
    "UPDATE",
    "saff_team_maps",
    null,
    buildAuditContext(req.user!, req.ip),
    `Fetched ${result.fetched} team logos out of ${result.total}`,
  );
  sendSuccess(res, result, `Fetched ${result.fetched} logos`);
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
  const { agencyValues = ["Critical", "High"], season = getCurrentSeason() } =
    req.body;

  // Run in background — don't await
  runSync(agencyValues, season, `manual:${req.user!.email}`);

  sendSuccess(res, { agencyValues, season }, "Sync triggered in background");
}

// ── Player-centric endpoints ──

export async function getPlayerUpcomingMatches(
  req: AuthRequest,
  res: Response,
) {
  const season = (req.query.season as string) || getCurrentSeason();
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const result = await saffService.getPlayerUpcomingMatches(season, limit);
  sendSuccess(res, result);
}

export async function getPlayerCompetitionStats(
  req: AuthRequest,
  res: Response,
) {
  const { playerId } = req.params;
  const season = (req.query.season as string) || getCurrentSeason();
  const result = await saffService.getPlayerCompetitionStats(playerId, season);
  sendSuccess(res, result);
}

export async function getWatchlistMatches(req: AuthRequest, res: Response) {
  const season = (req.query.season as string) || getCurrentSeason();
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const result = await saffService.getWatchlistMatches(season, limit);
  sendSuccess(res, result);
}
