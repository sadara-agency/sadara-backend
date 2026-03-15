// ═══════════════════════════════════════════════════════════════
// src/cron/scheduler.ts
// ═══════════════════════════════════════════════════════════════

import cron from "node-cron";
import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import {
  notifyByRole,
  notifyUser,
  cleanupOldNotifications,
} from "@modules/notifications/notification.service";
import {
  generatePreMatchTasks,
  generateMatchLevelPreTasks,
} from "@modules/matches/matchAutoTasks";
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
import { checkOfferDeadlines } from "@modules/offers/offerAutoTasks";
import {
  checkInjuryReturnOverdue,
  checkInjuryTreatmentStale,
} from "@modules/injuries/injuryAutoTasks";
import {
  checkWorkoutAssignmentExpiring,
  checkDietPlanNoAdherence,
  checkMetricTargetAchieved,
  checkTrainingCourseCompleted,
} from "@modules/gym/gymAutoTasks";
import { checkApprovalStepOverdue } from "@modules/approvals/approvalAutoTasks";
import {
  checkDocumentExpiryTasks,
  checkPlayerMissingDocuments,
} from "@modules/documents/documentAutoTasks";
import { checkReferralOverdue } from "@modules/referrals/referralAutoTasks";
import {
  checkCalendarReminders,
  syncAutoCalendarEvents,
} from "@modules/calendar/calendarAutoTasks";
import { getAppSetting, setAppSetting } from "@shared/utils/appSettings";

// ── Disabled-state management ──

interface DisabledJobEntry {
  disabledBy?: string;
  disabledAt?: string;
}

const DISABLED_SETTINGS_KEY = "cron_disabled_jobs";

/** In-memory fallback when Redis is unavailable */
const disabledJobsCache = new Set<string>();

/** Persistent disabled-jobs map (mirrors app_settings) */
let disabledJobsMap: Record<string, DisabledJobEntry> = {};

async function isJobDisabled(name: string): Promise<boolean> {
  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      try {
        const val = await client.get(`cron:disabled:${name}`);
        return val === "1";
      } catch {
        // Redis error — fall through to in-memory
      }
    }
  }
  return disabledJobsCache.has(name);
}

export async function setJobDisabled(
  name: string,
  disabled: boolean,
  actor?: { userId: string; userName: string },
): Promise<void> {
  // 1. Update Redis
  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      try {
        if (disabled) {
          await client.set(`cron:disabled:${name}`, "1");
        } else {
          await client.del(`cron:disabled:${name}`);
        }
      } catch (err) {
        logger.warn(
          `[CRON] Failed to update Redis disabled state for ${name}`,
          err,
        );
      }
    }
  }

  // 2. Update in-memory cache
  if (disabled) {
    disabledJobsCache.add(name);
  } else {
    disabledJobsCache.delete(name);
  }

  // 3. Update persistent map
  if (disabled) {
    disabledJobsMap[name] = {
      disabledBy: actor?.userName || "system",
      disabledAt: new Date().toISOString(),
    };
  } else {
    delete disabledJobsMap[name];
  }

  // 4. Persist to app_settings
  try {
    await setAppSetting(DISABLED_SETTINGS_KEY, disabledJobsMap);
  } catch (err) {
    logger.warn("[CRON] Failed to persist disabled jobs to app_settings", err);
  }

  // 5. Release any held lock when disabling
  if (disabled) {
    await releaseLock(name);
  }
}

export async function setAllJobsDisabled(
  disabled: boolean,
  actor?: { userId: string; userName: string },
): Promise<number> {
  const names = Object.keys(jobs);

  // Batch update: build full map first, then single DB write
  if (disabled) {
    const entry: DisabledJobEntry = {
      disabledBy: actor?.userName || "system",
      disabledAt: new Date().toISOString(),
    };
    disabledJobsMap = {};
    for (const name of names) {
      disabledJobsMap[name] = entry;
      disabledJobsCache.add(name);
    }
  } else {
    disabledJobsMap = {};
    disabledJobsCache.clear();
  }

  // Single DB write
  try {
    await setAppSetting(DISABLED_SETTINGS_KEY, disabledJobsMap);
  } catch (err) {
    logger.warn("[CRON] Failed to persist bulk disabled state", err);
  }

  // Update Redis for all jobs
  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      try {
        for (const name of names) {
          if (disabled) {
            await client.set(`cron:disabled:${name}`, "1");
          } else {
            await client.del(`cron:disabled:${name}`);
          }
        }
      } catch (err) {
        logger.warn("[CRON] Failed to bulk update Redis disabled state", err);
      }
    }
  }

  // Release locks if disabling
  if (disabled) {
    for (const name of names) {
      await releaseLock(name);
    }
  }

  return names.length;
}

export async function getDisabledJobs(): Promise<
  Record<string, DisabledJobEntry>
> {
  return { ...disabledJobsMap };
}

export async function syncDisabledJobsToRedis(): Promise<void> {
  try {
    const persisted = await getAppSetting(DISABLED_SETTINGS_KEY);
    if (persisted && typeof persisted === "object") {
      disabledJobsMap = persisted;
      disabledJobsCache.clear();

      for (const name of Object.keys(persisted)) {
        disabledJobsCache.add(name);
      }

      // Populate Redis
      if (isRedisConnected()) {
        const client = getRedisClient();
        if (client) {
          for (const name of Object.keys(persisted)) {
            await client.set(`cron:disabled:${name}`, "1");
          }
        }
      }

      logger.info(
        `[CRON] Synced ${Object.keys(persisted).length} disabled jobs from DB`,
      );
    }
  } catch (err) {
    logger.warn("[CRON] Failed to sync disabled jobs from app_settings", err);
  }
}

// ── Schedule metadata ──

const jobSchedules: Record<string, string> = {};

export function getJobSchedules(): Record<string, string> {
  return { ...jobSchedules };
}

// ── Query result interfaces ──

interface ContractExpiryRow {
  id: string;
  end_date: string;
  status: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  club_name: string | null;
  club_name_ar: string | null;
}

interface InjuryFollowupRow {
  id: string;
  injury_type: string;
  expected_return_date: string;
  severity: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  agent_id: string | null;
}

interface PaymentReminderRow {
  id: string;
  amount: string | number;
  currency: string;
  due_date: string;
  payment_type: string;
  first_name: string;
  last_name: string;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
}

interface DocumentExpiryRow {
  id: string;
  name: string;
  expiry_date: string;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
}

interface UpcomingMatchRow {
  id: string;
  competition: string | null;
  match_date: string;
  home_team: string | null;
  home_team_ar: string | null;
  away_team: string | null;
  away_team_ar: string | null;
}

// ── Job registry ──

const jobs: Record<string, () => Promise<any>> = {};

function registerJob(name: string, fn: () => Promise<any>) {
  jobs[name] = fn;
}

// ── Distributed lock via Redis SET NX EX ──

import { getRedisClient, isRedisConnected } from "@config/redis";

async function acquireLock(name: string, ttlSeconds: number): Promise<boolean> {
  if (!isRedisConnected()) return true; // Single instance — no lock needed
  const client = getRedisClient();
  if (!client) return true;
  const key = `cron:lock:${name}`;
  const result = await client.set(key, Date.now().toString(), {
    NX: true,
    EX: ttlSeconds,
  });
  return result === "OK";
}

async function releaseLock(name: string): Promise<void> {
  if (!isRedisConnected()) return;
  const client = getRedisClient();
  if (!client) return;
  await client.del(`cron:lock:${name}`).catch(() => {});
}

// ── Safe wrapper with retry + distributed lock ──

const MAX_RETRIES = 2;
const LOCK_TTL_SECONDS = 300; // 5 min — prevents overlapping runs

function safeJob(name: string) {
  return async () => {
    // Check if job is disabled before doing any work
    if (await isJobDisabled(name)) {
      logger.info(`[CRON] Skipped (disabled): ${name}`);
      return;
    }

    // Acquire distributed lock (prevents concurrent execution across instances)
    if (!(await acquireLock(name, LOCK_TTL_SECONDS))) {
      logger.info(`[CRON] Skipped (locked): ${name}`);
      return;
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          logger.info(
            `[CRON] Retry ${attempt}/${MAX_RETRIES}: ${name} (after ${delay}ms)`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
        logger.info(`[CRON] Starting: ${name}`);
        const start = Date.now();
        await jobs[name]();
        logger.info(`[CRON] Completed: ${name} (${Date.now() - start}ms)`);
        await releaseLock(name);
        return; // Success
      } catch (err) {
        lastErr = err;
        logger.warn(`[CRON] Attempt ${attempt + 1} failed: ${name}`, err);
      }
    }

    // All retries exhausted
    logger.error(
      `[CRON] Failed after ${MAX_RETRIES + 1} attempts: ${name}`,
      lastErr,
    );
    await releaseLock(name);
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

    const contracts = await sequelize.query<ContractExpiryRow>(
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
      { replacements: { targetDate: dateStr }, type: QueryTypes.SELECT },
    );

    if (contracts.length === 0) continue;

    // Build all notification promises (parallelized, no N+1)
    const notificationPromises = contracts.map((c) => {
      const playerName = `${c.first_name} ${c.last_name}`.trim();
      const playerNameAr = c.first_name_ar
        ? `${c.first_name_ar} ${c.last_name_ar || ""}`.trim()
        : playerName;

      return notifyByRole(["Admin", "Manager", "Legal"], {
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
    });

    await Promise.all(notificationPromises);

    // Batch UPDATE — single query instead of N individual updates
    const contractIds = contracts.map((c) => c.id);
    await sequelize.query(
      `UPDATE contracts SET expiry_alert_sent = true WHERE id IN (:contractIds)`,
      { replacements: { contractIds } },
    );
    notified += contracts.length;
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
    expired:
      (expiredCount as { rowCount?: number })?.rowCount ?? expiredCount ?? 0,
    expiringSoon:
      (expiringSoonCount as { rowCount?: number })?.rowCount ??
      expiringSoonCount ??
      0,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Injury Follow-up Reminders
// ══════════════════════════════════════════════════════════════

async function checkInjuryFollowups() {
  const today = new Date().toISOString().split("T")[0];

  const overdueInjuries = await sequelize.query<InjuryFollowupRow>(
    `
    SELECT i.id, i.injury_type, i.expected_return_date, i.severity,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.agent_id
    FROM injuries i
    JOIN players p ON p.id = i.player_id
    WHERE i.status IN ('UnderTreatment', 'Relapsed')
      AND i.expected_return_date IS NOT NULL
      AND i.expected_return_date < :today
  `,
    { replacements: { today }, type: QueryTypes.SELECT },
  );

  // Build all notification promises (parallelized, no N+1)
  const injuryNotifications = overdueInjuries.flatMap((inj) => {
    const playerName = `${inj.first_name} ${inj.last_name}`.trim();
    const playerNameAr = inj.first_name_ar
      ? `${inj.first_name_ar} ${inj.last_name_ar || ""}`.trim()
      : playerName;

    const promises: Promise<any>[] = [
      notifyByRole(["Admin", "Manager", "Coach"], {
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
      }),
    ];

    if (inj.agent_id) {
      promises.push(
        notifyUser(inj.agent_id, {
          type: "injury",
          title: `Overdue recovery: ${playerName} — ${inj.injury_type}`,
          titleAr: `تأخر تعافي: ${playerNameAr} — ${inj.injury_type}`,
          link: "/dashboard/injuries",
          sourceType: "injury",
          sourceId: inj.id,
          priority: "high",
        }),
      );
    }

    return promises;
  });

  await Promise.all(injuryNotifications);

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

  const upcoming = await sequelize.query<PaymentReminderRow>(
    `
    SELECT pm.id, pm.amount, pm.currency, pm.due_date, pm.payment_type,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.status = 'Expected'
      AND pm.due_date = :dueDate
  `,
    { replacements: { dueDate: dateStr }, type: QueryTypes.SELECT },
  );

  // Batch upcoming payment notifications (parallelized, no N+1)
  await Promise.all(
    upcoming.map((pm) => {
      const playerName = `${pm.first_name} ${pm.last_name}`.trim();
      const amount = `${Number(pm.amount).toLocaleString()} ${pm.currency}`;

      return notifyByRole(["Admin", "Manager", "Finance"], {
        type: "payment",
        title: `Payment due in 7 days: ${amount} — ${playerName}`,
        titleAr: `دفعة مستحقة خلال 7 أيام: ${amount} — ${playerName}`,
        body: `${pm.payment_type} payment of ${amount} due ${pm.due_date}`,
        link: "/dashboard/finance",
        sourceType: "payment",
        sourceId: pm.id,
        priority: "normal",
      });
    }),
  );

  const overdue = await sequelize.query<PaymentReminderRow>(
    `
    SELECT pm.id, pm.amount, pm.currency, pm.due_date,
           p.first_name, p.last_name
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.status = 'Expected'
      AND pm.due_date < :today
  `,
    { replacements: { today }, type: QueryTypes.SELECT },
  );

  // Batch overdue payment notifications (parallelized, no N+1)
  await Promise.all(
    overdue.map((pm) => {
      const playerName = `${pm.first_name} ${pm.last_name}`.trim();
      const amount = `${Number(pm.amount).toLocaleString()} ${pm.currency}`;

      return notifyByRole(["Admin", "Manager", "Finance"], {
        type: "payment",
        title: `OVERDUE payment: ${amount} — ${playerName}`,
        titleAr: `دفعة متأخرة: ${amount} — ${playerName}`,
        link: "/dashboard/finance",
        sourceType: "payment",
        sourceId: pm.id,
        priority: "high",
      });
    }),
  );

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

    const docs = await sequelize.query<DocumentExpiryRow>(
      `
      SELECT d.id, d.name, d.expiry_date,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
      FROM documents d
      LEFT JOIN players p ON p.id = d.player_id
      WHERE d.expiry_date = :targetDate
    `,
      { replacements: { targetDate: dateStr }, type: QueryTypes.SELECT },
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
  const matches = await sequelize.query<UpcomingMatchRow>(
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
    { type: QueryTypes.SELECT },
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

    // Generate match-level tasks for Scout/Analyst roles
    try {
      const mlResult = await generateMatchLevelPreTasks(m.id, daysUntil);
      totalPreMatchTasks += mlResult.created;
    } catch (err: any) {
      logger.error(
        `[Cron] Match-level pre-tasks failed for match ${m.id}: ${err.message}`,
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

// ── Offer Pipeline Engine ──
registerJob("offer-deadlines", checkOfferDeadlines);

// ── Injury Auto-Tasks (return overdue + treatment stale) ──
registerJob("injury-return-overdue", checkInjuryReturnOverdue);
registerJob("injury-treatment-stale", checkInjuryTreatmentStale);

// ── Gym / Training Auto-Tasks ──
registerJob("workout-assignment-expiring", checkWorkoutAssignmentExpiring);
registerJob("diet-plan-no-adherence", checkDietPlanNoAdherence);
registerJob("metric-target-achieved", checkMetricTargetAchieved);
registerJob("training-course-completed", checkTrainingCourseCompleted);

// ── Approval Auto-Tasks ──
registerJob("approval-step-overdue", checkApprovalStepOverdue);

// ── Document Auto-Tasks ──
registerJob("document-expiry-tasks", checkDocumentExpiryTasks);
registerJob("player-missing-documents", checkPlayerMissingDocuments);

// ── Referral Auto-Tasks ──
registerJob("referral-overdue", checkReferralOverdue);

// ── Calendar Auto-Tasks ──
registerJob("calendar-reminders", checkCalendarReminders);
registerJob("calendar-auto-sync", syncAutoCalendarEvents);

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

export async function startCronJobs() {
  logger.info("[CRON] Initializing cron scheduler...");

  // Sync disabled state from DB → Redis + in-memory before scheduling
  await syncDisabledJobsToRedis();

  function schedule(expr: string, name: string) {
    jobSchedules[name] = expr;
    cron.schedule(expr, safeJob(name));
  }

  schedule("0 7 * * *", "upcoming-matches"); // 7:00 AM
  schedule("0 7,19 * * *", "contract-status"); // 7:00 AM & 7:00 PM
  schedule("0 8 * * *", "contract-expiry"); // 8:00 AM
  schedule("30 8 * * *", "injury-followups"); // 8:30 AM
  schedule("0 9 * * *", "payment-reminders"); // 9:00 AM
  schedule("30 9 * * *", "document-expiry"); // 9:30 AM
  schedule("0 3 * * *", "cleanup"); // 3:00 AM

  // ── Performance Trend Engine ──
  schedule("0 10 * * 1", "performance-trends"); // Monday 10:00 AM
  schedule("15 7 * * *", "fatigue-risk"); // Daily 7:15 AM
  schedule("30 10 * * 1", "breakout-players"); // Monday 10:30 AM
  schedule("0 10 * * 1", "minutes-drought"); // Monday 10:00 AM
  schedule("0 10 * * *", "consecutive-low-ratings"); // Daily 10:00 AM

  // ── Injury Intelligence Engine ──
  schedule("0 11 * * *", "injury-recurrence"); // Daily 11:00 AM
  schedule("30 7 * * *", "return-to-play"); // Daily 7:30 AM
  schedule("0 6 * * 1", "injury-risk-scoring"); // Monday 6:00 AM
  schedule("0 8 * * *", "surgery-milestones"); // Daily 8:00 AM

  // ── Contract Lifecycle Engine ──
  schedule("0 9 * * 2", "contract-renewal-window"); // Tuesday 9:00 AM
  schedule("30 9 * * 2", "contract-value-mismatch"); // Tuesday 9:30 AM
  schedule("30 8 * * *", "loan-return-tracker"); // Daily 8:30 AM
  schedule("30 11 * * *", "draft-contract-stale"); // Daily 11:30 AM
  schedule("0 9 * * 3", "commission-due-calculator"); // Wednesday 9:00 AM

  // ── Financial Intelligence Engine ──
  schedule("0 11 * * *", "invoice-aging-tracker"); // Daily 11:00 AM
  schedule("0 10 * * 4", "revenue-anomaly-detector"); // Thursday 10:00 AM
  schedule("0 9 1 * *", "expense-budget-monitor"); // 1st of month 9:00 AM
  schedule("30 10 * * 4", "player-roi-calculator"); // Thursday 10:30 AM
  schedule("0 11 * * 1", "valuation-staleness-check"); // Monday 11:00 AM

  // ── Gate & Onboarding Engine ──
  schedule("30 6 * * *", "gate-auto-verify"); // Daily 6:30 AM
  schedule("30 10 * * *", "gate-stale-detector"); // Daily 10:30 AM
  schedule("30 9 * * *", "checklist-follow-up"); // Daily 9:30 AM
  schedule("0 10 * * 5", "gate-progression-nudge"); // Friday 10:00 AM
  schedule("0 10 * * *", "clearance-follow-up"); // Daily 10:00 AM

  // ── Scouting Pipeline Engine ──
  schedule("0 10 * * 3", "watchlist-staleness"); // Wednesday 10:00 AM
  schedule("30 10 * * 3", "screening-incomplete"); // Wednesday 10:30 AM
  schedule("30 11 * * 1", "prospect-unrated"); // Monday 11:30 AM
  schedule("0 11 * * 5", "deferred-decision-followup"); // Friday 11:00 AM
  schedule("30 11 * * 5", "approved-not-actioned"); // Friday 11:30 AM

  // ── Training & Development Engine ──
  schedule("15 8 * * *", "training-enrollment-stale"); // Daily 8:15 AM
  schedule("0 9 * * 6", "workout-adherence-check"); // Saturday 9:00 AM
  schedule("15 9 * * *", "body-metric-target-deadline"); // Daily 9:15 AM
  schedule("30 9 * * 6", "diet-adherence-monitor"); // Saturday 9:30 AM
  schedule("30 8 * * 1", "training-no-plan"); // Monday 8:30 AM

  // ── Offer Pipeline Engine ──
  schedule("0 8 * * *", "offer-deadlines"); // Daily 8:00 AM

  // ── Injury Auto-Tasks ──
  schedule("45 8 * * *", "injury-return-overdue"); // Daily 8:45 AM
  schedule("0 9 * * 1", "injury-treatment-stale"); // Monday 9:00 AM

  // ── Gym / Training Auto-Tasks ──
  schedule("0 8 * * 1", "workout-assignment-expiring"); // Monday 8:00 AM
  schedule("0 10 * * 6", "diet-plan-no-adherence"); // Saturday 10:00 AM
  schedule("0 11 * * 3", "metric-target-achieved"); // Wednesday 11:00 AM
  schedule("30 8 * * *", "training-course-completed"); // Daily 8:30 AM

  // ── Approval Auto-Tasks ──
  schedule("0 9 * * *", "approval-step-overdue"); // Daily 9:00 AM

  // ── Document Auto-Tasks ──
  schedule("0 10 * * *", "document-expiry-tasks"); // Daily 10:00 AM
  schedule("0 7 * * 2", "player-missing-documents"); // Tuesday 7:00 AM

  // ── Referral Auto-Tasks ──
  schedule("30 8 * * *", "referral-overdue"); // Daily 8:30 AM

  // ── Calendar Auto-Tasks ──
  schedule("*/10 * * * *", "calendar-reminders"); // Every 10 minutes
  schedule("0 6 * * *", "calendar-auto-sync"); // Daily 6:00 AM

  // ── System Health & Data Quality Engine ──
  schedule("0 4 * * 0", "orphan-record-detector"); // Sunday 4:00 AM
  schedule("0 7 * * 1", "player-data-completeness"); // Monday 7:00 AM
  schedule("45 7 * * *", "stale-task-escalator"); // Daily 7:45 AM
  schedule("0 5 * * 0", "risk-radar-consistency"); // Sunday 5:00 AM
  schedule("0 6 * * 0", "duplicate-record-detector"); // Sunday 6:00 AM

  logger.info("[CRON] 59 jobs scheduled ✓");
}
