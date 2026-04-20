// ─────────────────────────────────────────────────────────────
// src/modules/saff/saff.controller.ts
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AuthRequest } from "@shared/types";
import * as saffService from "@modules/saff/saff.service";
import { getCurrentSeason } from "@modules/saff/saff.service";
import {
  getSyncStatus as getSchedulerStatus,
  runSync,
} from "@modules/saff/saff.scheduler";
import { scrapeChampionship } from "@modules/saff/saff.scraper";
import { SaffTournament } from "@modules/saff/saff.model";
import { enqueue, getQueue, QueueName } from "@modules/queues/queues";
import { logger } from "@config/logger";
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

// ── Fetch (Scrape) — enqueues a BullMQ job, returns immediately ──

export async function fetchFromSaff(req: AuthRequest, res: Response) {
  const jobId = await enqueue(QueueName.SaffFetch, "scrape", {
    kind: "scrape",
    fetchRequest: req.body,
    triggeredBy: req.user!.email,
  });
  await logAudit(
    "CREATE",
    "saff_standings",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF fetch job enqueued: ${jobId} (${req.body.tournamentIds?.length ?? 0} tournaments)`,
  );
  res.status(202).json({ success: true, data: { jobId } });
}

// ── Job status ──

export async function getJobStatus(req: AuthRequest, res: Response) {
  const { jobId } = req.params;
  const queue = getQueue(QueueName.SaffFetch);
  const job = await queue.getJob(jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }
  const status = await job.getState();
  sendSuccess(res, {
    jobId,
    status,
    progress: job.progress ?? null,
    result: job.returnvalue ?? null,
    error: job.failedReason ?? null,
  });
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

// ── Bulk Fetch Men's Leagues ──

export async function bulkFetchMenLeagues(req: AuthRequest, res: Response) {
  const season = req.body.season || getCurrentSeason();
  const result = await saffService.bulkFetchMenLeagues(season);
  await logAudit(
    "CREATE",
    "saff_tournaments",
    null,
    buildAuditContext(req.user!, req.ip),
    `Bulk fetch ${result.leagues} men's leagues for ${season}: ${result.fetch.results} tournaments, ${result.import.matches} matches`,
  );
  sendSuccess(
    res,
    result,
    `Bulk fetch completed for ${result.leagues} leagues`,
  );
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

// ── Sync Debug (diagnostic, read-only scrape) ──
//
// Runs scrapeChampionship() against ONE tournament and returns the raw result
// without writing to the DB. Lets admins diagnose scraper drift / network
// failures without waiting on the cron or mutating data.
export async function syncDebug(req: AuthRequest, res: Response) {
  const saffIdRaw = req.query.saffId ?? req.query.tournamentId;
  const saffId = Number(saffIdRaw);
  const season = (req.query.season as string) || getCurrentSeason();

  if (!saffIdRaw || Number.isNaN(saffId)) {
    return sendSuccess(
      res,
      { error: "Missing or invalid saffId query parameter" },
      "Bad request",
      400,
    );
  }

  const tournament = await SaffTournament.findOne({ where: { saffId } });

  let result;
  let error: string | null = null;
  const startedAt = Date.now();

  try {
    result = await scrapeChampionship(saffId, season);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startedAt;

  sendSuccess(
    res,
    {
      saffId,
      season,
      tournamentName: tournament?.name ?? null,
      tournamentActive: tournament?.isActive ?? null,
      durationMs,
      error,
      counts: result
        ? {
            standings: result.standings.length,
            fixtures: result.fixtures.length,
            teams: result.teams.length,
          }
        : null,
      sampleStanding: result?.standings?.[0] ?? null,
      sampleFixture: result?.fixtures?.[0] ?? null,
      standings: result?.standings ?? [],
      fixtures: (result?.fixtures ?? []).slice(0, 10),
    },
    error ? "Scrape failed" : "Scrape complete (no DB writes)",
  );
}

export async function triggerSync(req: AuthRequest, res: Response) {
  const { agencyValues = ["Critical", "High"], season = getCurrentSeason() } =
    req.body;

  const currentStatus = getSchedulerStatus();
  if (currentStatus.isRunning) {
    return sendSuccess(res, { skipped: true }, "Sync already running");
  }

  // Fire-and-forget — response returns in <100ms; status pill polls progress
  runSync(agencyValues, season, `manual:${req.user!.email}`).catch(
    (err: Error) =>
      logger.error(`[SAFF] triggerSync background error: ${err.message}`),
  );

  sendSuccess(res, { started: true }, "Sync started");
}

// ── Discover tournaments from saff.com.sa ──

export async function syncTournaments(req: AuthRequest, res: Response) {
  const season = req.body.season || getCurrentSeason();
  const jobId = await enqueue(QueueName.SaffFetch, "discover", {
    kind: "discover",
    season,
    triggeredBy: req.user!.email,
  });
  await logAudit(
    "CREATE",
    "saff_tournaments",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF tournament discovery job enqueued: ${jobId}`,
  );
  res.status(202).json({ success: true, data: { jobId } });
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
