// ─────────────────────────────────────────────────────────────
// src/modules/saff/saff.controller.ts
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AuthRequest } from "@shared/types";
import * as saffService from "@modules/saff/saff.service";
import * as sessionService from "@modules/saff/importSession.service";
import {
  getCurrentSeason,
  teamNameArResolver,
} from "@modules/saff/saff.service";
import {
  getSyncStatus as getSchedulerStatus,
  runSync,
} from "@modules/saff/saff.scheduler";
import { scrapeChampionship } from "@modules/saff/saff.scraper";
import { SaffTournament } from "@modules/saff/saff.model";
import { enqueue, getQueue, QueueName } from "@modules/queues/queues";
import { logger } from "@config/logger";
import { env } from "@config/env";
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
  if (!env.redis.url) {
    res.status(503).json({
      success: false,
      message: "Queue unavailable — REDIS_URL not configured",
    });
    return;
  }
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
    res.status(404).json({ success: false, message: "Job not found" });
    return;
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

// ── Bulk Fetch Men's Leagues (stage-only) ──

export async function bulkFetchMenLeagues(req: AuthRequest, res: Response) {
  const season = req.body.season || getCurrentSeason();
  const result = await saffService.bulkFetchMenLeagues(season);
  await logAudit(
    "CREATE",
    "saff_tournaments",
    null,
    buildAuditContext(req.user!, req.ip),
    `Bulk stage-only fetch for ${result.leagues} men's leagues for ${season}: ${result.fetch.results} tournaments, ${result.fetch.standings} standings, ${result.fetch.fixtures} fixtures`,
  );
  sendSuccess(
    res,
    result,
    `Staged ${result.leagues} leagues — run the wizard to apply`,
  );
}

// ── Stats ──

export async function getStats(req: AuthRequest, res: Response) {
  const season = req.query.season as string | undefined;
  const stats = await saffService.getStats(season);
  sendSuccess(res, stats);
}

// ── Available Seasons ──

export async function getSeasons(_req: AuthRequest, res: Response) {
  const seasons = await saffService.listSeasons();
  sendSuccess(res, seasons);
}

// ── Sync (Scheduler) ──

export async function getSyncStatus(req: AuthRequest, res: Response) {
  const status = getSchedulerStatus();
  sendSuccess(res, status);
}

export async function getScrapeRuns(req: AuthRequest, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const saffId = req.query.saffId ? Number(req.query.saffId) : undefined;
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;

  const runs = await saffService.getScrapeRuns({ limit, saffId, status });
  sendSuccess(res, runs);
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
    result = await scrapeChampionship(saffId, season, teamNameArResolver);
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
  const {
    agencyValues = ["Critical", "High", "Medium", "Scouting", "Low"],
    season = getCurrentSeason(),
  } = req.body;

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
  if (!env.redis.url) {
    res.status(503).json({
      success: false,
      message: "Queue unavailable — REDIS_URL not configured",
    });
    return;
  }
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

// ══════════════════════════════════════════
// IMPORT SESSION (WIZARD) HANDLERS
// ══════════════════════════════════════════

export async function createImportSession(req: AuthRequest, res: Response) {
  const session = await sessionService.createSession(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "saff_import_sessions",
    session.id,
    buildAuditContext(req.user!, req.ip),
    `Started SAFF import session for tournament ${session.saffId} ${session.season}`,
  );
  res.status(201).json({ success: true, data: session });
}

export async function getImportSession(req: AuthRequest, res: Response) {
  const session = await sessionService.getSession(req.params.id, req.user!.id);
  sendSuccess(res, session);
}

export async function listMyActiveImportSessions(
  req: AuthRequest,
  res: Response,
) {
  const sessions = await sessionService.listActiveSessionsForUser(req.user!.id);
  sendSuccess(res, sessions);
}

export async function uploadImportSession(req: AuthRequest, res: Response) {
  // The upload route accepts a JSON body (no multipart) — the file is
  // provided as a base64 or stringified payload, OR the user pastes the
  // JSON directly. The wizard's ManualUploadDropzone reads the file
  // client-side and POSTs the parsed JSON.
  const { payload, filename } = req.body;
  const session = await sessionService.uploadStaging(
    req.params.id,
    req.user!.id,
    payload,
    filename || "manual-upload.json",
  );
  await logAudit(
    "UPDATE",
    "saff_import_sessions",
    session.id,
    buildAuditContext(req.user!, req.ip),
    `Uploaded manual SAFF data for session ${session.id} (${session.snapshot?.validCounts?.standings ?? 0} standings, ${session.snapshot?.validCounts?.fixtures ?? 0} fixtures)`,
  );
  sendSuccess(res, session, "Upload accepted");
}

export async function updateImportSessionDecisions(
  req: AuthRequest,
  res: Response,
) {
  const session = await sessionService.updateDecisions(
    req.params.id,
    req.user!.id,
    req.body,
  );
  sendSuccess(res, session, "Decisions updated");
}

export async function previewImportSession(req: AuthRequest, res: Response) {
  const result = await sessionService.previewSession(
    req.params.id,
    req.user!.id,
  );
  sendSuccess(res, {
    session: result.session,
    preview: result.preview,
    digest: result.digest,
  });
}

export async function applyImportSession(req: AuthRequest, res: Response) {
  const result = await sessionService.applySession(
    req.params.id,
    req.user!.id,
    req.body,
  );
  await logAudit(
    "CREATE",
    "saff_import_sessions",
    result.session.id,
    buildAuditContext(req.user!, req.ip),
    `Applied SAFF import session ${result.session.id}: ${result.applied.clubsCreated} clubs, ${result.applied.matchesCreated} matches, ${result.applied.playersLinked} players linked`,
  );
  sendSuccess(res, result, "Import applied");
}

export async function abortImportSession(req: AuthRequest, res: Response) {
  const session = await sessionService.abortSession(
    req.params.id,
    req.user!.id,
  );
  await logAudit(
    "UPDATE",
    "saff_import_sessions",
    session.id,
    buildAuditContext(req.user!, req.ip),
    `Aborted SAFF import session ${session.id}`,
  );
  sendSuccess(res, session, "Session aborted");
}

// ── Reset All SAFF/SAFFPLUS Data ──

export async function resetData(req: AuthRequest, res: Response) {
  const { scope = "saff_only" } = req.body;
  const result = await saffService.resetSaffData(scope);
  await logAudit(
    "DELETE",
    "saff_tournaments",
    null,
    buildAuditContext(req.user!, req.ip),
    `SAFF reset (scope: ${scope}): ${result.tablesCleared.join(", ")}`,
  );
  sendSuccess(
    res,
    result,
    `SAFF data reset (${scope}): ${result.tablesCleared.length} tables cleared`,
  );
}
