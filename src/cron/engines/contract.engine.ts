// ═══════════════════════════════════════════════════════════════
// Contract Lifecycle Engine
//
// Manages proactive contract intelligence: renewal windows,
// salary-vs-market-value mismatch detection, loan return
// tracking, stale draft cleanup, and commission due alerts.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "../../config/database";
import { logger } from "../../config/logger";
import { Task } from "../../modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "../../modules/notifications/notification.service";

// ── Configurable thresholds (loaded from app_settings) ──

export interface ContractLifecycleConfig {
  enabled: boolean;
  // contract-renewal-window
  renewalWindowDays: number; // days before expiry to open renewal window (default 180)
  renewalUrgentDays: number; // urgent threshold (default 90)
  // contract-value-mismatch
  mismatchThresholdPct: number; // % difference to flag salary vs market value (default 30)
  // loan-return-tracker
  loanReturnAlertDays: number; // days before loan end to alert (default 30)
  // draft-contract-stale
  staleDraftDays: number; // days a Draft contract can sit idle (default 14)
  // commission-due-calculator
  commissionAlertDays: number; // days before expected commission to alert (default 14)
}

const DEFAULT_CONFIG: ContractLifecycleConfig = {
  enabled: true,
  renewalWindowDays: 180,
  renewalUrgentDays: 90,
  mismatchThresholdPct: 30,
  loanReturnAlertDays: 30,
  staleDraftDays: 14,
  commissionAlertDays: 14,
};

let _config: ContractLifecycleConfig = { ...DEFAULT_CONFIG };

export function getContractLifecycleConfig(): ContractLifecycleConfig {
  return { ..._config };
}

/** Load config from app_settings (called once at startup) */
export async function loadContractLifecycleConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'contract_lifecycle_config' LIMIT 1`,
      { type: "SELECT" as any },
    )) as any[];
    if (row?.value) {
      const parsed =
        typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      _config = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Table may not exist yet — use defaults
  }
}

/** Persist config to app_settings */
export async function saveContractLifecycleConfig(
  updates: Partial<ContractLifecycleConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('contract_lifecycle_config', :val)
       ON CONFLICT (key) DO UPDATE SET value = :val`,
      { replacements: { val: JSON.stringify(_config) }, type: "RAW" as any },
    );
  } catch {
    // silently ignore if table missing
  }
}

// ── Helpers ──

function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function createContractTask(opts: {
  playerId: string;
  triggerRuleId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDays: number;
  assignedTo: string | null;
}): Promise<boolean> {
  // Prevent duplicates: same rule + player within last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const existing = await Task.findOne({
    where: sequelize.literal(`
      player_id = '${opts.playerId}'
      AND trigger_rule_id = '${opts.triggerRuleId}'
      AND is_auto_created = true
      AND created_at > '${sevenDaysAgo.toISOString()}'
      AND status NOT IN ('Completed', 'Canceled')
    `),
  });
  if (existing) return false;

  await Task.create({
    title: opts.title,
    titleAr: opts.titleAr,
    description: opts.description,
    type: "Contract",
    priority: opts.priority,
    status: "Open",
    playerId: opts.playerId,
    assignedTo: opts.assignedTo,
    isAutoCreated: true,
    triggerRuleId: opts.triggerRuleId,
    dueDate: dueDate(opts.dueDays),
    notes: opts.descriptionAr,
  } as any);

  // Notify assignee
  if (opts.assignedTo) {
    notifyUser(opts.assignedTo, {
      type: "task",
      title: opts.title,
      titleAr: opts.titleAr,
      body: opts.description,
      bodyAr: opts.descriptionAr,
      link: "/dashboard/tasks",
      sourceType: "task",
      priority: opts.priority === "critical" ? "critical" : "high",
    }).catch((err) =>
      logger.warn("[ContractEngine] notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Contract Renewal Window (weekly — Tuesday 9 AM)
//
// Active contracts expiring within 180 days that have no
// Renewal-type contract in Draft/Review/Signing for the
// same player → task to initiate renewal negotiations.
// ══════════════════════════════════════════════════════════════

export async function checkContractRenewalWindow(): Promise<{
  contractsChecked: number;
  renewalsDue: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { contractsChecked: 0, renewalsDue: 0, tasksCreated: 0 };

  const today = new Date().toISOString().split("T")[0];
  const windowDate = new Date();
  windowDate.setDate(windowDate.getDate() + _config.renewalWindowDays);
  const windowStr = windowDate.toISOString().split("T")[0];

  const urgentDate = new Date();
  urgentDate.setDate(urgentDate.getDate() + _config.renewalUrgentDays);
  const urgentStr = urgentDate.toISOString().split("T")[0];

  const rows: any[] = await sequelize.query(
    `
    SELECT
      c.id AS contract_id,
      c.player_id,
      c.end_date,
      c.contract_type,
      c.status,
      cl.name AS club_name,
      cl.name_ar AS club_name_ar,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      -- Check if a renewal is already in progress
      (
        SELECT COUNT(*)
        FROM contracts r
        WHERE r.player_id = c.player_id
          AND r.contract_type = 'Renewal'
          AND r.status IN ('Draft', 'Review', 'Signing', 'AwaitingPlayer')
      ) AS pending_renewals,
      -- Days until expiry
      (c.end_date::date - CURRENT_DATE) AS days_remaining
    FROM contracts c
    JOIN players p ON p.id = c.player_id
    LEFT JOIN clubs cl ON cl.id = c.club_id
    WHERE c.status IN ('Active', 'Expiring Soon')
      AND c.contract_type NOT IN ('Loan', 'Sponsorship', 'ImageRights', 'MedicalAuth')
      AND c.end_date >= :today
      AND c.end_date <= :windowDate
      AND p.status = 'active'
    ORDER BY c.end_date ASC
    `,
    {
      replacements: { today, windowDate: windowStr },
      type: "SELECT" as any,
    },
  );

  // Filter to those without pending renewals
  const needsRenewal = rows.filter((r) => Number(r.pending_renewals) === 0);
  let tasksCreated = 0;

  for (const row of needsRenewal) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const clubName = row.club_name || "Unknown";
    const clubNameAr = row.club_name_ar || clubName;
    const daysLeft = Number(row.days_remaining);
    const isUrgent = row.end_date <= urgentStr;

    const created = await createContractTask({
      playerId: row.player_id,
      triggerRuleId: "contract_renewal_window",
      title: `Contract renewal needed: ${playerName} (${daysLeft}d remaining)`,
      titleAr: `تجديد عقد مطلوب: ${playerNameAr} (${daysLeft} يوم متبقي)`,
      description:
        `${playerName}'s ${row.contract_type} contract with ${clubName} expires on ${row.end_date} ` +
        `(${daysLeft} days remaining). No renewal has been initiated. ` +
        `Begin renewal negotiations or evaluate alternatives.`,
      descriptionAr:
        `عقد ${row.contract_type} لـ ${playerNameAr} مع ${clubNameAr} ينتهي في ${row.end_date} ` +
        `(${daysLeft} يوم متبقي). لم يبدأ أي تجديد. ` +
        `بدء مفاوضات التجديد أو تقييم البدائل.`,
      priority: isUrgent ? "critical" : "high",
      dueDays: isUrgent ? 3 : 7,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      // Update contract_risk in risk_radars
      await sequelize
        .query(
          `INSERT INTO risk_radars (player_id, contract_risk, overall_risk, assessed_at)
           VALUES (:playerId, :risk, :risk, NOW())
           ON CONFLICT (player_id) DO UPDATE SET
             contract_risk = :risk,
             overall_risk = CASE
               WHEN :risk = 'High' OR risk_radars.performance_risk = 'High' OR risk_radars.injury_risk = 'High' THEN 'High'
               WHEN :risk = 'Medium' OR risk_radars.performance_risk = 'Medium' OR risk_radars.injury_risk = 'Medium' THEN 'Medium'
               ELSE 'Low'
             END,
             assessed_at = NOW()`,
          {
            replacements: {
              playerId: row.player_id,
              risk: isUrgent ? "High" : "Medium",
            },
          },
        )
        .catch((err) =>
          logger.warn("[ContractEngine] risk_radar update failed", {
            error: (err as Error).message,
          }),
        );

      // Notify management
      await notifyByRole(["Admin", "Manager", "Legal"], {
        type: "contract",
        title: `Renewal window: ${playerName} — ${daysLeft} days left`,
        titleAr: `نافذة تجديد: ${playerNameAr} — ${daysLeft} يوم متبقي`,
        body: `${row.contract_type} contract with ${clubName} expires ${row.end_date}. No renewal in progress.`,
        bodyAr: `عقد ${row.contract_type} مع ${clubNameAr} ينتهي ${row.end_date}. لا يوجد تجديد قيد التنفيذ.`,
        link: `/dashboard/contracts/${row.contract_id}`,
        sourceType: "contract",
        sourceId: row.contract_id,
        priority: isUrgent ? "critical" : "high",
      });
    }
  }

  // Reset contract_risk for players whose contracts are no longer in renewal window
  await sequelize
    .query(
      `UPDATE risk_radars SET contract_risk = 'Low', assessed_at = NOW()
       WHERE contract_risk IN ('Medium', 'High')
         AND player_id NOT IN (
           SELECT c.player_id FROM contracts c
           WHERE c.status IN ('Active', 'Expiring Soon')
             AND c.end_date >= :today
             AND c.end_date <= :windowDate
             AND c.contract_type NOT IN ('Loan', 'Sponsorship', 'ImageRights', 'MedicalAuth')
         )`,
      { replacements: { today, windowDate: windowStr } },
    )
    .catch(() => {});

  return {
    contractsChecked: rows.length,
    renewalsDue: needsRenewal.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Contract Value Mismatch (weekly — Tuesday 9:30 AM)
//
// Compares a player's base salary against their latest
// market valuation. Flags when salary is ≥30% above or
// below market value → renegotiation opportunity.
// ══════════════════════════════════════════════════════════════

export async function checkContractValueMismatch(): Promise<{
  playersChecked: number;
  mismatches: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersChecked: 0, mismatches: 0, tasksCreated: 0 };

  const thresholdPct = _config.mismatchThresholdPct;

  const rows: any[] = await sequelize.query(
    `
    WITH latest_valuation AS (
      SELECT DISTINCT ON (player_id)
        player_id, value, currency, trend, change_pct, valued_at
      FROM valuations
      WHERE value IS NOT NULL AND value > 0
      ORDER BY player_id, valued_at DESC
    )
    SELECT
      c.id AS contract_id,
      c.player_id,
      c.base_salary,
      c.salary_currency,
      c.contract_type,
      c.end_date,
      lv.value AS market_value,
      lv.currency AS valuation_currency,
      lv.trend,
      lv.valued_at,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      cl.name AS club_name,
      cl.name_ar AS club_name_ar
    FROM contracts c
    JOIN players p ON p.id = c.player_id
    JOIN latest_valuation lv ON lv.player_id = c.player_id
    LEFT JOIN clubs cl ON cl.id = c.club_id
    WHERE c.status = 'Active'
      AND c.base_salary IS NOT NULL
      AND p.status = 'active'
    ORDER BY c.player_id
    `,
    { type: "SELECT" as any },
  );

  let tasksCreated = 0;
  let mismatches = 0;

  for (const row of rows) {
    const salary = Number(row.base_salary);
    const marketValue = Number(row.market_value);

    if (salary <= 0 || marketValue <= 0) continue;

    // Calculate annual salary as percentage of market value
    // If salary is way above or below what market suggests, flag it
    const annualSalary = salary * 12; // monthly → annual
    const ratio = (annualSalary / marketValue) * 100;
    const deviation = Math.abs(ratio - 100);

    // Only flag significant deviations
    if (deviation < thresholdPct) continue;

    mismatches++;
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const isOverpaid = annualSalary > marketValue;
    const direction = isOverpaid ? "overpaid" : "underpaid";
    const directionAr = isOverpaid ? "راتب مرتفع" : "راتب منخفض";

    const created = await createContractTask({
      playerId: row.player_id,
      triggerRuleId: "contract_value_mismatch",
      title: `Salary-value mismatch (${direction}): ${playerName}`,
      titleAr: `عدم تطابق الراتب والقيمة (${directionAr}): ${playerNameAr}`,
      description:
        `${playerName}'s annual salary (${annualSalary.toLocaleString()} ${row.salary_currency}) ` +
        `is ${deviation.toFixed(0)}% ${isOverpaid ? "above" : "below"} market value ` +
        `(${marketValue.toLocaleString()} ${row.valuation_currency}, valued ${row.valued_at}). ` +
        `Trend: ${row.trend || "N/A"}. Consider ${isOverpaid ? "renegotiation or transfer" : "salary review or contract upgrade"}.`,
      descriptionAr:
        `الراتب السنوي لـ ${playerNameAr} (${annualSalary.toLocaleString()} ${row.salary_currency}) ` +
        `${isOverpaid ? "أعلى" : "أقل"} من القيمة السوقية بنسبة ${deviation.toFixed(0)}% ` +
        `(${marketValue.toLocaleString()} ${row.valuation_currency}، مقيّم ${row.valued_at}). ` +
        `الاتجاه: ${row.trend || "غير محدد"}. ${isOverpaid ? "النظر في إعادة التفاوض أو الانتقال" : "مراجعة الراتب أو ترقية العقد"}.`,
      priority: deviation >= thresholdPct * 2 ? "high" : "medium",
      dueDays: 7,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Finance"], {
        type: "contract",
        title: `Value mismatch: ${playerName} — ${direction} by ${deviation.toFixed(0)}%`,
        titleAr: `عدم تطابق القيمة: ${playerNameAr} — ${directionAr} بنسبة ${deviation.toFixed(0)}%`,
        body: `Annual salary: ${annualSalary.toLocaleString()} ${row.salary_currency}. Market value: ${marketValue.toLocaleString()} ${row.valuation_currency}.`,
        bodyAr: `الراتب السنوي: ${annualSalary.toLocaleString()} ${row.salary_currency}. القيمة السوقية: ${marketValue.toLocaleString()} ${row.valuation_currency}.`,
        link: `/dashboard/contracts/${row.contract_id}`,
        sourceType: "contract",
        sourceId: row.contract_id,
        priority: "normal",
      });
    }
  }

  return {
    playersChecked: rows.length,
    mismatches,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Loan Return Tracker (daily — 8:30 AM)
//
// Tracks Loan-type contracts approaching their end date.
// Creates tasks for pre-return logistics and evaluation.
// ══════════════════════════════════════════════════════════════

export async function checkLoanReturns(): Promise<{
  activeLoans: number;
  returningsSoon: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { activeLoans: 0, returningsSoon: 0, tasksCreated: 0 };

  const today = new Date().toISOString().split("T")[0];
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + _config.loanReturnAlertDays);
  const alertStr = alertDate.toISOString().split("T")[0];

  const rows: any[] = await sequelize.query(
    `
    SELECT
      c.id AS contract_id,
      c.player_id,
      c.end_date,
      c.start_date,
      c.status,
      cl.name AS club_name,
      cl.name_ar AS club_name_ar,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id, p.coach_id,
      p.position,
      (c.end_date::date - CURRENT_DATE) AS days_remaining
    FROM contracts c
    JOIN players p ON p.id = c.player_id
    LEFT JOIN clubs cl ON cl.id = c.club_id
    WHERE c.contract_type = 'Loan'
      AND c.status IN ('Active', 'Expiring Soon')
      AND c.end_date >= :today
      AND c.end_date <= :alertDate
      AND p.status = 'active'
    ORDER BY c.end_date ASC
    `,
    {
      replacements: { today, alertDate: alertStr },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  // Count all active loans
  const [loanCountRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM contracts WHERE contract_type = 'Loan' AND status IN ('Active', 'Expiring Soon')`,
    { type: "SELECT" as any },
  )) as any[];
  const activeLoans = Number(loanCountRow?.cnt ?? 0);

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const clubName = row.club_name || "Unknown";
    const clubNameAr = row.club_name_ar || clubName;
    const daysLeft = Number(row.days_remaining);

    const created = await createContractTask({
      playerId: row.player_id,
      triggerRuleId: "loan_return_tracker",
      title: `Loan ending: ${playerName} returns in ${daysLeft}d`,
      titleAr: `انتهاء إعارة: ${playerNameAr} يعود خلال ${daysLeft} يوم`,
      description:
        `${playerName}'s loan to ${clubName} ends on ${row.end_date} (${daysLeft} days). ` +
        `Position: ${row.position || "N/A"}. Started: ${row.start_date}. ` +
        `Prepare return logistics, performance evaluation, and squad planning.`,
      descriptionAr:
        `إعارة ${playerNameAr} إلى ${clubNameAr} تنتهي في ${row.end_date} (${daysLeft} يوم). ` +
        `المركز: ${row.position || "غير محدد"}. بدأت: ${row.start_date}. ` +
        `إعداد لوجستيات العودة وتقييم الأداء وتخطيط الفريق.`,
      priority: daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "high" : "medium",
      dueDays: Math.min(daysLeft, 5),
      assignedTo: row.agent_id || row.coach_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Coach"], {
        type: "contract",
        title: `Loan return: ${playerName} — ${daysLeft} days`,
        titleAr: `عودة من إعارة: ${playerNameAr} — ${daysLeft} يوم`,
        body: `Loan to ${clubName} ends ${row.end_date}. Prepare return plan.`,
        bodyAr: `إعارة إلى ${clubNameAr} تنتهي ${row.end_date}. إعداد خطة العودة.`,
        link: `/dashboard/contracts/${row.contract_id}`,
        sourceType: "contract",
        sourceId: row.contract_id,
        priority: daysLeft <= 7 ? "critical" : "high",
      });
    }
  }

  return {
    activeLoans,
    returningsSoon: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Stale Draft Contract Detector (daily — 11:30 AM)
//
// Draft contracts untouched for 14+ days. Prompts to either
// advance the contract or archive it.
// ══════════════════════════════════════════════════════════════

export async function checkStaleDrafts(): Promise<{
  draftsChecked: number;
  stale: number;
  tasksCreated: number;
}> {
  if (!_config.enabled) return { draftsChecked: 0, stale: 0, tasksCreated: 0 };

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - _config.staleDraftDays);
  const cutoffStr = staleCutoff.toISOString();

  const rows: any[] = await sequelize.query(
    `
    SELECT
      c.id AS contract_id,
      c.player_id,
      c.contract_type,
      c.title AS contract_title,
      c.created_at,
      c.updated_at,
      c.created_by,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      cl.name AS club_name,
      cl.name_ar AS club_name_ar,
      EXTRACT(DAY FROM NOW() - c.updated_at) AS days_idle
    FROM contracts c
    JOIN players p ON p.id = c.player_id
    LEFT JOIN clubs cl ON cl.id = c.club_id
    WHERE c.status = 'Draft'
      AND c.updated_at < :cutoff
      AND p.status = 'active'
    ORDER BY c.updated_at ASC
    `,
    {
      replacements: { cutoff: cutoffStr },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const daysIdle = Math.round(Number(row.days_idle));
    const contractTitle = row.contract_title || `${row.contract_type} contract`;

    const created = await createContractTask({
      playerId: row.player_id,
      triggerRuleId: "draft_contract_stale",
      title: `Stale draft contract: ${playerName} — ${daysIdle}d idle`,
      titleAr: `مسودة عقد متوقفة: ${playerNameAr} — ${daysIdle} يوم`,
      description:
        `"${contractTitle}" for ${playerName} (${row.club_name || "N/A"}) has been in Draft status ` +
        `for ${daysIdle} days without updates. ` +
        `Either advance to Review/Signing or archive if no longer needed.`,
      descriptionAr:
        `"${contractTitle}" لـ ${playerNameAr} (${row.club_name_ar || row.club_name || "غير محدد"}) في حالة مسودة ` +
        `منذ ${daysIdle} يوم بدون تحديثات. ` +
        `يرجى التقدم للمراجعة/التوقيع أو الأرشفة إذا لم تعد هناك حاجة.`,
      priority: daysIdle >= _config.staleDraftDays * 2 ? "high" : "medium",
      dueDays: 3,
      assignedTo: row.created_by || row.agent_id || null,
    });

    if (created) tasksCreated++;
  }

  // Count total drafts
  const [draftCount] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM contracts WHERE status = 'Draft'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    draftsChecked: Number(draftCount?.cnt ?? 0),
    stale: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: Commission Due Calculator (weekly — Wednesday 9 AM)
//
// Checks for Expected payments with type "Commission" that
// are due within the alert window. Creates finance tasks.
// ══════════════════════════════════════════════════════════════

export async function checkCommissionsDue(): Promise<{
  commissionsChecked: number;
  upcoming: number;
  overdue: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { commissionsChecked: 0, upcoming: 0, overdue: 0, tasksCreated: 0 };

  const today = new Date().toISOString().split("T")[0];
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + _config.commissionAlertDays);
  const alertStr = alertDate.toISOString().split("T")[0];

  // Upcoming commissions
  const upcomingRows: any[] = await sequelize.query(
    `
    SELECT
      pm.id AS payment_id,
      pm.player_id,
      pm.amount,
      pm.currency,
      pm.due_date,
      pm.payment_type,
      pm.notes,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      (pm.due_date::date - CURRENT_DATE) AS days_until_due
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.payment_type = 'Commission'
      AND pm.status = 'Expected'
      AND pm.due_date >= :today
      AND pm.due_date <= :alertDate
    ORDER BY pm.due_date ASC
    `,
    {
      replacements: { today, alertDate: alertStr },
      type: "SELECT" as any,
    },
  );

  // Overdue commissions
  const overdueRows: any[] = await sequelize.query(
    `
    SELECT
      pm.id AS payment_id,
      pm.player_id,
      pm.amount,
      pm.currency,
      pm.due_date,
      pm.notes,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      (CURRENT_DATE - pm.due_date::date) AS days_overdue
    FROM payments pm
    JOIN players p ON p.id = pm.player_id
    WHERE pm.payment_type = 'Commission'
      AND pm.status = 'Expected'
      AND pm.due_date < :today
    ORDER BY pm.due_date ASC
    `,
    {
      replacements: { today },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  // Process upcoming commissions
  for (const row of upcomingRows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const amount = `${Number(row.amount).toLocaleString()} ${row.currency}`;
    const daysUntil = Number(row.days_until_due);

    const created = await createContractTask({
      playerId: row.player_id,
      triggerRuleId: "commission_due_upcoming",
      title: `Commission due in ${daysUntil}d: ${amount} — ${playerName}`,
      titleAr: `عمولة مستحقة خلال ${daysUntil} يوم: ${amount} — ${playerNameAr}`,
      description:
        `Commission payment of ${amount} for ${playerName} is due on ${row.due_date} ` +
        `(${daysUntil} days). Ensure invoicing and payment processing are on track.`,
      descriptionAr:
        `دفعة عمولة بقيمة ${amount} لـ ${playerNameAr} مستحقة في ${row.due_date} ` +
        `(${daysUntil} يوم). التأكد من الفوترة ومعالجة الدفع في الموعد.`,
      priority: daysUntil <= 3 ? "high" : "medium",
      dueDays: Math.min(daysUntil, 5),
      assignedTo: row.agent_id || null,
    });

    if (created) tasksCreated++;
  }

  // Process overdue commissions
  for (const row of overdueRows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const amount = `${Number(row.amount).toLocaleString()} ${row.currency}`;
    const daysOverdue = Number(row.days_overdue);

    const created = await createContractTask({
      playerId: row.player_id,
      triggerRuleId: "commission_due_overdue",
      title: `OVERDUE commission: ${amount} — ${playerName} (${daysOverdue}d late)`,
      titleAr: `عمولة متأخرة: ${amount} — ${playerNameAr} (${daysOverdue} يوم تأخير)`,
      description:
        `Commission payment of ${amount} for ${playerName} was due on ${row.due_date} ` +
        `(${daysOverdue} days overdue). Immediate follow-up with payer required.`,
      descriptionAr:
        `دفعة عمولة بقيمة ${amount} لـ ${playerNameAr} كانت مستحقة في ${row.due_date} ` +
        `(${daysOverdue} يوم تأخير). مطلوب متابعة فورية مع الدافع.`,
      priority: "critical",
      dueDays: 1,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      // Notify finance team for overdue
      await notifyByRole(["Admin", "Manager", "Finance"], {
        type: "payment",
        title: `OVERDUE commission: ${amount} — ${playerName}`,
        titleAr: `عمولة متأخرة: ${amount} — ${playerNameAr}`,
        body: `${daysOverdue} days overdue. Due date was ${row.due_date}.`,
        bodyAr: `${daysOverdue} يوم تأخير. تاريخ الاستحقاق كان ${row.due_date}.`,
        link: "/dashboard/finance",
        sourceType: "payment",
        sourceId: row.payment_id,
        priority: "critical",
      });
    }
  }

  // Count total commissions
  const [totalRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM payments WHERE payment_type = 'Commission' AND status = 'Expected'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    commissionsChecked: Number(totalRow?.cnt ?? 0),
    upcoming: upcomingRows.length,
    overdue: overdueRows.length,
    tasksCreated,
  };
}
