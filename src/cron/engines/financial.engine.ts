// ═══════════════════════════════════════════════════════════════
// Financial Intelligence Engine
//
// Proactive financial analytics beyond basic payment reminders:
// invoice aging escalation, revenue anomaly detection, expense
// budget monitoring, player ROI analysis, and valuation
// staleness tracking.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "../../config/database";
import { logger } from "../../config/logger";
import { Task } from "../../modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "../../modules/notifications/notification.service";

// ── Configurable thresholds (loaded from app_settings) ──

export interface FinancialIntelConfig {
  enabled: boolean;
  // invoice-aging-tracker
  invoiceAgingThresholdsDays: number[]; // aging buckets (default [30, 60, 90])
  // revenue-anomaly-detector
  revenueAnomalyThresholdPct: number; // % shortfall to flag (default 20)
  revenueComparisonMonths: number; // months to compare (default 3)
  // expense-budget-monitor
  expenseOverageThresholdPct: number; // % above historical avg to flag (default 50)
  expenseHistoryMonths: number; // months of history for avg (default 6)
  // player-roi-calculator
  roiNegativeThreshold: number; // minimum negative ROI to flag (default 0)
  // valuation-staleness-check
  valuationStalenessDays: number; // days before a valuation is stale (default 90)
}

const DEFAULT_CONFIG: FinancialIntelConfig = {
  enabled: true,
  invoiceAgingThresholdsDays: [30, 60, 90],
  revenueAnomalyThresholdPct: 20,
  revenueComparisonMonths: 3,
  expenseOverageThresholdPct: 50,
  expenseHistoryMonths: 6,
  roiNegativeThreshold: 0,
  valuationStalenessDays: 90,
};

let _config: FinancialIntelConfig = { ...DEFAULT_CONFIG };

export function getFinancialIntelConfig(): FinancialIntelConfig {
  return { ..._config };
}

/** Load config from app_settings (called once at startup) */
export async function loadFinancialIntelConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'financial_intel_config' LIMIT 1`,
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
export async function saveFinancialIntelConfig(
  updates: Partial<FinancialIntelConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('financial_intel_config', :val)
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

/**
 * Creates a finance-related task with 7-day deduplication.
 * Supports optional playerId for non-player tasks (e.g. expense budget).
 */
async function createFinanceTask(opts: {
  playerId: string | null;
  triggerRuleId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDays: number;
  assignedTo: string | null;
}): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Dedup: same rule + player (or just rule if no player) within 7 days
  const playerClause = opts.playerId
    ? `AND player_id = '${opts.playerId}'`
    : `AND player_id IS NULL`;

  const existing = await Task.findOne({
    where: sequelize.literal(`
      trigger_rule_id = '${opts.triggerRuleId}'
      ${playerClause}
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
    type: "Report",
    priority: opts.priority,
    status: "Open",
    playerId: opts.playerId,
    assignedTo: opts.assignedTo,
    isAutoCreated: true,
    triggerRuleId: opts.triggerRuleId,
    dueDate: dueDate(opts.dueDays),
    notes: opts.descriptionAr,
  } as any);

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
      logger.warn("[FinanceEngine] notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Invoice Aging Tracker (daily — 11 AM)
//
// Auto-updates Expected invoices past due date to Overdue.
// Creates escalating tasks at 30/60/90 day aging thresholds.
// ══════════════════════════════════════════════════════════════

export async function checkInvoiceAging(): Promise<{
  invoicesChecked: number;
  autoUpdated: number;
  aged: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { invoicesChecked: 0, autoUpdated: 0, aged: 0, tasksCreated: 0 };

  // Step 1: Auto-update Expected → Overdue for invoices past due date
  const [, updateResult] = await sequelize.query(
    `UPDATE invoices
     SET status = 'Overdue', updated_at = NOW()
     WHERE status = 'Expected'
       AND due_date < CURRENT_DATE`,
  );
  const autoUpdated = (updateResult as any)?.rowCount ?? updateResult ?? 0;

  // Step 2: Find aged invoices at threshold buckets
  const minAgingDays = Math.min(..._config.invoiceAgingThresholdsDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      i.id AS invoice_id,
      i.invoice_number,
      i.player_id,
      i.club_id,
      i.total_amount,
      i.currency,
      i.status,
      i.issue_date,
      i.due_date,
      (CURRENT_DATE - i.issue_date::date) AS days_since_issue,
      (CURRENT_DATE - i.due_date::date) AS days_overdue,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      cl.name AS club_name,
      cl.name_ar AS club_name_ar
    FROM invoices i
    LEFT JOIN players p ON p.id = i.player_id
    LEFT JOIN clubs cl ON cl.id = i.club_id
    WHERE i.status IN ('Expected', 'Overdue')
      AND (CURRENT_DATE - i.issue_date::date) >= :minAgingDays
    ORDER BY (CURRENT_DATE - i.issue_date::date) DESC
    `,
    {
      replacements: { minAgingDays },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const daysSinceIssue = Number(row.days_since_issue);

    // Determine highest applicable aging bucket
    const sortedThresholds = [..._config.invoiceAgingThresholdsDays].sort(
      (a, b) => b - a,
    );
    const bucket = sortedThresholds.find((t) => daysSinceIssue >= t);
    if (!bucket) continue;

    const playerName = row.first_name
      ? `${row.first_name} ${row.last_name}`.trim()
      : null;
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const amount = `${Number(row.total_amount).toLocaleString()} ${row.currency}`;
    const context = playerName ? ` — ${playerName}` : "";
    const contextAr = playerNameAr ? ` — ${playerNameAr}` : "";

    const priority: "medium" | "high" | "critical" =
      bucket >= 90 ? "critical" : bucket >= 60 ? "high" : "medium";

    const created = await createFinanceTask({
      playerId: row.player_id || null,
      triggerRuleId: `invoice_aging_${bucket}`,
      title: `Invoice aging (${bucket}d): ${row.invoice_number} — ${amount}${context}`,
      titleAr: `تقادم فاتورة (${bucket} يوم): ${row.invoice_number} — ${amount}${contextAr}`,
      description:
        `Invoice ${row.invoice_number} (${amount}) has been outstanding for ${daysSinceIssue} days ` +
        `(issued: ${row.issue_date}, due: ${row.due_date}). ` +
        `${row.club_name ? `Club: ${row.club_name}. ` : ""}` +
        `Escalate collection efforts or review for write-off.`,
      descriptionAr:
        `الفاتورة ${row.invoice_number} (${amount}) مستحقة منذ ${daysSinceIssue} يوم ` +
        `(صدرت: ${row.issue_date}، مستحقة: ${row.due_date}). ` +
        `${row.club_name_ar || row.club_name ? `النادي: ${row.club_name_ar || row.club_name}. ` : ""}` +
        `تصعيد جهود التحصيل أو مراجعة لشطب الدين.`,
      priority,
      dueDays: bucket >= 90 ? 1 : bucket >= 60 ? 3 : 5,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Finance"], {
        type: "payment",
        title: `Invoice aging: ${row.invoice_number} — ${bucket}d old${context}`,
        titleAr: `تقادم فاتورة: ${row.invoice_number} — ${bucket} يوم${contextAr}`,
        body: `${amount} outstanding since ${row.issue_date}. Status: ${row.status}.`,
        bodyAr: `${amount} مستحقة منذ ${row.issue_date}. الحالة: ${row.status}.`,
        link: "/dashboard/finance",
        sourceType: "invoice",
        sourceId: row.invoice_id,
        priority: priority === "critical" ? "critical" : "high",
      });
    }
  }

  return {
    invoicesChecked: rows.length,
    autoUpdated: Number(autoUpdated),
    aged: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Revenue Anomaly Detector (weekly — Thursday 10 AM)
//
// Compares actual paid revenue per player vs expected revenue
// from active contracts. Flags significant shortfalls.
// ══════════════════════════════════════════════════════════════

export async function checkRevenueAnomalies(): Promise<{
  playersAnalyzed: number;
  anomaliesDetected: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersAnalyzed: 0, anomaliesDetected: 0, tasksCreated: 0 };

  const thresholdPct = _config.revenueAnomalyThresholdPct;
  const months = _config.revenueComparisonMonths;

  const rows: any[] = await sequelize.query(
    `
    WITH actual_revenue AS (
      SELECT
        player_id,
        SUM(amount) AS total_revenue,
        currency
      FROM payments
      WHERE status = 'Paid'
        AND paid_date >= (CURRENT_DATE - INTERVAL '${months} months')::date
        AND player_id IS NOT NULL
      GROUP BY player_id, currency
    ),
    expected_revenue AS (
      SELECT
        c.player_id,
        SUM(c.total_commission) AS expected_commission,
        c.salary_currency AS currency
      FROM contracts c
      WHERE c.status = 'Active'
        AND c.total_commission IS NOT NULL
        AND CAST(c.total_commission AS NUMERIC) > 0
      GROUP BY c.player_id, c.salary_currency
    )
    SELECT
      er.player_id,
      er.expected_commission,
      COALESCE(ar.total_revenue, 0) AS actual_revenue,
      er.currency,
      ROUND(
        CASE WHEN CAST(er.expected_commission AS NUMERIC) > 0
          THEN ((CAST(er.expected_commission AS NUMERIC) - COALESCE(ar.total_revenue, 0)) / CAST(er.expected_commission AS NUMERIC) * 100)
          ELSE 0
        END, 1
      ) AS shortfall_pct,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id
    FROM expected_revenue er
    LEFT JOIN actual_revenue ar ON ar.player_id = er.player_id AND ar.currency = er.currency
    JOIN players p ON p.id = er.player_id
    WHERE p.status = 'active'
      AND COALESCE(ar.total_revenue, 0) < CAST(er.expected_commission AS NUMERIC) * (1 - ${thresholdPct} / 100.0)
    ORDER BY (CAST(er.expected_commission AS NUMERIC) - COALESCE(ar.total_revenue, 0)) DESC
    `,
    { type: "SELECT" as any },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const shortfall = Number(row.shortfall_pct);
    const expected = Number(row.expected_commission).toLocaleString();
    const actual = Number(row.actual_revenue).toLocaleString();

    const created = await createFinanceTask({
      playerId: row.player_id,
      triggerRuleId: "revenue_anomaly",
      title: `Revenue shortfall: ${playerName} — ${shortfall.toFixed(0)}% below expected`,
      titleAr: `نقص في الإيرادات: ${playerNameAr} — ${shortfall.toFixed(0)}% أقل من المتوقع`,
      description:
        `${playerName}'s actual revenue over the last ${months} months is ${actual} ${row.currency} ` +
        `vs expected ${expected} ${row.currency} (shortfall: ${shortfall.toFixed(1)}%). ` +
        `Review collection status, contract terms, and outstanding payments.`,
      descriptionAr:
        `إيرادات ${playerNameAr} الفعلية خلال آخر ${months} أشهر هي ${actual} ${row.currency} ` +
        `مقابل المتوقع ${expected} ${row.currency} (نقص: ${shortfall.toFixed(1)}%). ` +
        `مراجعة حالة التحصيل وشروط العقد والمدفوعات المستحقة.`,
      priority:
        shortfall >= 50 ? "critical" : shortfall >= 30 ? "high" : "medium",
      dueDays: 5,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Finance"], {
        type: "payment",
        title: `Revenue anomaly: ${playerName} — ${shortfall.toFixed(0)}% shortfall`,
        titleAr: `شذوذ إيرادات: ${playerNameAr} — نقص ${shortfall.toFixed(0)}%`,
        body: `Expected: ${expected} ${row.currency}. Actual: ${actual} ${row.currency} (${months}mo).`,
        bodyAr: `المتوقع: ${expected} ${row.currency}. الفعلي: ${actual} ${row.currency} (${months} أشهر).`,
        link: "/dashboard/finance",
        sourceType: "player",
        sourceId: row.player_id,
        priority: shortfall >= 50 ? "critical" : "high",
      });
    }
  }

  return {
    playersAnalyzed: rows.length,
    anomaliesDetected: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Expense Budget Monitor (monthly — 1st of month 9 AM)
//
// Compares last month's expenses by category against the
// historical average. Flags categories exceeding threshold.
// ══════════════════════════════════════════════════════════════

const CATEGORY_AR: Record<string, string> = {
  Operational: "تشغيلية",
  Marketing: "تسويق",
  Travel: "سفر",
  Staff: "موظفين",
  Legal: "قانونية",
  Other: "أخرى",
};

export async function checkExpenseBudget(): Promise<{
  categoriesChecked: number;
  overBudget: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { categoriesChecked: 0, overBudget: 0, tasksCreated: 0 };

  const historyMonths = _config.expenseHistoryMonths;
  const thresholdPct = _config.expenseOverageThresholdPct;

  const rows: any[] = await sequelize.query(
    `
    WITH last_month AS (
      SELECT
        category,
        SUM(amount) AS monthly_total,
        currency
      FROM expenses
      WHERE date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
        AND date < date_trunc('month', CURRENT_DATE)::date
      GROUP BY category, currency
    ),
    historical_avg AS (
      SELECT
        category,
        AVG(monthly_total) AS avg_monthly,
        currency
      FROM (
        SELECT
          category,
          date_trunc('month', date::date) AS month,
          SUM(amount) AS monthly_total,
          currency
        FROM expenses
        WHERE date >= (CURRENT_DATE - INTERVAL '${historyMonths} months')::date
          AND date < (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
        GROUP BY category, date_trunc('month', date::date), currency
      ) monthly
      GROUP BY category, currency
    )
    SELECT
      lm.category,
      lm.monthly_total,
      COALESCE(ha.avg_monthly, 0) AS avg_monthly,
      lm.currency,
      CASE WHEN COALESCE(ha.avg_monthly, 0) > 0
        THEN ROUND(((lm.monthly_total - ha.avg_monthly) / ha.avg_monthly * 100), 1)
        ELSE 0
      END AS overage_pct
    FROM last_month lm
    LEFT JOIN historical_avg ha ON ha.category = lm.category AND ha.currency = lm.currency
    WHERE COALESCE(ha.avg_monthly, 0) > 0
      AND lm.monthly_total > ha.avg_monthly * (1 + ${thresholdPct} / 100.0)
    ORDER BY (lm.monthly_total - COALESCE(ha.avg_monthly, 0)) DESC
    `,
    { type: "SELECT" as any },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const overage = Number(row.overage_pct);
    const actual = Number(row.monthly_total).toLocaleString();
    const avg = Number(row.avg_monthly).toLocaleString();
    const categoryAr = CATEGORY_AR[row.category] || row.category;

    const created = await createFinanceTask({
      playerId: null,
      triggerRuleId: `expense_budget_${row.category}`,
      title: `Expense overage: ${row.category} — ${overage.toFixed(0)}% above average`,
      titleAr: `تجاوز مصروفات: ${categoryAr} — ${overage.toFixed(0)}% فوق المتوسط`,
      description:
        `Last month's ${row.category} expenses totaled ${actual} ${row.currency} ` +
        `(${historyMonths}-month avg: ${avg} ${row.currency}, overage: ${overage.toFixed(1)}%). ` +
        `Review spending and identify cost reduction opportunities.`,
      descriptionAr:
        `مصروفات ${categoryAr} الشهر الماضي بلغت ${actual} ${row.currency} ` +
        `(متوسط ${historyMonths} أشهر: ${avg} ${row.currency}، تجاوز: ${overage.toFixed(1)}%). ` +
        `مراجعة الإنفاق وتحديد فرص خفض التكاليف.`,
      priority: overage >= 100 ? "high" : "medium",
      dueDays: 5,
      assignedTo: null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Finance"], {
        type: "system",
        title: `Expense alert: ${row.category} — ${overage.toFixed(0)}% over budget`,
        titleAr: `تنبيه مصروفات: ${categoryAr} — ${overage.toFixed(0)}% فوق الميزانية`,
        body: `Spent ${actual} ${row.currency} vs avg ${avg} ${row.currency}.`,
        bodyAr: `أنفق ${actual} ${row.currency} مقابل متوسط ${avg} ${row.currency}.`,
        link: "/dashboard/finance",
        sourceType: "system",
        priority: overage >= 100 ? "high" : "normal",
      });
    }
  }

  // Count total categories checked
  const [catCount] = (await sequelize.query(
    `SELECT COUNT(DISTINCT category) AS cnt FROM expenses
     WHERE date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
       AND date < date_trunc('month', CURRENT_DATE)::date`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    categoriesChecked: Number(catCount?.cnt ?? 0),
    overBudget: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Player ROI Calculator (weekly — Thursday 10:30 AM)
//
// Compares total paid revenue per player vs total expenses
// associated with that player. Flags negative ROI.
// ══════════════════════════════════════════════════════════════

export async function checkPlayerROI(): Promise<{
  playersAnalyzed: number;
  negativeROI: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersAnalyzed: 0, negativeROI: 0, tasksCreated: 0 };

  const rows: any[] = await sequelize.query(
    `
    WITH player_revenue AS (
      SELECT
        player_id,
        SUM(amount) AS total_revenue,
        currency
      FROM payments
      WHERE status = 'Paid'
        AND player_id IS NOT NULL
      GROUP BY player_id, currency
    ),
    player_expenses AS (
      SELECT
        player_id,
        SUM(amount) AS total_expenses,
        currency
      FROM expenses
      WHERE player_id IS NOT NULL
      GROUP BY player_id, currency
    )
    SELECT
      COALESCE(pr.player_id, pe.player_id) AS player_id,
      COALESCE(pr.total_revenue, 0) AS total_revenue,
      COALESCE(pe.total_expenses, 0) AS total_expenses,
      COALESCE(pr.currency, pe.currency, 'SAR') AS currency,
      (COALESCE(pr.total_revenue, 0) - COALESCE(pe.total_expenses, 0)) AS net_value,
      CASE WHEN COALESCE(pe.total_expenses, 0) > 0
        THEN ROUND(((COALESCE(pr.total_revenue, 0) - pe.total_expenses) / pe.total_expenses * 100), 1)
        ELSE 0
      END AS roi_pct,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id
    FROM player_revenue pr
    FULL OUTER JOIN player_expenses pe
      ON pe.player_id = pr.player_id AND pe.currency = pr.currency
    JOIN players p ON p.id = COALESCE(pr.player_id, pe.player_id)
    WHERE p.status = 'active'
      AND (COALESCE(pr.total_revenue, 0) - COALESCE(pe.total_expenses, 0)) < :threshold
      AND COALESCE(pe.total_expenses, 0) > 0
    ORDER BY (COALESCE(pr.total_revenue, 0) - COALESCE(pe.total_expenses, 0)) ASC
    `,
    {
      replacements: { threshold: _config.roiNegativeThreshold },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const revenue = Number(row.total_revenue).toLocaleString();
    const expenses = Number(row.total_expenses).toLocaleString();
    const netValue = Number(row.net_value).toLocaleString();
    const roiPct = Number(row.roi_pct);

    const created = await createFinanceTask({
      playerId: row.player_id,
      triggerRuleId: "player_roi_negative",
      title: `Negative ROI: ${playerName} (${roiPct.toFixed(0)}%)`,
      titleAr: `عائد سلبي: ${playerNameAr} (${roiPct.toFixed(0)}%)`,
      description:
        `${playerName}'s total revenue is ${revenue} ${row.currency} vs expenses ${expenses} ${row.currency} ` +
        `(net: ${netValue} ${row.currency}, ROI: ${roiPct.toFixed(1)}%). ` +
        `Review revenue generation strategy and cost allocation.`,
      descriptionAr:
        `إجمالي إيرادات ${playerNameAr} هو ${revenue} ${row.currency} مقابل مصروفات ${expenses} ${row.currency} ` +
        `(صافي: ${netValue} ${row.currency}، العائد: ${roiPct.toFixed(1)}%). ` +
        `مراجعة استراتيجية توليد الإيرادات وتخصيص التكاليف.`,
      priority: roiPct <= -50 ? "high" : "medium",
      dueDays: 7,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Finance"], {
        type: "payment",
        title: `Negative ROI: ${playerName} — ${roiPct.toFixed(0)}%`,
        titleAr: `عائد سلبي: ${playerNameAr} — ${roiPct.toFixed(0)}%`,
        body: `Revenue: ${revenue} ${row.currency}. Expenses: ${expenses} ${row.currency}. Net: ${netValue}.`,
        bodyAr: `الإيرادات: ${revenue} ${row.currency}. المصروفات: ${expenses} ${row.currency}. الصافي: ${netValue}.`,
        link: `/dashboard/players/${row.player_id}`,
        sourceType: "player",
        sourceId: row.player_id,
        priority: "normal",
      });
    }
  }

  return {
    playersAnalyzed: rows.length,
    negativeROI: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: Valuation Staleness Check (weekly — Monday 11 AM)
//
// Flags active players whose last valuation is older than
// the configured threshold or who have no valuation at all.
// ══════════════════════════════════════════════════════════════

export async function checkValuationStaleness(): Promise<{
  playersChecked: number;
  staleValuations: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersChecked: 0, staleValuations: 0, tasksCreated: 0 };

  const stalenessDays = _config.valuationStalenessDays;

  const rows: any[] = await sequelize.query(
    `
    WITH latest_valuation AS (
      SELECT DISTINCT ON (player_id)
        player_id, value, currency, source, trend, valued_at
      FROM valuations
      ORDER BY player_id, valued_at DESC
    )
    SELECT
      p.id AS player_id,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id,
      lv.value AS last_value,
      lv.currency,
      lv.source,
      lv.trend,
      lv.valued_at,
      (CURRENT_DATE - lv.valued_at::date) AS days_since_valuation
    FROM players p
    LEFT JOIN latest_valuation lv ON lv.player_id = p.id
    WHERE p.status = 'active'
      AND (
        lv.valued_at IS NULL
        OR (CURRENT_DATE - lv.valued_at::date) >= :stalenessDays
      )
    ORDER BY COALESCE(CURRENT_DATE - lv.valued_at::date, 9999) DESC
    `,
    {
      replacements: { stalenessDays },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const hasValuation = row.valued_at !== null;
    const daysSince = hasValuation ? Number(row.days_since_valuation) : null;

    const created = await createFinanceTask({
      playerId: row.player_id,
      triggerRuleId: "valuation_stale",
      title: hasValuation
        ? `Stale valuation: ${playerName} — ${daysSince}d old`
        : `Missing valuation: ${playerName}`,
      titleAr: hasValuation
        ? `تقييم قديم: ${playerNameAr} — ${daysSince} يوم`
        : `تقييم مفقود: ${playerNameAr}`,
      description: hasValuation
        ? `${playerName}'s last valuation was ${daysSince} days ago ` +
          `(${Number(row.last_value).toLocaleString()} ${row.currency}, source: ${row.source || "N/A"}, trend: ${row.trend || "N/A"}). ` +
          `Request an updated market assessment.`
        : `${playerName} has no market valuation on record. ` +
          `Request an initial market assessment to establish baseline value.`,
      descriptionAr: hasValuation
        ? `آخر تقييم لـ ${playerNameAr} كان قبل ${daysSince} يوم ` +
          `(${Number(row.last_value).toLocaleString()} ${row.currency}). ` +
          `طلب تقييم سوقي محدث.`
        : `${playerNameAr} ليس لديه تقييم سوقي مسجل. ` +
          `طلب تقييم سوقي أولي لتحديد القيمة الأساسية.`,
      priority:
        !hasValuation || (daysSince && daysSince > 180) ? "high" : "medium",
      dueDays: 5,
      assignedTo: row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Scout"], {
        type: "system",
        title: hasValuation
          ? `Stale valuation: ${playerName} — ${daysSince}d`
          : `Missing valuation: ${playerName}`,
        titleAr: hasValuation
          ? `تقييم قديم: ${playerNameAr} — ${daysSince} يوم`
          : `تقييم مفقود: ${playerNameAr}`,
        body: hasValuation
          ? `Last valued at ${Number(row.last_value).toLocaleString()} ${row.currency} on ${row.valued_at}.`
          : `No valuation on record. Baseline assessment needed.`,
        bodyAr: hasValuation
          ? `آخر تقييم ${Number(row.last_value).toLocaleString()} ${row.currency} بتاريخ ${row.valued_at}.`
          : `لا يوجد تقييم مسجل. مطلوب تقييم أولي.`,
        link: `/dashboard/players/${row.player_id}`,
        sourceType: "player",
        sourceId: row.player_id,
        priority: "normal",
      });
    }
  }

  return {
    playersChecked: rows.length,
    staleValuations: rows.length,
    tasksCreated,
  };
}
