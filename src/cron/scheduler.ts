// ═══════════════════════════════════════════════════════════════
// src/cron/scheduler.ts
// ═══════════════════════════════════════════════════════════════

import cron from "node-cron";
import { sequelize } from "../config/database";
import { logger } from "../config/logger";
import {
  notifyByRole,
  notifyUser,
  cleanupOldNotifications,
} from "../modules/notifications/notification.service";
import { generatePreMatchTasks } from "../modules/matches/matchAutoTasks";
import {
  checkPerformanceTrends,
  checkFatigueRisk,
  checkBreakoutPlayers,
  checkMinutesDrought,
  checkConsecutiveLowRatings,
} from "./engines/performance.engine";
import {
  checkInjuryRecurrence,
  checkReturnToPlay,
  calculateInjuryRisk,
  checkSurgeryMilestones,
} from "./engines/injury.engine";
import {
  checkContractRenewalWindow,
  checkContractValueMismatch,
  checkLoanReturns,
  checkStaleDrafts,
  checkCommissionsDue,
} from "./engines/contract.engine";
import {
  checkInvoiceAging,
  checkRevenueAnomalies,
  checkExpenseBudget,
  checkPlayerROI,
  checkValuationStaleness,
} from "./engines/financial.engine";
import {
  runGateAutoVerification,
  checkStaleGates,
  checkChecklistFollowups,
  checkGateProgressionNudge,
  checkClearanceFollowups,
} from "./engines/gate.engine";
import {
  checkWatchlistStaleness,
  checkScreeningIncomplete,
  checkProspectUnrated,
  checkDeferredDecisions,
  checkApprovedNotActioned,
} from "./engines/scouting.engine";
import {
  checkEnrollmentStaleness,
  checkWorkoutAdherence,
  checkMetricTargetDeadlines,
  checkDietAdherence,
  checkNoTrainingPlan,
} from "./engines/training.engine";
import {
  detectOrphanRecords,
  checkPlayerDataCompleteness,
  escalateStaleTasks,
  checkRiskRadarConsistency,
  detectDuplicateRecords,
} from "./engines/systemhealth.engine";

// ── Job registry ──

const jobs: Record<string, () => Promise<any>> = {};

function registerJob(name: string, fn: () => Promise<any>) {
  jobs[name] = fn;
}

// ── Safe wrapper for scheduled execution ──

function safeJob(name: string) {
  return async () => {
    try {
      logger.info(`[CRON] Starting: ${name}`);
      const start = Date.now();
      await jobs[name]();
      logger.info(`[CRON] Completed: ${name} (${Date.now() - start}ms)`);
    } catch (err) {
      logger.error(`[CRON] Failed: ${name}`, err);
    }
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Contract Expiry Alerts
// ══════════════════════════════════════════════════════════════

async function checkContractExpiry() {
  const thresholds = [
    {
      days: 30,
      priority: "high" as const,
      label: "30 days",
      labelAr: "30 يوم",
    },
    {
      days: 60,
      priority: "normal" as const,
      label: "60 days",
      labelAr: "60 يوم",
    },
    { days: 90, priority: "low" as const, label: "90 days", labelAr: "90 يوم" },
  ];

  let notified = 0;

  for (const t of thresholds) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + t.days);
    const dateStr = targetDate.toISOString().split("T")[0];

    const contracts: any[] = await sequelize.query(
      `
      SELECT c.id, c.end_date, c.status,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
             cl.name as club_name, cl.name_ar as club_name_ar
      FROM contracts c
      JOIN players p ON p.id = c.player_id
      LEFT JOIN clubs cl ON cl.id = c.club_id
      WHERE c.status = 'Active'
        AND c.end_date = :targetDate
        AND c.expiry_alert_sent = false
    `,
      { replacements: { targetDate: dateStr }, type: "SELECT" as any },
    );

    for (const c of contracts) {
      const playerName = `${c.first_name} ${c.last_name}`.trim();
      const playerNameAr = c.first_name_ar
        ? `${c.first_name_ar} ${c.last_name_ar || ""}`.trim()
        : playerName;

      await notifyByRole(["Admin", "Manager", "Legal"], {
        type: "contract",
        title: `Contract expiring in ${t.label}: ${playerName}`,
        titleAr: `عقد ينتهي خلال ${t.labelAr}: ${playerNameAr}`,
        body: `${playerName}'s contract with ${c.club_name || "Unknown"} expires on ${c.end_date}`,
        bodyAr: `عقد ${playerNameAr} مع ${c.club_name_ar || c.club_name || "غير معروف"} ينتهي في ${c.end_date}`,
        link: `/dashboard/contracts/${c.id}`,
        sourceType: "contract",
        sourceId: c.id,
        priority: t.priority,
      });

      // Mark as alerted to prevent duplicate notifications
      await sequelize.query(
        `UPDATE contracts SET expiry_alert_sent = true WHERE id = :contractId`,
        { replacements: { contractId: c.id } },
      );
      notified++;
    }
  }

  return { contractsChecked: notified };
}

// ══════════════════════════════════════════════════════════════
// JOB 1b: Contract Status Transitions (Active → Expiring Soon → Expired)
// ══════════════════════════════════════════════════════════════

async function updateContractStatuses() {
  const today = new Date().toISOString().split("T")[0];

  // 1. Expired: contracts past their end date that are still Active or Expiring Soon
  const [, expiredCount] = await sequelize.query(
    `UPDATE contracts
     SET status = 'Expired', updated_at = NOW()
     WHERE status IN ('Active', 'Expiring Soon')
       AND end_date < :today`,
    { replacements: { today } },
  );

  // 2. Expiring Soon: active contracts within 30 days of end date
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const thirtyStr = thirtyDaysOut.toISOString().split("T")[0];

  const [, expiringSoonCount] = await sequelize.query(
    `UPDATE contracts
     SET status = 'Expiring Soon', updated_at = NOW()
     WHERE status = 'Active'
       AND end_date >= :today
       AND end_date <= :threshold`,
    { replacements: { today, threshold: thirtyStr } },
  );

  return {
    expired: (expiredCount as any)?.rowCount ?? expiredCount ?? 0,
    expiringSoon:
      (expiringSoonCount as any)?.rowCount ?? expiringSoonCount ?? 0,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Injury Follow-up Reminders
// ══════════════════════════════════════════════════════════════

async function checkInjuryFollowups() {
  const today = new Date().toISOString().split("T")[0];

  const overdueInjuries: any[] = await sequelize.query(
    `
    SELECT i.id, i.injury_type, i.expected_return_date, i.severity,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.agent_id
    FROM injuries i
    JOIN players p ON p.id = i.player_id
    WHERE i.status IN ('UnderTreatment', 'Relapsed')
      AND i.expected_return_date IS NOT NULL
      AND i.expected_return_date < :today
  `,
    { replacements: { today }, type: "SELECT" as any },
  );

  for (const inj of overdueInjuries) {
    const playerName = `${inj.first_name} ${inj.last_name}`.trim();
    const playerNameAr = inj.first_name_ar
      ? `${inj.first_name_ar} ${inj.last_name_ar || ""}`.trim()
      : playerName;

    await notifyByRole(["Admin", "Manager", "Coach"], {
      type: "injury",
      title: `Overdue recovery: ${playerName} — ${inj.injury_type}`,
      titleAr: `تأخر تعافي: ${playerNameAr} — ${inj.injury_type}`,
      body: `Expected return was ${inj.expected_return_date}. Still ${inj.severity}.`,
      link: "/dashboard/injuries",
      sourceType: "injury",
      sourceId: inj.id,
      priority:
        inj.severity === "Critical" || inj.severity === "Severe"
          ? "critical"
          : "high",
    });

    if (inj.agent_id) {
      await notifyUser(inj.agent_id, {
        type: "injury",
        title: `Overdue recovery: ${playerName} — ${inj.injury_type}`,
        titleAr: `تأخر تعافي: ${playerNameAr} — ${inj.injury_type}`,
        link: "/dashboard/injuries",
        sourceType: "injury",
        sourceId: inj.id,
        priority: "high",
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
  const dateStr = sevenDaysOut.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const upcoming: any[] = await sequelize.query(
    `
    SELECT pm.id, pm.amount, pm.currency, pm.due_date, pm.payment_type,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.status = 'Expected'
      AND pm.due_date = :dueDate
  `,
    { replacements: { dueDate: dateStr }, type: "SELECT" as any },
  );

  for (const pm of upcoming) {
    const playerName = `${pm.first_name} ${pm.last_name}`.trim();
    const amount = `${Number(pm.amount).toLocaleString()} ${pm.currency}`;

    await notifyByRole(["Admin", "Manager", "Finance"], {
      type: "payment",
      title: `Payment due in 7 days: ${amount} — ${playerName}`,
      titleAr: `دفعة مستحقة خلال 7 أيام: ${amount} — ${playerName}`,
      body: `${pm.payment_type} payment of ${amount} due ${pm.due_date}`,
      link: "/dashboard/finance",
      sourceType: "payment",
      sourceId: pm.id,
      priority: "normal",
    });
  }

  const overdue: any[] = await sequelize.query(
    `
    SELECT pm.id, pm.amount, pm.currency, pm.due_date,
           p.first_name, p.last_name
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.status = 'Expected'
      AND pm.due_date < :today
  `,
    { replacements: { today }, type: "SELECT" as any },
  );

  for (const pm of overdue) {
    const playerName = `${pm.first_name} ${pm.last_name}`.trim();
    const amount = `${Number(pm.amount).toLocaleString()} ${pm.currency}`;

    await notifyByRole(["Admin", "Manager", "Finance"], {
      type: "payment",
      title: `OVERDUE payment: ${amount} — ${playerName}`,
      titleAr: `دفعة متأخرة: ${amount} — ${playerName}`,
      link: "/dashboard/finance",
      sourceType: "payment",
      sourceId: pm.id,
      priority: "high",
    });
  }

  return { upcoming: upcoming.length, overdue: overdue.length };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Document Expiry Alerts
// ══════════════════════════════════════════════════════════════

async function checkDocumentExpiry() {
  const thresholds = [
    { days: 7, priority: "high" as const },
    { days: 30, priority: "normal" as const },
  ];

  let total = 0;

  for (const t of thresholds) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + t.days);
    const dateStr = targetDate.toISOString().split("T")[0];

    const docs: any[] = await sequelize.query(
      `
      SELECT d.id, d.name, d.expiry_date,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
      FROM documents d
      LEFT JOIN players p ON p.id = d.player_id
      WHERE d.expiry_date = :targetDate
    `,
      { replacements: { targetDate: dateStr }, type: "SELECT" as any },
    );

    for (const doc of docs) {
      const playerName = doc.first_name
        ? `${doc.first_name} ${doc.last_name}`.trim()
        : "";
      const context = playerName ? ` (${playerName})` : "";

      await notifyByRole(["Admin", "Manager", "Legal"], {
        type: "document",
        title: `Document expiring in ${t.days} days: ${doc.name}${context}`,
        titleAr: `مستند ينتهي خلال ${t.days} يوم: ${doc.name}${context}`,
        link: "/dashboard/documents",
        sourceType: "document",
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
  // Query matches in the next 1–7 days (covers all possible pre-match rule windows)
  const matches: any[] = await sequelize.query(
    `
    SELECT m.id, m.competition, m.match_date,
           hc.name as home_team, hc.name_ar as home_team_ar,
           ac.name as away_team, ac.name_ar as away_team_ar
    FROM matches m
    LEFT JOIN clubs hc ON hc.id = m.home_club_id
    LEFT JOIN clubs ac ON ac.id = m.away_club_id
    WHERE m.status IN ('upcoming', 'Scheduled')
      AND m.match_date::date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7
    ORDER BY m.match_date ASC
  `,
    { type: "SELECT" as any },
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalPreMatchTasks = 0;

  for (const m of matches) {
    const matchDate = new Date(m.match_date);
    matchDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.round(
      (matchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Generate pre-match auto-tasks based on days remaining
    try {
      const result = await generatePreMatchTasks(m.id, daysUntil);
      totalPreMatchTasks += result.created;
    } catch (err: any) {
      logger.error(
        `[Cron] Pre-match tasks failed for match ${m.id}: ${err.message}`,
      );
    }

    // Send notification for matches 2 days out (existing behavior)
    if (daysUntil === 2) {
      await notifyByRole(
        ["Admin", "Manager", "Analyst", "Scout", "Coach", "Media"],
        {
          type: "match",
          title: `Match in 2 days: ${m.home_team} vs ${m.away_team}`,
          titleAr: `مباراة بعد يومين: ${m.home_team_ar || m.home_team} ضد ${m.away_team_ar || m.away_team}`,
          body: `${m.competition || "Match"} on ${m.match_date}`,
          link: `/dashboard/matches/${m.id}`,
          sourceType: "match",
          sourceId: m.id,
          priority: "normal",
        },
      );
    }
  }

  return {
    upcomingMatches: matches.length,
    preMatchTasksCreated: totalPreMatchTasks,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 6: Cleanup
// ══════════════════════════════════════════════════════════════

async function cleanup() {
  const deleted = await cleanupOldNotifications(90);
  return { deletedNotifications: deleted };
}

// ══════════════════════════════════════════════════════════════
// REGISTER ALL JOBS
// ══════════════════════════════════════════════════════════════

registerJob("upcoming-matches", checkUpcomingMatches);
registerJob("contract-status", updateContractStatuses);
registerJob("contract-expiry", checkContractExpiry);
registerJob("injury-followups", checkInjuryFollowups);
registerJob("payment-reminders", checkPaymentDueDates);
registerJob("document-expiry", checkDocumentExpiry);
registerJob("cleanup", cleanup);

// ── Performance Trend Engine ──
registerJob("performance-trends", checkPerformanceTrends);
registerJob("fatigue-risk", checkFatigueRisk);
registerJob("breakout-players", checkBreakoutPlayers);
registerJob("minutes-drought", checkMinutesDrought);
registerJob("consecutive-low-ratings", checkConsecutiveLowRatings);

// ── Injury Intelligence Engine ──
registerJob("injury-recurrence", checkInjuryRecurrence);
registerJob("return-to-play", checkReturnToPlay);
registerJob("injury-risk-scoring", calculateInjuryRisk);
registerJob("surgery-milestones", checkSurgeryMilestones);

// ── Contract Lifecycle Engine ──
registerJob("contract-renewal-window", checkContractRenewalWindow);
registerJob("contract-value-mismatch", checkContractValueMismatch);
registerJob("loan-return-tracker", checkLoanReturns);
registerJob("draft-contract-stale", checkStaleDrafts);
registerJob("commission-due-calculator", checkCommissionsDue);

// ── Financial Intelligence Engine ──
registerJob("invoice-aging-tracker", checkInvoiceAging);
registerJob("revenue-anomaly-detector", checkRevenueAnomalies);
registerJob("expense-budget-monitor", checkExpenseBudget);
registerJob("player-roi-calculator", checkPlayerROI);
registerJob("valuation-staleness-check", checkValuationStaleness);

// ── Gate & Onboarding Engine ──
registerJob("gate-auto-verify", runGateAutoVerification);
registerJob("gate-stale-detector", checkStaleGates);
registerJob("checklist-follow-up", checkChecklistFollowups);
registerJob("gate-progression-nudge", checkGateProgressionNudge);
registerJob("clearance-follow-up", checkClearanceFollowups);

// ── Scouting Pipeline Engine ──
registerJob("watchlist-staleness", checkWatchlistStaleness);
registerJob("screening-incomplete", checkScreeningIncomplete);
registerJob("prospect-unrated", checkProspectUnrated);
registerJob("deferred-decision-followup", checkDeferredDecisions);
registerJob("approved-not-actioned", checkApprovedNotActioned);

// ── Training & Development Engine ──
registerJob("training-enrollment-stale", checkEnrollmentStaleness);
registerJob("workout-adherence-check", checkWorkoutAdherence);
registerJob("body-metric-target-deadline", checkMetricTargetDeadlines);
registerJob("diet-adherence-monitor", checkDietAdherence);
registerJob("training-no-plan", checkNoTrainingPlan);

// ── System Health & Data Quality Engine ──
registerJob("orphan-record-detector", detectOrphanRecords);
registerJob("player-data-completeness", checkPlayerDataCompleteness);
registerJob("stale-task-escalator", escalateStaleTasks);
registerJob("risk-radar-consistency", checkRiskRadarConsistency);
registerJob("duplicate-record-detector", detectDuplicateRecords);

// ══════════════════════════════════════════════════════════════
// EXPORTS — for manual testing via cron.routes.ts
// ══════════════════════════════════════════════════════════════

export function getJobNames(): string[] {
  return Object.keys(jobs);
}

export async function runJob(
  name: string,
): Promise<{ job: string; duration: number; result?: any } | null> {
  const fn = jobs[name];
  if (!fn) return null;

  const start = Date.now();
  try {
    logger.info(`[CRON-TEST] Running: ${name}`);
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`[CRON-TEST] Completed: ${name} (${duration}ms)`);
    return { job: name, duration, result };
  } catch (err: any) {
    logger.error(`[CRON-TEST] Failed: ${name}`, err);
    return {
      job: name,
      duration: Date.now() - start,
      result: { error: err.message },
    };
  }
}

export async function runAllJobs() {
  const results = [];
  for (const name of Object.keys(jobs)) {
    results.push(await runJob(name));
  }
  return results;
}

// ══════════════════════════════════════════════════════════════
// SCHEDULER — call startCronJobs() once in index.ts
// ══════════════════════════════════════════════════════════════

export function startCronJobs() {
  logger.info("[CRON] Initializing cron scheduler...");

  cron.schedule("0 7 * * *", safeJob("upcoming-matches")); // 7:00 AM
  cron.schedule("0 7,19 * * *", safeJob("contract-status")); // 7:00 AM & 7:00 PM
  cron.schedule("0 8 * * *", safeJob("contract-expiry")); // 8:00 AM
  cron.schedule("30 8 * * *", safeJob("injury-followups")); // 8:30 AM
  cron.schedule("0 9 * * *", safeJob("payment-reminders")); // 9:00 AM
  cron.schedule("30 9 * * *", safeJob("document-expiry")); // 9:30 AM
  cron.schedule("0 3 * * *", safeJob("cleanup")); // 3:00 AM

  // ── Performance Trend Engine ──
  cron.schedule("0 10 * * 1", safeJob("performance-trends")); // Monday 10:00 AM
  cron.schedule("15 7 * * *", safeJob("fatigue-risk")); // Daily 7:15 AM
  cron.schedule("30 10 * * 1", safeJob("breakout-players")); // Monday 10:30 AM
  cron.schedule("0 10 * * 1", safeJob("minutes-drought")); // Monday 10:00 AM
  cron.schedule("0 10 * * *", safeJob("consecutive-low-ratings")); // Daily 10:00 AM

  // ── Injury Intelligence Engine ──
  cron.schedule("0 11 * * *", safeJob("injury-recurrence")); // Daily 11:00 AM
  cron.schedule("30 7 * * *", safeJob("return-to-play")); // Daily 7:30 AM
  cron.schedule("0 6 * * 1", safeJob("injury-risk-scoring")); // Monday 6:00 AM
  cron.schedule("0 8 * * *", safeJob("surgery-milestones")); // Daily 8:00 AM

  // ── Contract Lifecycle Engine ──
  cron.schedule("0 9 * * 2", safeJob("contract-renewal-window")); // Tuesday 9:00 AM
  cron.schedule("30 9 * * 2", safeJob("contract-value-mismatch")); // Tuesday 9:30 AM
  cron.schedule("30 8 * * *", safeJob("loan-return-tracker")); // Daily 8:30 AM
  cron.schedule("30 11 * * *", safeJob("draft-contract-stale")); // Daily 11:30 AM
  cron.schedule("0 9 * * 3", safeJob("commission-due-calculator")); // Wednesday 9:00 AM

  // ── Financial Intelligence Engine ──
  cron.schedule("0 11 * * *", safeJob("invoice-aging-tracker")); // Daily 11:00 AM
  cron.schedule("0 10 * * 4", safeJob("revenue-anomaly-detector")); // Thursday 10:00 AM
  cron.schedule("0 9 1 * *", safeJob("expense-budget-monitor")); // 1st of month 9:00 AM
  cron.schedule("30 10 * * 4", safeJob("player-roi-calculator")); // Thursday 10:30 AM
  cron.schedule("0 11 * * 1", safeJob("valuation-staleness-check")); // Monday 11:00 AM

  // ── Gate & Onboarding Engine ──
  cron.schedule("30 6 * * *", safeJob("gate-auto-verify")); // Daily 6:30 AM
  cron.schedule("30 10 * * *", safeJob("gate-stale-detector")); // Daily 10:30 AM
  cron.schedule("30 9 * * *", safeJob("checklist-follow-up")); // Daily 9:30 AM
  cron.schedule("0 10 * * 5", safeJob("gate-progression-nudge")); // Friday 10:00 AM
  cron.schedule("0 10 * * *", safeJob("clearance-follow-up")); // Daily 10:00 AM

  // ── Scouting Pipeline Engine ──
  cron.schedule("0 10 * * 3", safeJob("watchlist-staleness")); // Wednesday 10:00 AM
  cron.schedule("30 10 * * 3", safeJob("screening-incomplete")); // Wednesday 10:30 AM
  cron.schedule("30 11 * * 1", safeJob("prospect-unrated")); // Monday 11:30 AM
  cron.schedule("0 11 * * 5", safeJob("deferred-decision-followup")); // Friday 11:00 AM
  cron.schedule("30 11 * * 5", safeJob("approved-not-actioned")); // Friday 11:30 AM

  // ── Training & Development Engine ──
  cron.schedule("15 8 * * *", safeJob("training-enrollment-stale")); // Daily 8:15 AM
  cron.schedule("0 9 * * 6", safeJob("workout-adherence-check")); // Saturday 9:00 AM
  cron.schedule("15 9 * * *", safeJob("body-metric-target-deadline")); // Daily 9:15 AM
  cron.schedule("30 9 * * 6", safeJob("diet-adherence-monitor")); // Saturday 9:30 AM
  cron.schedule("30 8 * * 1", safeJob("training-no-plan")); // Monday 8:30 AM

  // ── System Health & Data Quality Engine ──
  cron.schedule("0 4 * * 0", safeJob("orphan-record-detector")); // Sunday 4:00 AM
  cron.schedule("0 7 * * 1", safeJob("player-data-completeness")); // Monday 7:00 AM
  cron.schedule("45 7 * * *", safeJob("stale-task-escalator")); // Daily 7:45 AM
  cron.schedule("0 5 * * 0", safeJob("risk-radar-consistency")); // Sunday 5:00 AM
  cron.schedule("0 6 * * 0", safeJob("duplicate-record-detector")); // Sunday 6:00 AM

  logger.info("[CRON] 46 jobs scheduled ✓");
}
