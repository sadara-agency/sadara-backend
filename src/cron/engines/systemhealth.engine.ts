// ═══════════════════════════════════════════════════════════════
// System Health & Data Quality Engine
//
// Proactive data integrity monitoring: orphan detection,
// player data completeness, stale task escalation,
// risk radar consistency, and duplicate detection.
// ═══════════════════════════════════════════════════════════════

import { Op } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { notifyByRole } from "@modules/notifications/notification.service";
import { Task } from "@modules/tasks/task.model";
import { cfg } from "@shared/utils/autoTaskHelpers";

// ── Configurable thresholds (loaded from app_settings) ──

export interface SystemHealthConfig {
  enabled: boolean;
  // orphan-record-detector
  orphanCheckEnabled: boolean;
  // player-data-completeness
  requiredPlayerFields: string[]; // DB column names to check for nulls
  // stale-task-escalator
  taskOverdueDaysToEscalate: number; // days overdue before escalation (default 7)
  taskOverdueDaysToCancel: number; // days overdue before auto-cancel (default 60)
  // risk-radar-consistency
  riskRadarCheckEnabled: boolean;
  // duplicate-record-detector
  duplicateCheckEnabled: boolean;
}

const DEFAULT_CONFIG: SystemHealthConfig = {
  enabled: true,
  orphanCheckEnabled: true,
  requiredPlayerFields: [
    "date_of_birth",
    "position",
    "nationality",
    "current_club_id",
  ],
  taskOverdueDaysToEscalate: 7,
  taskOverdueDaysToCancel: 60,
  riskRadarCheckEnabled: true,
  duplicateCheckEnabled: true,
};

let _config: SystemHealthConfig = { ...DEFAULT_CONFIG };

export function getSystemHealthConfig(): SystemHealthConfig {
  return _config;
}

export async function loadSystemHealthConfig(): Promise<void> {
  try {
    const [rows]: any = await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'system_health_config' LIMIT 1`,
    );
    if (rows.length) {
      _config = { ...DEFAULT_CONFIG, ...JSON.parse(rows[0].value) };
      logger.info("[SystemHealthEngine] Config loaded from DB");
    }
  } catch {
    logger.warn("[SystemHealthEngine] Using default config");
  }
}

export async function saveSystemHealthConfig(
  patch: Partial<SystemHealthConfig>,
): Promise<SystemHealthConfig> {
  _config = { ..._config, ...patch };
  await sequelize.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('system_health_config', :val, NOW())
     ON CONFLICT (key) DO UPDATE SET value = :val, updated_at = NOW()`,
    { replacements: { val: JSON.stringify(_config) } },
  );
  return _config;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Orphan Record Detector
//
// Finds documents & notes referencing entities that no longer
// exist (polymorphic FK integrity check).
// ══════════════════════════════════════════════════════════════

const ENTITY_TABLE_MAP: Record<string, string> = {
  Player: "players",
  Contract: "contracts",
  Match: "matches",
  Injury: "injuries",
  Club: "clubs",
  Offer: "offers",
};

export async function detectOrphanRecords(): Promise<{
  orphanedDocuments: number;
  orphanedNotes: number;
  orphanedApprovals: number;
}> {
  if (!_config.enabled || !_config.orphanCheckEnabled)
    return { orphanedDocuments: 0, orphanedNotes: 0, orphanedApprovals: 0 };

  let orphanedDocuments = 0;
  let orphanedNotes = 0;
  let orphanedApprovals = 0;

  // Check documents (polymorphic: entity_type + entity_id)
  for (const [entityType, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
    const [rows]: any = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt
       FROM documents d
       WHERE d.entity_type = :entityType
         AND NOT EXISTS (
           SELECT 1 FROM ${tableName} t WHERE t.id = d.entity_id
         )`,
      { replacements: { entityType } },
    );
    orphanedDocuments += rows[0]?.cnt ?? 0;
  }

  // Check notes (polymorphic: owner_type + owner_id)
  for (const [entityType, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
    const [rows]: any = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt
       FROM notes n
       WHERE n.owner_type = :entityType
         AND NOT EXISTS (
           SELECT 1 FROM ${tableName} t WHERE t.id = n.owner_id
         )`,
      { replacements: { entityType } },
    );
    orphanedNotes += rows[0]?.cnt ?? 0;
  }

  // Check approval requests (polymorphic: entity_type + entity_id)
  for (const [entityType, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
    try {
      const [rows]: any = await sequelize.query(
        `SELECT COUNT(*)::int AS cnt
         FROM approval_requests ar
         WHERE ar.entity_type = :entityType
           AND NOT EXISTS (
             SELECT 1 FROM ${tableName} t WHERE t.id = ar.entity_id
           )`,
        { replacements: { entityType } },
      );
      orphanedApprovals += rows[0]?.cnt ?? 0;
    } catch {
      // table may not exist
    }
  }

  const total = orphanedDocuments + orphanedNotes + orphanedApprovals;

  if (total > 0) {
    await notifyByRole(["Admin"], {
      type: "system",
      title: `Data integrity: ${total} orphaned record(s) detected`,
      titleAr: `سلامة البيانات: تم اكتشاف ${total} سجل(ات) يتيمة`,
      body: `Documents: ${orphanedDocuments}, Notes: ${orphanedNotes}, Approvals: ${orphanedApprovals}`,
      link: "/dashboard/settings",
      sourceType: "system",
      sourceId: "orphan-record-detector",
      priority: total > 50 ? "high" : "normal",
    });
  }

  logger.info(
    `[SystemHealthEngine] orphan-detector: docs=${orphanedDocuments}, notes=${orphanedNotes}, approvals=${orphanedApprovals}`,
  );
  return { orphanedDocuments, orphanedNotes, orphanedApprovals };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Player Data Completeness
//
// Flags active players missing critical fields needed for
// proper system operation (age calculations, reporting, etc).
// ══════════════════════════════════════════════════════════════

export async function checkPlayerDataCompleteness(): Promise<{
  incomplete: number;
}> {
  if (!_config.enabled) return { incomplete: 0 };

  const fields = _config.requiredPlayerFields;
  if (!fields.length) return { incomplete: 0 };

  // Build dynamic WHERE clause for null checks
  const nullChecks = fields.map((f) => `p.${f} IS NULL`).join(" OR ");

  const incomplete: any[] = await sequelize.query(
    `SELECT p.id, p.first_name, p.last_name,
            p.first_name_ar, p.last_name_ar,
            ${fields.map((f) => `p.${f}`).join(", ")}
     FROM players p
     WHERE p.status = 'active'
       AND (${nullChecks})
     ORDER BY p.created_at ASC
     LIMIT 100`,
    { type: "SELECT" as any },
  );

  if (incomplete.length > 0) {
    // Build per-player missing field summary
    const details = incomplete.slice(0, 10).map((row) => {
      const name = `${row.first_name} ${row.last_name}`.trim();
      const missing = fields.filter(
        (f) => row[f] === null || row[f] === undefined,
      );
      return `${name}: missing ${missing.join(", ")}`;
    });

    const bodyText =
      incomplete.length <= 10
        ? details.join("; ")
        : `${details.join("; ")} … and ${incomplete.length - 10} more`;

    await notifyByRole(["Admin", "Manager"], {
      type: "system",
      title: `${incomplete.length} player(s) with incomplete data`,
      titleAr: `${incomplete.length} لاعب(ين) ببيانات ناقصة`,
      body: bodyText,
      link: "/dashboard/players",
      sourceType: "system",
      sourceId: "player-data-completeness",
      priority: incomplete.length > 20 ? "high" : "normal",
    });
  }

  logger.info(
    `[SystemHealthEngine] player-completeness: ${incomplete.length} incomplete`,
  );
  return { incomplete: incomplete.length };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Stale Task Escalator
//
// Escalates overdue Open tasks (bumps priority) and auto-
// cancels ancient tasks that are clearly abandoned.
// ══════════════════════════════════════════════════════════════

export async function escalateStaleTasks(): Promise<{
  escalated: number;
  canceled: number;
}> {
  if (!_config.enabled) return { escalated: 0, canceled: 0 };

  const today = new Date().toISOString().split("T")[0];

  // 1. Escalate: Open tasks overdue by N days → bump priority
  const escalateCutoff = new Date();
  escalateCutoff.setDate(
    escalateCutoff.getDate() - _config.taskOverdueDaysToEscalate,
  );
  const escalateStr = escalateCutoff.toISOString().split("T")[0];

  const [, escalateResult]: any = await sequelize.query(
    `UPDATE tasks
     SET priority = CASE
       WHEN priority = 'low' THEN 'medium'
       WHEN priority = 'medium' THEN 'high'
       ELSE priority
     END,
     updated_at = NOW()
     WHERE status = 'Open'
       AND due_date IS NOT NULL
       AND due_date < :escalateDate
       AND due_date >= :cancelDate
       AND priority IN ('low', 'medium')`,
    {
      replacements: {
        escalateDate: escalateStr,
        cancelDate: new Date(
          Date.now() - _config.taskOverdueDaysToCancel * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0],
      },
    },
  );

  const escalated = (escalateResult as any)?.rowCount ?? escalateResult ?? 0;

  // 2. Auto-cancel: Open tasks overdue by N days (abandoned)
  const cancelCutoff = new Date();
  cancelCutoff.setDate(
    cancelCutoff.getDate() - _config.taskOverdueDaysToCancel,
  );
  const cancelStr = cancelCutoff.toISOString().split("T")[0];

  const [, cancelResult]: any = await sequelize.query(
    `UPDATE tasks
     SET status = 'Canceled',
         notes = COALESCE(notes, '') || E'\n[Auto-canceled: overdue > ${_config.taskOverdueDaysToCancel} days]',
         updated_at = NOW()
     WHERE status = 'Open'
       AND due_date IS NOT NULL
       AND due_date < :cancelDate`,
    { replacements: { cancelDate: cancelStr } },
  );

  const canceled = (cancelResult as any)?.rowCount ?? cancelResult ?? 0;

  if (escalated > 0 || canceled > 0) {
    await notifyByRole(["Admin"], {
      type: "task",
      title: `Task cleanup: ${escalated} escalated, ${canceled} auto-canceled`,
      titleAr: `تنظيف المهام: ${escalated} تصعيد، ${canceled} إلغاء تلقائي`,
      body: `Escalated ${escalated} overdue tasks (${_config.taskOverdueDaysToEscalate}d+). Canceled ${canceled} abandoned tasks (${_config.taskOverdueDaysToCancel}d+).`,
      link: "/dashboard/tasks",
      sourceType: "system",
      sourceId: "stale-task-escalator",
      priority: "normal",
    });
  }

  logger.info(
    `[SystemHealthEngine] stale-tasks: escalated=${escalated}, canceled=${canceled}`,
  );
  return {
    escalated: typeof escalated === "number" ? escalated : 0,
    canceled: typeof canceled === "number" ? canceled : 0,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Risk Radar Consistency
//
// Validates that overall_risk matches the maximum of the
// component risk fields. Fixes inconsistencies automatically.
// ══════════════════════════════════════════════════════════════

const RISK_ORDER: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

export async function checkRiskRadarConsistency(): Promise<{
  fixed: number;
}> {
  if (!_config.enabled || !_config.riskRadarCheckEnabled) return { fixed: 0 };

  // Find risk radars where overall_risk doesn't match max of components
  const inconsistent: any[] = await sequelize.query(
    `SELECT rr.id, rr.player_id, rr.overall_risk,
            rr.injury_risk, rr.contract_risk, rr.performance_risk
     FROM risk_radars rr
     WHERE rr.overall_risk IS DISTINCT FROM
       GREATEST(
         CASE rr.injury_risk
           WHEN 'Critical' THEN 4 WHEN 'High' THEN 3
           WHEN 'Medium' THEN 2 ELSE 1 END,
         CASE rr.contract_risk
           WHEN 'Critical' THEN 4 WHEN 'High' THEN 3
           WHEN 'Medium' THEN 2 ELSE 1 END,
         CASE rr.performance_risk
           WHEN 'Critical' THEN 4 WHEN 'High' THEN 3
           WHEN 'Medium' THEN 2 ELSE 1 END
       )::text
       -- Convert back: compare as text by computing expected overall
     LIMIT 200`,
    { type: "SELECT" as any },
  );

  let fixed = 0;

  for (const row of inconsistent) {
    const maxVal = Math.max(
      RISK_ORDER[row.injury_risk] ?? 1,
      RISK_ORDER[row.contract_risk] ?? 1,
      RISK_ORDER[row.performance_risk] ?? 1,
    );

    const expectedOverall =
      Object.entries(RISK_ORDER).find(([, v]) => v === maxVal)?.[0] ?? "Low";

    if (row.overall_risk !== expectedOverall) {
      await sequelize.query(
        `UPDATE risk_radars
         SET overall_risk = :expected, assessed_at = NOW()
         WHERE id = :id`,
        { replacements: { expected: expectedOverall, id: row.id } },
      );
      fixed++;
    }
  }

  if (fixed > 0) {
    await notifyByRole(["Admin"], {
      type: "system",
      title: `Risk radar: ${fixed} inconsistency(ies) auto-corrected`,
      titleAr: `رادار المخاطر: تم تصحيح ${fixed} تناقض(ات) تلقائياً`,
      body: `Overall risk recalculated as MAX(injury, contract, performance) for ${fixed} player(s)`,
      link: "/dashboard/players",
      sourceType: "system",
      sourceId: "risk-radar-consistency",
      priority: "normal",
    });
  }

  logger.info(`[SystemHealthEngine] risk-radar-consistency: fixed=${fixed}`);
  return { fixed };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: Duplicate Record Detector
//
// Identifies potential duplicate players (same name + DOB)
// and duplicate invoices (same invoice number).
// ══════════════════════════════════════════════════════════════

export async function detectDuplicateRecords(): Promise<{
  duplicatePlayers: number;
  duplicateInvoices: number;
}> {
  if (!_config.enabled || !_config.duplicateCheckEnabled)
    return { duplicatePlayers: 0, duplicateInvoices: 0 };

  // 1. Duplicate players: same first_name + last_name + date_of_birth
  const [dupPlayers]: any = await sequelize.query(
    `SELECT COUNT(*)::int AS groups
     FROM (
       SELECT first_name, last_name, date_of_birth
       FROM players
       WHERE date_of_birth IS NOT NULL
       GROUP BY first_name, last_name, date_of_birth
       HAVING COUNT(*) > 1
     ) dupes`,
  );

  const duplicatePlayers = dupPlayers[0]?.groups ?? 0;

  // 2. Duplicate invoices: same invoice_number (should be unique)
  const [dupInvoices]: any = await sequelize.query(
    `SELECT COUNT(*)::int AS groups
     FROM (
       SELECT invoice_number
       FROM invoices
       WHERE invoice_number IS NOT NULL
       GROUP BY invoice_number
       HAVING COUNT(*) > 1
     ) dupes`,
  );

  const duplicateInvoices = dupInvoices[0]?.groups ?? 0;

  const total = duplicatePlayers + duplicateInvoices;

  if (total > 0) {
    const parts: string[] = [];
    if (duplicatePlayers > 0)
      parts.push(`${duplicatePlayers} duplicate player group(s)`);
    if (duplicateInvoices > 0)
      parts.push(`${duplicateInvoices} duplicate invoice number(s)`);

    await notifyByRole(["Admin"], {
      type: "system",
      title: `Duplicates detected: ${parts.join(", ")}`,
      titleAr: `تكرارات مكتشفة: ${total} مجموعة(ات)`,
      body: parts.join(". "),
      link: "/dashboard/settings",
      sourceType: "system",
      sourceId: "duplicate-record-detector",
      priority: duplicatePlayers > 0 ? "high" : "normal",
    });
  }

  logger.info(
    `[SystemHealthEngine] duplicate-detector: players=${duplicatePlayers}, invoices=${duplicateInvoices}`,
  );
  return { duplicatePlayers, duplicateInvoices };
}

// ══════════════════════════════════════════════════════════════
// JOB 6: Overdue Task Threshold Notification
//
// Daily check: if total overdue tasks ≥ threshold (default 10),
// notify Admin + Manager roles with a link to the tasks page.
// ══════════════════════════════════════════════════════════════

export async function checkOverdueTaskThreshold(): Promise<{
  count: number;
}> {
  const rc = cfg("overdue_task_threshold");
  if (!rc.enabled) return { count: 0 };

  const threshold = rc.threshold ?? 10;

  const count = await Task.count({
    where: {
      status: { [Op.in]: ["Open", "InProgress"] },
      dueDate: { [Op.lt]: new Date() },
    },
  });

  if (count >= threshold) {
    await notifyByRole(["Admin", "Manager"], {
      type: "task",
      title: `${count} overdue tasks require attention`,
      titleAr: `${count} مهمة متأخرة تحتاج مراجعة`,
      body: `There are ${count} overdue tasks. Review and reassign as needed.`,
      bodyAr: `يوجد ${count} مهمة متأخرة. راجعها وأعد توزيعها حسب الحاجة.`,
      link: "/dashboard/tasks",
      sourceType: "system",
      sourceId: "overdue-task-threshold",
      priority: count > 20 ? "high" : "normal",
    }).catch(() => {});
  }

  logger.info(
    `[SystemHealthEngine] overdue-task-threshold: count=${count}, threshold=${threshold}`,
  );
  return { count };
}

// ══════════════════════════════════════════════════════════════
// JOB 7: High-Priority Approval Escalation (48h)
//
// Every 6h: find high/critical approval requests pending > 48h,
// notify Admin. Uses sourceId dedup to avoid repeat notifications.
// ══════════════════════════════════════════════════════════════

export async function checkStaleApprovals(): Promise<{
  escalated: number;
}> {
  const rc = cfg("approval_escalation_48h");
  if (!rc.enabled) return { escalated: 0 };

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const stale: any[] = await sequelize.query(
    `SELECT ar.id, ar.title, ar.priority, ar.entity_type, ar.entity_id, ar.created_at
     FROM approval_requests ar
     WHERE ar.status = 'Pending'
       AND ar.priority IN ('high', 'critical')
       AND ar.created_at < :cutoff
     ORDER BY ar.priority DESC, ar.created_at ASC
     LIMIT 50`,
    { type: "SELECT" as any, replacements: { cutoff } },
  );

  if (!stale.length) return { escalated: 0 };

  for (const ar of stale) {
    const sourceId = `approval-escalation-48h-${ar.id}`;

    // Dedup: skip if we already notified for this approval in the last 24h
    const [existing]: any = await sequelize.query(
      `SELECT id FROM notifications
       WHERE source_type = 'system' AND source_id = :sourceId
         AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      { type: "SELECT" as any, replacements: { sourceId } },
    );

    if (existing) continue;

    await notifyByRole(["Admin"], {
      type: "system",
      title: `Approval pending > 48h: ${ar.title ?? ar.entity_type}`,
      titleAr: `طلب موافقة معلق أكثر من 48 ساعة`,
      body: `A ${ar.priority}-priority approval (${ar.entity_type}) has been pending since ${new Date(ar.created_at).toLocaleDateString()}.`,
      bodyAr: `طلب موافقة بأولوية ${ar.priority} معلق منذ ${new Date(ar.created_at).toLocaleDateString()}.`,
      link: "/dashboard/approvals?status=pending",
      sourceType: "system",
      sourceId,
      priority: ar.priority === "critical" ? "high" : "normal",
    }).catch(() => {});
  }

  logger.info(
    `[SystemHealthEngine] approval-escalation-48h: escalated=${stale.length}`,
  );
  return { escalated: stale.length };
}
