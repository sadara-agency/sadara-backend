"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncStatus = getSyncStatus;
exports.runSync = runSync;
exports.startSaffScheduler = startSaffScheduler;
exports.stopSaffScheduler = stopSaffScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../../config/logger");
const saffService = __importStar(require("./saff.service"));
// Current season — update each year
const CURRENT_SEASON = '2025-2026';
const SCHEDULES = [
    {
        name: 'Critical & High (every 12h)',
        cron: '0 */12 * * *', // At minute 0 of every 12th hour
        agencyValues: ['Critical', 'High'],
        season: CURRENT_SEASON,
    },
    {
        name: 'Medium (daily at 4 AM)',
        cron: '0 4 * * *', // Every day at 04:00
        agencyValues: ['Medium'],
        season: CURRENT_SEASON,
    },
    {
        name: 'Scouting & Low (weekly Sunday 3 AM)',
        cron: '0 3 * * 0', // Every Sunday at 03:00
        agencyValues: ['Scouting', 'Low'],
        season: CURRENT_SEASON,
    },
];
const syncStatus = {
    lastRun: null,
    lastSuccess: null,
    lastError: null,
    isRunning: false,
    totalRuns: 0,
    totalErrors: 0,
    lastResult: null,
};
function getSyncStatus() {
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
async function runSync(agencyValues, season, triggerSource = 'scheduler') {
    if (syncStatus.isRunning) {
        logger_1.logger.warn(`[SAFF Scheduler] Sync already running, skipping (triggered by ${triggerSource})`);
        return;
    }
    syncStatus.isRunning = true;
    syncStatus.lastRun = new Date();
    syncStatus.totalRuns++;
    logger_1.logger.info(`[SAFF Scheduler] Starting sync — ${triggerSource} — values: [${agencyValues.join(', ')}] — season: ${season}`);
    try {
        // 1. Get tournament IDs matching the agency values
        const tournamentsResult = await saffService.listTournaments({ limit: 50, page: 1 });
        const allTournaments = tournamentsResult.data;
        const targetTournaments = allTournaments.filter((t) => agencyValues.includes(t.agencyValue) && t.isActive);
        if (targetTournaments.length === 0) {
            logger_1.logger.info(`[SAFF Scheduler] No active tournaments for values [${agencyValues.join(', ')}]`);
            syncStatus.isRunning = false;
            return;
        }
        const tournamentIds = targetTournaments.map((t) => t.saffId);
        logger_1.logger.info(`[SAFF Scheduler] Found ${tournamentIds.length} tournaments to sync: ${targetTournaments.map((t) => t.name).join(', ')}`);
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
        logger_1.logger.info(`[SAFF Scheduler] ✓ Sync complete — ${result.results} tournaments, ` +
            `${result.standings} standings, ${result.fixtures} fixtures, ${result.teams} teams`);
    }
    catch (error) {
        syncStatus.lastError = error.message;
        syncStatus.totalErrors++;
        logger_1.logger.error(`[SAFF Scheduler] ✗ Sync failed: ${error.message}`);
    }
    finally {
        syncStatus.isRunning = false;
    }
}
// ══════════════════════════════════════════
// START ALL CRON JOBS
// ══════════════════════════════════════════
const cronJobs = [];
function startSaffScheduler() {
    logger_1.logger.info('[SAFF Scheduler] Initializing auto-sync schedules...');
    for (const schedule of SCHEDULES) {
        if (!node_cron_1.default.validate(schedule.cron)) {
            logger_1.logger.error(`[SAFF Scheduler] Invalid cron expression for "${schedule.name}": ${schedule.cron}`);
            continue;
        }
        const job = node_cron_1.default.schedule(schedule.cron, () => {
            runSync(schedule.agencyValues, schedule.season, `cron:${schedule.name}`);
        }, {
            timezone: 'Asia/Riyadh',
        });
        cronJobs.push(job);
        logger_1.logger.info(`[SAFF Scheduler] ✓ Registered: "${schedule.name}" — ${schedule.cron} (Asia/Riyadh)`);
    }
    logger_1.logger.info(`[SAFF Scheduler] ${cronJobs.length} cron jobs active`);
    // Run initial sync for Critical tournaments 30 seconds after startup
    setTimeout(() => {
        logger_1.logger.info('[SAFF Scheduler] Running initial Critical sync on startup...');
        runSync(['Critical'], CURRENT_SEASON, 'startup');
    }, 30_000);
}
function stopSaffScheduler() {
    cronJobs.forEach(job => job.stop());
    cronJobs.length = 0;
    logger_1.logger.info('[SAFF Scheduler] All cron jobs stopped');
}
// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function getNextCronRun(cronExpr) {
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
            if (next <= now)
                next.setHours(next.getHours() + 12);
            return next.toISOString();
        }
        if (parts[1] && !parts[1].includes('*')) {
            // Specific hour
            const hour = parseInt(parts[1], 10);
            const next = new Date(now);
            next.setHours(hour, parseInt(parts[0], 10) || 0, 0, 0);
            if (next <= now)
                next.setDate(next.getDate() + 1);
            return next.toISOString();
        }
        return 'See cron expression';
    }
    catch {
        return 'Unknown';
    }
}
//# sourceMappingURL=saff.scheduler.js.map