
import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../../config/logger';
import * as saffService from './saff.service';

// ══════════════════════════════════════════
// SCHEDULE CONFIG
// ══════════════════════════════════════════

interface SyncSchedule {
  name: string;
  cron: string;          // cron expression
  agencyValues: string[]; // which tournaments to sync
  season: string;
}

// Current season — update each year
const CURRENT_SEASON = '2025-2026';

const SCHEDULES: SyncSchedule[] = [
  {
    name: 'Critical & High (every 12h)',
    cron: '0 */12 * * *',  // At minute 0 of every 12th hour
    agencyValues: ['Critical', 'High'],
    season: CURRENT_SEASON,
  },
  {
    name: 'Medium (daily at 4 AM)',
    cron: '0 4 * * *',     // Every day at 04:00
    agencyValues: ['Medium'],
    season: CURRENT_SEASON,
  },
  {
    name: 'Scouting & Low (weekly Sunday 3 AM)',
    cron: '0 3 * * 0',     // Every Sunday at 03:00
    agencyValues: ['Scouting', 'Low'],
    season: CURRENT_SEASON,
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

export function getSyncStatus(): SyncStatus & { schedules: { name: string; cron: string; nextRun: string }[] } {
  return {
    ...syncStatus,
    schedules: SCHEDULES.map(s => ({
      name: s.name,
      cron: s.cron,
      nextRun: getNextCronRun(s.cron),
    })),
  };
}

// ══════════════════════════════════════════
// CORE SYNC FUNCTION
// ══════════════════════════════════════════

export async function runSync(agencyValues: string[], season: string, triggerSource: string = 'scheduler'): Promise<void> {
  if (syncStatus.isRunning) {
    logger.warn(`[SAFF Scheduler] Sync already running, skipping (triggered by ${triggerSource})`);
    return;
  }

  syncStatus.isRunning = true;
  syncStatus.lastRun = new Date();
  syncStatus.totalRuns++;

  logger.info(`[SAFF Scheduler] Starting sync — ${triggerSource} — values: [${agencyValues.join(', ')}] — season: ${season}`);

  try {
    // 1. Get tournament IDs matching the agency values
    const tournamentsResult = await saffService.listTournaments({ limit: 50, page: 1 });
    const allTournaments = tournamentsResult.data;

    const targetTournaments = allTournaments.filter(
      (t: any) => agencyValues.includes(t.agencyValue) && t.isActive
    );

    if (targetTournaments.length === 0) {
      logger.info(`[SAFF Scheduler] No active tournaments for values [${agencyValues.join(', ')}]`);
      syncStatus.isRunning = false;
      return;
    }

    const tournamentIds = targetTournaments.map((t: any) => t.saffId);

    logger.info(`[SAFF Scheduler] Found ${tournamentIds.length} tournaments to sync: ${targetTournaments.map((t: any) => t.name).join(', ')}`);

    // 2. Fetch from SAFF
    const result = await saffService.fetchFromSaff({
      tournamentIds,
      season,
      dataTypes: ['standings', 'fixtures', 'teams'],
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
      `${result.standings} standings, ${result.fixtures} fixtures, ${result.teams} teams`
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
  logger.info('[SAFF Scheduler] Initializing auto-sync schedules...');

  for (const schedule of SCHEDULES) {
    if (!cron.validate(schedule.cron)) {
      logger.error(`[SAFF Scheduler] Invalid cron expression for "${schedule.name}": ${schedule.cron}`);
      continue;
    }

    const job = cron.schedule(schedule.cron, () => {
      runSync(schedule.agencyValues, schedule.season, `cron:${schedule.name}`);
    }, {
      timezone: 'Asia/Riyadh',
    });

    cronJobs.push(job);
    logger.info(`[SAFF Scheduler] ✓ Registered: "${schedule.name}" — ${schedule.cron} (Asia/Riyadh)`);
  }

  logger.info(`[SAFF Scheduler] ${cronJobs.length} cron jobs active`);

  // Run initial sync for Critical tournaments 30 seconds after startup
  setTimeout(() => {
    logger.info('[SAFF Scheduler] Running initial Critical sync on startup...');
    runSync(['Critical'], CURRENT_SEASON, 'startup');
  }, 30_000);
}

export function stopSaffScheduler(): void {
  cronJobs.forEach(job => job.stop());
  cronJobs.length = 0;
  logger.info('[SAFF Scheduler] All cron jobs stopped');
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

function getNextCronRun(cronExpr: string): string {
  try {
    // Simple estimation — node-cron doesn't expose next run natively
    // For display purposes, calculate from the expression
    const now = new Date();
    const parts = cronExpr.split(' ');

    if (parts[1] === '*/12') {
      // Every 12 hours
      const nextHour = Math.ceil(now.getHours() / 12) * 12;
      const next = new Date(now);
      next.setHours(nextHour, 0, 0, 0);
      if (next <= now) next.setHours(next.getHours() + 12);
      return next.toISOString();
    }

    if (parts[1] && !parts[1].includes('*')) {
      // Specific hour
      const hour = parseInt(parts[1], 10);
      const next = new Date(now);
      next.setHours(hour, parseInt(parts[0], 10) || 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }

    return 'See cron expression';
  } catch {
    return 'Unknown';
  }
}