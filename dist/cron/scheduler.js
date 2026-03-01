"use strict";
// ═══════════════════════════════════════════════════════════════
// src/cron/scheduler.ts
// ═══════════════════════════════════════════════════════════════
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobNames = getJobNames;
exports.runJob = runJob;
exports.runAllJobs = runAllJobs;
exports.startCronJobs = startCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const notification_service_1 = require("../modules/notifications/notification.service");
// ── Job registry ──
const jobs = {};
function registerJob(name, fn) {
    jobs[name] = fn;
}
// ── Safe wrapper for scheduled execution ──
function safeJob(name) {
    return async () => {
        try {
            logger_1.logger.info(`[CRON] Starting: ${name}`);
            const start = Date.now();
            await jobs[name]();
            logger_1.logger.info(`[CRON] Completed: ${name} (${Date.now() - start}ms)`);
        }
        catch (err) {
            logger_1.logger.error(`[CRON] Failed: ${name}`, err);
        }
    };
}
// ══════════════════════════════════════════════════════════════
// JOB 1: Contract Expiry Alerts
// ══════════════════════════════════════════════════════════════
async function checkContractExpiry() {
    const thresholds = [
        { days: 30, priority: 'high', label: '30 days', labelAr: '30 يوم' },
        { days: 60, priority: 'normal', label: '60 days', labelAr: '60 يوم' },
        { days: 90, priority: 'low', label: '90 days', labelAr: '90 يوم' },
    ];
    let notified = 0;
    for (const t of thresholds) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + t.days);
        const dateStr = targetDate.toISOString().split('T')[0];
        const contracts = await database_1.sequelize.query(`
      SELECT c.id, c.end_date, c.status,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
             cl.name as club_name, cl.name_ar as club_name_ar
      FROM contracts c
      JOIN players p ON p.id = c.player_id
      LEFT JOIN clubs cl ON cl.id = c.club_id
      WHERE c.status = 'Active'
        AND c.end_date = :targetDate
    `, { replacements: { targetDate: dateStr }, type: 'SELECT' });
        for (const c of contracts) {
            const playerName = `${c.first_name} ${c.last_name}`.trim();
            const playerNameAr = c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}`.trim() : playerName;
            await (0, notification_service_1.notifyByRole)(['Admin', 'Manager'], {
                type: 'contract',
                title: `Contract expiring in ${t.label}: ${playerName}`,
                titleAr: `عقد ينتهي خلال ${t.labelAr}: ${playerNameAr}`,
                body: `${playerName}'s contract with ${c.club_name || 'Unknown'} expires on ${c.end_date}`,
                bodyAr: `عقد ${playerNameAr} مع ${c.club_name_ar || c.club_name || 'غير معروف'} ينتهي في ${c.end_date}`,
                link: `/dashboard/contracts/${c.id}`,
                sourceType: 'contract',
                sourceId: c.id,
                priority: t.priority,
            });
            notified++;
        }
    }
    return { contractsChecked: notified };
}
// ══════════════════════════════════════════════════════════════
// JOB 2: Injury Follow-up Reminders
// ══════════════════════════════════════════════════════════════
async function checkInjuryFollowups() {
    const today = new Date().toISOString().split('T')[0];
    const overdueInjuries = await database_1.sequelize.query(`
    SELECT i.id, i.injury_type, i.expected_return_date, i.severity,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.agent_id
    FROM injuries i
    JOIN players p ON p.id = i.player_id
    WHERE i.status IN ('UnderTreatment', 'Relapsed')
      AND i.expected_return_date IS NOT NULL
      AND i.expected_return_date < :today
  `, { replacements: { today }, type: 'SELECT' });
    for (const inj of overdueInjuries) {
        const playerName = `${inj.first_name} ${inj.last_name}`.trim();
        const playerNameAr = inj.first_name_ar ? `${inj.first_name_ar} ${inj.last_name_ar || ''}`.trim() : playerName;
        await (0, notification_service_1.notifyByRole)(['Admin', 'Manager'], {
            type: 'injury',
            title: `Overdue recovery: ${playerName} — ${inj.injury_type}`,
            titleAr: `تأخر تعافي: ${playerNameAr} — ${inj.injury_type}`,
            body: `Expected return was ${inj.expected_return_date}. Still ${inj.severity}.`,
            link: '/dashboard/injuries',
            sourceType: 'injury',
            sourceId: inj.id,
            priority: inj.severity === 'Critical' || inj.severity === 'Severe' ? 'critical' : 'high',
        });
        if (inj.agent_id) {
            await (0, notification_service_1.notifyUser)(inj.agent_id, {
                type: 'injury',
                title: `Overdue recovery: ${playerName} — ${inj.injury_type}`,
                titleAr: `تأخر تعافي: ${playerNameAr} — ${inj.injury_type}`,
                link: '/dashboard/injuries',
                sourceType: 'injury',
                sourceId: inj.id,
                priority: 'high',
            });
        }
    }
    return { overdueInjuries: overdueInjuries.length };
}
// ══════════════════════════════════════════════════════════════
// JOB 3: Payment Reminders
// ══════════════════════════════════════════════════════════════
async function checkPaymentDueDates() {
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const dateStr = sevenDaysOut.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const upcoming = await database_1.sequelize.query(`
    SELECT pm.id, pm.amount, pm.currency, pm.due_date, pm.payment_type,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.status = 'Expected'
      AND pm.due_date = :dueDate
  `, { replacements: { dueDate: dateStr }, type: 'SELECT' });
    for (const pm of upcoming) {
        const playerName = `${pm.first_name} ${pm.last_name}`.trim();
        const amount = `${Number(pm.amount).toLocaleString()} ${pm.currency}`;
        await (0, notification_service_1.notifyByRole)(['Admin', 'Manager'], {
            type: 'payment',
            title: `Payment due in 7 days: ${amount} — ${playerName}`,
            titleAr: `دفعة مستحقة خلال 7 أيام: ${amount} — ${playerName}`,
            body: `${pm.payment_type} payment of ${amount} due ${pm.due_date}`,
            link: '/dashboard/finance',
            sourceType: 'payment',
            sourceId: pm.id,
            priority: 'normal',
        });
    }
    const overdue = await database_1.sequelize.query(`
    SELECT pm.id, pm.amount, pm.currency, pm.due_date,
           p.first_name, p.last_name
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.status = 'Expected'
      AND pm.due_date < :today
  `, { replacements: { today }, type: 'SELECT' });
    for (const pm of overdue) {
        const playerName = `${pm.first_name} ${pm.last_name}`.trim();
        const amount = `${Number(pm.amount).toLocaleString()} ${pm.currency}`;
        await (0, notification_service_1.notifyByRole)(['Admin', 'Manager'], {
            type: 'payment',
            title: `OVERDUE payment: ${amount} — ${playerName}`,
            titleAr: `دفعة متأخرة: ${amount} — ${playerName}`,
            link: '/dashboard/finance',
            sourceType: 'payment',
            sourceId: pm.id,
            priority: 'high',
        });
    }
    return { upcoming: upcoming.length, overdue: overdue.length };
}
// ══════════════════════════════════════════════════════════════
// JOB 4: Document Expiry Alerts
// ══════════════════════════════════════════════════════════════
async function checkDocumentExpiry() {
    const thresholds = [
        { days: 7, priority: 'high' },
        { days: 30, priority: 'normal' },
    ];
    let total = 0;
    for (const t of thresholds) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + t.days);
        const dateStr = targetDate.toISOString().split('T')[0];
        const docs = await database_1.sequelize.query(`
      SELECT d.id, d.name, d.expiry_date,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
      FROM documents d
      LEFT JOIN players p ON p.id = d.player_id
      WHERE d.expiry_date = :targetDate
    `, { replacements: { targetDate: dateStr }, type: 'SELECT' });
        for (const doc of docs) {
            const playerName = doc.first_name ? `${doc.first_name} ${doc.last_name}`.trim() : '';
            const context = playerName ? ` (${playerName})` : '';
            await (0, notification_service_1.notifyByRole)(['Admin', 'Manager'], {
                type: 'document',
                title: `Document expiring in ${t.days} days: ${doc.name}${context}`,
                titleAr: `مستند ينتهي خلال ${t.days} يوم: ${doc.name}${context}`,
                link: '/dashboard/documents',
                sourceType: 'document',
                sourceId: doc.id,
                priority: t.priority,
            });
            total++;
        }
    }
    return { documentsExpiring: total };
}
// ══════════════════════════════════════════════════════════════
// JOB 5: Upcoming Match Prep
// ══════════════════════════════════════════════════════════════
async function checkUpcomingMatches() {
    const twoDaysOut = new Date();
    twoDaysOut.setDate(twoDaysOut.getDate() + 2);
    const dateStr = twoDaysOut.toISOString().split('T')[0];
    const matches = await database_1.sequelize.query(`
    SELECT m.id, m.competition, m.match_date,
           hc.name as home_team, hc.name_ar as home_team_ar,
           ac.name as away_team, ac.name_ar as away_team_ar
    FROM matches m
    LEFT JOIN clubs hc ON hc.id = m.home_club_id
    LEFT JOIN clubs ac ON ac.id = m.away_club_id
    WHERE m.status = 'Scheduled'
      AND m.match_date::date = :matchDate
  `, { replacements: { matchDate: dateStr }, type: 'SELECT' });
    for (const m of matches) {
        await (0, notification_service_1.notifyByRole)(['Admin', 'Manager', 'Analyst', 'Scout'], {
            type: 'match',
            title: `Match in 2 days: ${m.home_team} vs ${m.away_team}`,
            titleAr: `مباراة بعد يومين: ${m.home_team_ar || m.home_team} ضد ${m.away_team_ar || m.away_team}`,
            body: `${m.competition || 'Match'} on ${m.match_date}`,
            link: `/dashboard/matches/${m.id}`,
            sourceType: 'match',
            sourceId: m.id,
            priority: 'normal',
        });
    }
    return { upcomingMatches: matches.length };
}
// ══════════════════════════════════════════════════════════════
// JOB 6: Cleanup
// ══════════════════════════════════════════════════════════════
async function cleanup() {
    const deleted = await (0, notification_service_1.cleanupOldNotifications)(90);
    return { deletedNotifications: deleted };
}
// ══════════════════════════════════════════════════════════════
// REGISTER ALL JOBS
// ══════════════════════════════════════════════════════════════
registerJob('upcoming-matches', checkUpcomingMatches);
registerJob('contract-expiry', checkContractExpiry);
registerJob('injury-followups', checkInjuryFollowups);
registerJob('payment-reminders', checkPaymentDueDates);
registerJob('document-expiry', checkDocumentExpiry);
registerJob('cleanup', cleanup);
// ══════════════════════════════════════════════════════════════
// EXPORTS — for manual testing via cron.routes.ts
// ══════════════════════════════════════════════════════════════
function getJobNames() {
    return Object.keys(jobs);
}
async function runJob(name) {
    const fn = jobs[name];
    if (!fn)
        return null;
    const start = Date.now();
    try {
        logger_1.logger.info(`[CRON-TEST] Running: ${name}`);
        const result = await fn();
        const duration = Date.now() - start;
        logger_1.logger.info(`[CRON-TEST] Completed: ${name} (${duration}ms)`);
        return { job: name, duration, result };
    }
    catch (err) {
        logger_1.logger.error(`[CRON-TEST] Failed: ${name}`, err);
        return { job: name, duration: Date.now() - start, result: { error: err.message } };
    }
}
async function runAllJobs() {
    const results = [];
    for (const name of Object.keys(jobs)) {
        results.push(await runJob(name));
    }
    return results;
}
// ══════════════════════════════════════════════════════════════
// SCHEDULER — call startCronJobs() once in index.ts
// ══════════════════════════════════════════════════════════════
function startCronJobs() {
    logger_1.logger.info('[CRON] Initializing cron scheduler...');
    node_cron_1.default.schedule('0 7 * * *', safeJob('upcoming-matches')); // 7:00 AM
    node_cron_1.default.schedule('0 8 * * *', safeJob('contract-expiry')); // 8:00 AM
    node_cron_1.default.schedule('30 8 * * *', safeJob('injury-followups')); // 8:30 AM
    node_cron_1.default.schedule('0 9 * * *', safeJob('payment-reminders')); // 9:00 AM
    node_cron_1.default.schedule('30 9 * * *', safeJob('document-expiry')); // 9:30 AM
    node_cron_1.default.schedule('0 3 * * *', safeJob('cleanup')); // 3:00 AM
    logger_1.logger.info('[CRON] 6 jobs scheduled ✓');
}
//# sourceMappingURL=scheduler.js.map