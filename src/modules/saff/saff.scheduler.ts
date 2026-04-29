import cron, { ScheduledTask } from "node-cron";
import { logger } from "@config/logger";
import * as saffService from "@modules/saff/saff.service";
import { getCurrentSeason } from "@modules/saff/saff.service";
import { reapExpiredSessions } from "@modules/saff/importSession.service";
import { broadcastToAll } from "@modules/notifications/notification.sse";

// ══════════════════════════════════════════
// SCHEDULE CONFIG
// ══════════════════════════════════════════

interface SyncSchedule {
  name: string;
  cron: string; // cron expression
  agencyValues: string[]; // which tournaments to sync
}

const SCHEDULES: SyncSchedule[] = [
  {
    name: "Critical & High (every 12h)",
    cron: "0 */12 * * *", // At minute 0 of every 12th hour
    agencyValues: ["Critical", "High"],
  },
  {
    name: "Medium (daily at 4 AM)",
    cron: "0 4 * * *", // Every day at 04:00
    agencyValues: ["Medium"],
  },
  {
    name: "Scouting & Low (weekly Sunday 3 AM)",
    cron: "0 3 * * 0", // Every Sunday at 03:00
    agencyValues: ["Scouting", "Low"],
  },
];

// ══════════════════════════════════════════
// SYNC STATE (in-memory)
// ══════════════════════════════════════════

interface SyncStatus {
  lastRun: Date | null;
  lastSuccess: Date | null;
  lastError: string | null;
  isRunning: boolean;
  totalRuns: number;
  totalErrors: number;
  lastResult: {
    tournaments: number;
    standings: number;
    fixtures: number;
    teams: number;
  } | null;
}

const syncStatus: SyncStatus = {
  lastRun: null,
  lastSuccess: null,
  lastError: null,
  isRunning: false,
  totalRuns: 0,
  totalErrors: 0,
  lastResult: null,
};

export function getSyncStatus(): SyncStatus & {
  schedules: { name: string; cron: string; nextRun: string }[];
} {
  return {
    ...syncStatus,
    schedules: SCHEDULES.map((s) => ({
      name: s.name,
      cron: s.cron,
      nextRun: getNextCronRun(s.cron),
    })),
  };
}

// ══════════════════════════════════════════
// CORE SYNC FUNCTION
// ══════════════════════════════════════════

export interface RunSyncResult {
  skipped?: boolean;
  tournaments: number;
  standings: number;
  fixtures: number;
  teams: number;
  season: string;
  agencyValues: string[];
  error: string | null;
  targetTournamentNames: string[];
}

export async function runSync(
  agencyValues: string[],
  season: string = getCurrentSeason(),
  triggerSource: string = "scheduler",
): Promise<RunSyncResult> {
  if (syncStatus.isRunning) {
    logger.warn(
      `[SAFF Scheduler] Sync already running, skipping (triggered by ${triggerSource})`,
    );
    return {
      skipped: true,
      tournaments: 0,
      standings: 0,
      fixtures: 0,
      teams: 0,
      season,
      agencyValues,
      error: "Sync already running",
      targetTournamentNames: [],
    };
  }

  syncStatus.isRunning = true;
  syncStatus.lastRun = new Date();
  syncStatus.totalRuns++;

  logger.info(
    `[SAFF Scheduler] Starting sync — ${triggerSource} — values: [${agencyValues.join(", ")}] — season: ${season}`,
  );

  broadcastToAll("saff.sync.started", {
    isRunning: true,
    lastRun: syncStatus.lastRun.toISOString(),
    triggerSource,
  });

  try {
    // 1. Get tournament IDs matching the agency values
    const tournamentsResult = await saffService.listTournaments({
      limit: 50,
      page: 1,
    });
    const allTournaments = tournamentsResult.data;

    const targetTournaments = allTournaments.filter(
      (t: any) => agencyValues.includes(t.agencyValue) && t.isActive,
    );

    if (targetTournaments.length === 0) {
      logger.info(
        `[SAFF Scheduler] No active tournaments for values [${agencyValues.join(", ")}]`,
      );
      syncStatus.isRunning = false;
      return {
        tournaments: 0,
        standings: 0,
        fixtures: 0,
        teams: 0,
        season,
        agencyValues,
        error: null,
        targetTournamentNames: [],
      };
    }

    const tournamentIds = targetTournaments.map((t: any) => t.saffId);
    const tournamentNames = targetTournaments.map((t: any) => t.name as string);

    logger.info(
      `[SAFF Scheduler] Found ${tournamentIds.length} tournaments to sync: ${tournamentNames.join(", ")}`,
    );

    // 2. Fetch from SAFF
    const result = await saffService.fetchFromSaff(
      {
        tournamentIds,
        season,
        dataTypes: ["standings", "fixtures", "teams"],
      },
      triggerSource,
    );

    syncStatus.lastSuccess = new Date();
    syncStatus.lastError = null;
    syncStatus.lastResult = {
      tournaments: result.results,
      standings: result.standings,
      fixtures: result.fixtures,
      teams: result.teams,
    };

    logger.info(
      `[SAFF Scheduler] ✓ Sync complete — ${result.results} tournaments, ` +
        `${result.standings} standings, ${result.fixtures} fixtures, ${result.teams} teams`,
    );

    broadcastToAll("saff.sync.done", {
      isRunning: false,
      lastRun: syncStatus.lastRun?.toISOString() ?? null,
      lastSuccess: syncStatus.lastSuccess.toISOString(),
      error: null,
      result: syncStatus.lastResult,
    });

    return {
      tournaments: result.results,
      standings: result.standings,
      fixtures: result.fixtures,
      teams: result.teams,
      season,
      agencyValues,
      error: null,
      targetTournamentNames: tournamentNames,
    };
  } catch (error: any) {
    syncStatus.lastError = error.message;
    syncStatus.totalErrors++;
    logger.error(`[SAFF Scheduler] ✗ Sync failed: ${error.message}`);

    broadcastToAll("saff.sync.done", {
      isRunning: false,
      lastRun: syncStatus.lastRun?.toISOString() ?? null,
      lastSuccess: syncStatus.lastSuccess?.toISOString() ?? null,
      error: error.message,
      result: null,
    });

    return {
      tournaments: 0,
      standings: 0,
      fixtures: 0,
      teams: 0,
      season,
      agencyValues,
      error: error.message,
      targetTournamentNames: [],
    };
  } finally {
    syncStatus.isRunning = false;
  }
}

// ══════════════════════════════════════════
// SESSION REAPER — every hour
// ══════════════════════════════════════════

const SESSION_REAPER_CRON = "0 * * * *";

// ══════════════════════════════════════════
// START ALL CRON JOBS
// ══════════════════════════════════════════

const cronJobs: ScheduledTask[] = [];

export function startSaffScheduler(): void {
  // After the wizard redesign: the cron schedules below only refresh
  // staging tables (saff_standings, saff_fixtures, saff_team_maps) so the
  // Browse views stay current. Production tables (clubs, matches,
  // competitions, match_players) are only mutated when a human runs the
  // wizard and clicks Apply.
  logger.info("[SAFF Scheduler] Starting SAFF stage-only scheduler...");

  for (const schedule of SCHEDULES) {
    const job = cron.schedule(schedule.cron, () => {
      runSync(
        schedule.agencyValues,
        getCurrentSeason(),
        `cron:${schedule.name}`,
      ).catch((err) =>
        logger.error(
          `[SAFF Scheduler] Cron job '${schedule.name}' failed: ${(err as Error).message}`,
        ),
      );
    });
    cronJobs.push(job);
    logger.info(
      `[SAFF Scheduler] Scheduled (stage-only): ${schedule.name} (${schedule.cron})`,
    );
  }

  // Wizard session reaper — deletes expired in-flight sessions every hour
  const reaperJob = cron.schedule(SESSION_REAPER_CRON, () => {
    reapExpiredSessions().catch((err) =>
      logger.error(
        `[SAFF Scheduler] Session reaper failed: ${(err as Error).message}`,
      ),
    );
  });
  cronJobs.push(reaperJob);
  logger.info(
    `[SAFF Scheduler] Scheduled: Wizard session reaper (${SESSION_REAPER_CRON})`,
  );

  logger.info(`[SAFF Scheduler] ${cronJobs.length} cron jobs active ✓`);
}

export function stopSaffScheduler(): void {
  cronJobs.forEach((job) => job.stop());
  cronJobs.length = 0;
  logger.info("[SAFF Scheduler] All cron jobs stopped");
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

function getNextCronRun(cronExpr: string): string {
  try {
    // Simple estimation — node-cron doesn't expose next run natively
    // For display purposes, calculate from the expression
    const now = new Date();
    const parts = cronExpr.split(" ");

    if (parts[1] === "*/12") {
      // Every 12 hours
      const nextHour = Math.ceil(now.getHours() / 12) * 12;
      const next = new Date(now);
      next.setHours(nextHour, 0, 0, 0);
      if (next <= now) next.setHours(next.getHours() + 12);
      return next.toISOString();
    }

    if (parts[1] && !parts[1].includes("*")) {
      // Specific hour
      const hour = parseInt(parts[1], 10);
      const next = new Date(now);
      next.setHours(hour, parseInt(parts[0], 10) || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }

    return "See cron expression";
  } catch {
    return "Unknown";
  }
}
