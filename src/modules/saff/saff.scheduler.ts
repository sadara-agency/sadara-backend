import cron, { ScheduledTask } from "node-cron";
import { logger } from "@config/logger";
import * as saffService from "@modules/saff/saff.service";
import { getCurrentSeason } from "@modules/saff/saff.service";

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

export async function runSync(
  agencyValues: string[],
  season: string = getCurrentSeason(),
  triggerSource: string = "scheduler",
): Promise<void> {
  if (syncStatus.isRunning) {
    logger.warn(
      `[SAFF Scheduler] Sync already running, skipping (triggered by ${triggerSource})`,
    );
    return;
  }

  syncStatus.isRunning = true;
  syncStatus.lastRun = new Date();
  syncStatus.totalRuns++;

  logger.info(
    `[SAFF Scheduler] Starting sync — ${triggerSource} — values: [${agencyValues.join(", ")}] — season: ${season}`,
  );

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
      return;
    }

    const tournamentIds = targetTournaments.map((t: any) => t.saffId);

    logger.info(
      `[SAFF Scheduler] Found ${tournamentIds.length} tournaments to sync: ${targetTournaments.map((t: any) => t.name).join(", ")}`,
    );

    // 2. Fetch from SAFF
    const result = await saffService.fetchFromSaff({
      tournamentIds,
      season,
      dataTypes: ["standings", "fixtures", "teams"],
    });

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
  } catch (error: any) {
    syncStatus.lastError = error.message;
    syncStatus.totalErrors++;
    logger.error(`[SAFF Scheduler] ✗ Sync failed: ${error.message}`);
  } finally {
    syncStatus.isRunning = false;
  }
}

// ══════════════════════════════════════════
// START ALL CRON JOBS
// ══════════════════════════════════════════

const cronJobs: ScheduledTask[] = [];

export function startSaffScheduler(): void {
  // Re-enabled 2026-04-14: saff.com.sa verified alive. Acts as secondary source;
  // SAFF+ and the Saudi Leagues cron engine are primary.
  // runSync() handles 404 responses gracefully — warns and returns without throwing.
  logger.info("[SAFF Scheduler] Starting SAFF sync scheduler...");

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
      `[SAFF Scheduler] Scheduled: ${schedule.name} (${schedule.cron})`,
    );
  }

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
