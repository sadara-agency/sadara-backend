// ═══════════════════════════════════════════════════════════════
// Gate & Onboarding Engine
//
// Automates gate pipeline oversight: scheduled auto-verification,
// stale gate detection, incomplete checklist follow-ups, gate
// progression nudges, and clearance follow-up tracking.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { Task } from "@modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";

// ── Configurable thresholds (loaded from app_settings) ──

export interface GateOnboardingConfig {
  enabled: boolean;
  // gate-auto-verify
  autoVerifyEnabled: boolean; // run scheduled auto-verification (default true)
  // gate-stale-detector
  staleGateDays: number; // days InProgress without update to flag (default 14)
  // checklist-follow-up
  checklistOverdueDays: number; // days an assigned item can sit incomplete (default 7)
  // gate-progression-nudge
  nudgeCompletionPct: number; // % complete to trigger "almost done" nudge (default 80)
  // clearance-follow-up
  clearanceStaleDays: number; // days a Processing clearance can sit idle (default 7)
}

const DEFAULT_CONFIG: GateOnboardingConfig = {
  enabled: true,
  autoVerifyEnabled: true,
  staleGateDays: 14,
  checklistOverdueDays: 7,
  nudgeCompletionPct: 80,
  clearanceStaleDays: 7,
};

let _config: GateOnboardingConfig = { ...DEFAULT_CONFIG };

export function getGateOnboardingConfig(): GateOnboardingConfig {
  return { ..._config };
}

/** Load config from app_settings (called once at startup) */
export async function loadGateOnboardingConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'gate_onboarding_config' LIMIT 1`,
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
export async function saveGateOnboardingConfig(
  updates: Partial<GateOnboardingConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('gate_onboarding_config', :val)
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

const GATE_LABELS: Record<string, string> = {
  "0": "Intake",
  "1": "Development",
  "2": "Mid-Season Review",
  "3": "End-of-Season",
};

const GATE_LABELS_AR: Record<string, string> = {
  "0": "الاستقبال",
  "1": "التطوير",
  "2": "مراجعة منتصف الموسم",
  "3": "نهاية الموسم",
};

async function createGateTask(opts: {
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
    type: "General",
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
      logger.warn("[GateEngine] notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Gate Auto-Verification (daily — 6:30 AM)
//
// Runs auto-verification on all InProgress gates by checking
// each auto/auto_with_override checklist item against its
// verification rule. Updates auto_verified status in DB.
// ══════════════════════════════════════════════════════════════

export async function runGateAutoVerification(): Promise<{
  gatesChecked: number;
  itemsVerified: number;
  itemsNewlyPassed: number;
}> {
  if (!_config.enabled || !_config.autoVerifyEnabled)
    return { gatesChecked: 0, itemsVerified: 0, itemsNewlyPassed: 0 };

  // Find all InProgress gates with auto-verifiable items
  const gates: any[] = await sequelize.query(
    `
    SELECT DISTINCT g.id AS gate_id, g.player_id, g.gate_number
    FROM gates g
    JOIN gate_checklists gc ON gc.gate_id = g.id
    WHERE g.status = 'InProgress'
      AND gc.verification_type IN ('auto', 'auto_with_override')
      AND gc.is_completed = false
      AND gc.auto_verified = false
    `,
    { type: "SELECT" as any },
  );

  let itemsVerified = 0;
  let itemsNewlyPassed = 0;

  for (const gate of gates) {
    // Get auto-verifiable items for this gate
    const items: any[] = await sequelize.query(
      `
      SELECT
        gc.id AS item_id,
        gc.item,
        gc.item_ar,
        gc.verification_type,
        gc.verification_rule,
        gc.auto_verified
      FROM gate_checklists gc
      WHERE gc.gate_id = :gateId
        AND gc.verification_type IN ('auto', 'auto_with_override')
        AND gc.is_completed = false
        AND gc.auto_verified = false
      `,
      {
        replacements: { gateId: gate.gate_id },
        type: "SELECT" as any,
      },
    );

    for (const item of items) {
      const rule = item.verification_rule;
      if (!rule || !rule.check) continue;

      let verified = false;
      let reason = "";
      let reasonAr = "";

      try {
        const result = await runVerificationCheck(
          gate.player_id,
          gate.gate_id,
          rule,
        );
        verified = result.verified;
        reason = result.reason;
        reasonAr = result.reasonAr;
      } catch (err) {
        logger.warn("[GateEngine] verification check failed", {
          itemId: item.item_id,
          error: (err as Error).message,
        });
        continue;
      }

      if (verified) {
        await sequelize.query(
          `UPDATE gate_checklists
           SET auto_verified = true,
               auto_verified_details = :details,
               last_verified_at = NOW()
           WHERE id = :itemId`,
          {
            replacements: {
              itemId: item.item_id,
              details: JSON.stringify({ reason, reasonAr }),
            },
          },
        );
        itemsNewlyPassed++;
      } else {
        // Update last_verified_at even if not passed
        await sequelize.query(
          `UPDATE gate_checklists
           SET last_verified_at = NOW(),
               auto_verified_details = :details
           WHERE id = :itemId`,
          {
            replacements: {
              itemId: item.item_id,
              details: JSON.stringify({ reason, reasonAr }),
            },
          },
        );
      }

      itemsVerified++;
    }
  }

  return {
    gatesChecked: gates.length,
    itemsVerified,
    itemsNewlyPassed,
  };
}

/**
 * Simplified verification runner for common check types.
 * Covers the most frequent auto-verification rules.
 */
async function runVerificationCheck(
  playerId: string,
  gateId: string,
  rule: any,
): Promise<{ verified: boolean; reason: string; reasonAr: string }> {
  switch (rule.check) {
    case "has_document": {
      const docTypes = Array.isArray(rule.docType)
        ? rule.docType
        : [rule.docType];
      const [row] = (await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM documents
         WHERE player_id = :playerId
           AND doc_type = ANY(:docTypes)`,
        {
          replacements: { playerId, docTypes },
          type: "SELECT" as any,
        },
      )) as any[];
      const found = Number(row?.cnt ?? 0) > 0;
      return {
        verified: found,
        reason: found
          ? `Document(s) of type ${docTypes.join("/")} found`
          : `Missing document(s): ${docTypes.join("/")}`,
        reasonAr: found
          ? `تم العثور على مستند(ات) من نوع ${docTypes.join("/")}`
          : `مستند(ات) مفقودة: ${docTypes.join("/")}`,
      };
    }

    case "has_contract": {
      const whereClause = rule.contractType
        ? `AND contract_type = :contractType`
        : "";
      const signClause = rule.requireSignature
        ? `AND signed_at IS NOT NULL`
        : "";
      const [row] = (await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM contracts
         WHERE player_id = :playerId
           AND status NOT IN ('Terminated', 'Expired')
           ${whereClause} ${signClause}`,
        {
          replacements: { playerId, contractType: rule.contractType },
          type: "SELECT" as any,
        },
      )) as any[];
      const found = Number(row?.cnt ?? 0) > 0;
      return {
        verified: found,
        reason: found
          ? `Active contract found${rule.contractType ? ` (${rule.contractType})` : ""}`
          : `No active contract${rule.contractType ? ` of type ${rule.contractType}` : ""}`,
        reasonAr: found
          ? `تم العثور على عقد نشط${rule.contractType ? ` (${rule.contractType})` : ""}`
          : `لا يوجد عقد نشط${rule.contractType ? ` من نوع ${rule.contractType}` : ""}`,
      };
    }

    case "player_field": {
      const [row] = (await sequelize.query(
        `SELECT "${rule.field}" AS val FROM players WHERE id = :playerId`,
        {
          replacements: { playerId },
          type: "SELECT" as any,
        },
      )) as any[];
      const val = row?.val;
      const filled =
        rule.condition === "not_null"
          ? val != null && val !== ""
          : val === rule.value;
      return {
        verified: filled,
        reason: filled
          ? `Field ${rule.field} is set`
          : `Field ${rule.field} is not set`,
        reasonAr: filled
          ? `الحقل ${rule.field} مكتمل`
          : `الحقل ${rule.field} غير مكتمل`,
      };
    }

    case "player_fields_filled": {
      const fields = rule.fields as string[];
      const snakeFields = fields.map((f: string) =>
        f.replace(/[A-Z]/g, (c: string) => `_${c.toLowerCase()}`),
      );
      const [row] = (await sequelize.query(
        `SELECT ${snakeFields.map((f: string) => `"${f}"`).join(", ")} FROM players WHERE id = :playerId`,
        {
          replacements: { playerId },
          type: "SELECT" as any,
        },
      )) as any[];
      if (!row)
        return {
          verified: false,
          reason: "Player not found",
          reasonAr: "اللاعب غير موجود",
        };
      const missing = snakeFields.filter(
        (f: string) => row[f] == null || row[f] === "",
      );
      return {
        verified: missing.length === 0,
        reason:
          missing.length === 0
            ? `All ${fields.length} fields filled`
            : `Missing fields: ${missing.join(", ")}`,
        reasonAr:
          missing.length === 0
            ? `جميع الحقول (${fields.length}) مكتملة`
            : `حقول مفقودة: ${missing.join("، ")}`,
      };
    }

    case "has_valuation": {
      const afterClause = rule.afterGateStart
        ? `AND valued_at >= (SELECT started_at::date FROM gates WHERE id = :gateId)`
        : "";
      const [row] = (await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM valuations
         WHERE player_id = :playerId ${afterClause}`,
        {
          replacements: { playerId, gateId },
          type: "SELECT" as any,
        },
      )) as any[];
      const found = Number(row?.cnt ?? 0) > 0;
      return {
        verified: found,
        reason: found ? "Valuation record found" : "No valuation on record",
        reasonAr: found ? "تم العثور على تقييم" : "لا يوجد تقييم مسجل",
      };
    }

    default:
      return {
        verified: false,
        reason: `Unknown check type: ${rule.check}`,
        reasonAr: `نوع تحقق غير معروف: ${rule.check}`,
      };
  }
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Stale Gate Detector (daily — 10:30 AM)
//
// InProgress gates that haven't been updated in 14+ days.
// Creates task to review and advance or resolve blockers.
// ══════════════════════════════════════════════════════════════

export async function checkStaleGates(): Promise<{
  gatesChecked: number;
  stale: number;
  tasksCreated: number;
}> {
  if (!_config.enabled) return { gatesChecked: 0, stale: 0, tasksCreated: 0 };

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - _config.staleGateDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      g.id AS gate_id,
      g.player_id,
      g.gate_number,
      g.status,
      g.started_at,
      g.updated_at,
      EXTRACT(DAY FROM NOW() - g.updated_at) AS days_idle,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id, p.coach_id,
      -- Checklist progress
      (SELECT COUNT(*) FROM gate_checklists WHERE gate_id = g.id) AS total_items,
      (SELECT COUNT(*) FROM gate_checklists WHERE gate_id = g.id
        AND (is_completed = true OR (verification_type != 'manual' AND auto_verified = true))
      ) AS completed_items
    FROM gates g
    JOIN players p ON p.id = g.player_id
    WHERE g.status = 'InProgress'
      AND g.updated_at < :cutoff
      AND p.status = 'active'
    ORDER BY g.updated_at ASC
    `,
    {
      replacements: { cutoff: staleCutoff.toISOString() },
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
    const gateLabel = GATE_LABELS[row.gate_number] || `Gate ${row.gate_number}`;
    const gateLabelAr =
      GATE_LABELS_AR[row.gate_number] || `بوابة ${row.gate_number}`;
    const total = Number(row.total_items);
    const completed = Number(row.completed_items);
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const created = await createGateTask({
      playerId: row.player_id,
      triggerRuleId: "gate_stale",
      title: `Stale gate: ${playerName} — ${gateLabel} (${daysIdle}d idle)`,
      titleAr: `بوابة متوقفة: ${playerNameAr} — ${gateLabelAr} (${daysIdle} يوم)`,
      description:
        `${playerName}'s ${gateLabel} gate has been InProgress for ${daysIdle} days without updates. ` +
        `Progress: ${completed}/${total} items (${progressPct}%). ` +
        `Review blockers and advance the gate or update checklist items.`,
      descriptionAr:
        `بوابة ${gateLabelAr} لـ ${playerNameAr} قيد التنفيذ منذ ${daysIdle} يوم بدون تحديثات. ` +
        `التقدم: ${completed}/${total} عناصر (${progressPct}%). ` +
        `مراجعة العوائق وتقدم البوابة أو تحديث عناصر القائمة.`,
      priority: daysIdle >= _config.staleGateDays * 2 ? "high" : "medium",
      dueDays: 3,
      assignedTo: row.agent_id || row.coach_id || null,
    });

    if (created) tasksCreated++;
  }

  // Count total InProgress gates
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM gates WHERE status = 'InProgress'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    gatesChecked: Number(countRow?.cnt ?? 0),
    stale: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Checklist Item Follow-up (daily — 9:30 AM)
//
// Assigned checklist items that have been incomplete for 7+
// days. Notifies the assignee and creates a follow-up task.
// ══════════════════════════════════════════════════════════════

export async function checkChecklistFollowups(): Promise<{
  itemsChecked: number;
  overdue: number;
  tasksCreated: number;
}> {
  if (!_config.enabled) return { itemsChecked: 0, overdue: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.checklistOverdueDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      gc.id AS item_id,
      gc.item,
      gc.item_ar,
      gc.assigned_to,
      gc.is_mandatory,
      gc.verification_type,
      gc.created_at AS item_created_at,
      g.id AS gate_id,
      g.gate_number,
      g.player_id,
      EXTRACT(DAY FROM NOW() - gc.created_at) AS days_pending,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id
    FROM gate_checklists gc
    JOIN gates g ON g.id = gc.gate_id
    JOIN players p ON p.id = g.player_id
    WHERE g.status = 'InProgress'
      AND gc.is_completed = false
      AND gc.auto_verified = false
      AND gc.assigned_to IS NOT NULL
      AND gc.created_at < :cutoff
      AND p.status = 'active'
    ORDER BY gc.created_at ASC
    `,
    {
      replacements: { cutoff: cutoff.toISOString() },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const daysPending = Math.round(Number(row.days_pending));
    const gateLabel = GATE_LABELS[row.gate_number] || `Gate ${row.gate_number}`;
    const gateLabelAr =
      GATE_LABELS_AR[row.gate_number] || `بوابة ${row.gate_number}`;
    const itemName = row.item;
    const itemNameAr = row.item_ar || itemName;

    const created = await createGateTask({
      playerId: row.player_id,
      triggerRuleId: "checklist_overdue",
      title: `Overdue checklist: ${playerName} — "${itemName}"`,
      titleAr: `قائمة تحقق متأخرة: ${playerNameAr} — "${itemNameAr}"`,
      description:
        `Checklist item "${itemName}" in ${gateLabel} for ${playerName} has been pending for ${daysPending} days. ` +
        `${row.is_mandatory ? "This is a mandatory item blocking gate completion." : "This is an optional item."} ` +
        `Complete the item or reassign if needed.`,
      descriptionAr:
        `عنصر قائمة التحقق "${itemNameAr}" في ${gateLabelAr} لـ ${playerNameAr} معلق منذ ${daysPending} يوم. ` +
        `${row.is_mandatory ? "هذا عنصر إلزامي يمنع إتمام البوابة." : "هذا عنصر اختياري."} ` +
        `إكمال العنصر أو إعادة التعيين عند الحاجة.`,
      priority: row.is_mandatory ? "high" : "medium",
      dueDays: 2,
      assignedTo: row.assigned_to,
    });

    if (created) tasksCreated++;
  }

  return {
    itemsChecked: rows.length,
    overdue: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Gate Progression Nudge (weekly — Friday 10 AM)
//
// Gates that are ≥80% complete but not yet advanced to
// Completed. Nudges the responsible person to finalize.
// ══════════════════════════════════════════════════════════════

export async function checkGateProgressionNudge(): Promise<{
  gatesChecked: number;
  almostDone: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { gatesChecked: 0, almostDone: 0, tasksCreated: 0 };

  const minPct = _config.nudgeCompletionPct;

  const rows: any[] = await sequelize.query(
    `
    SELECT
      g.id AS gate_id,
      g.player_id,
      g.gate_number,
      g.started_at,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id, p.coach_id,
      COUNT(gc.id) AS total_items,
      COUNT(gc.id) FILTER (
        WHERE gc.is_completed = true
           OR (gc.verification_type != 'manual' AND gc.auto_verified = true)
      ) AS completed_items,
      COUNT(gc.id) FILTER (
        WHERE gc.is_mandatory = true
          AND gc.is_completed = false
          AND (gc.verification_type = 'manual' OR gc.auto_verified = false)
      ) AS mandatory_remaining
    FROM gates g
    JOIN gate_checklists gc ON gc.gate_id = g.id
    JOIN players p ON p.id = g.player_id
    WHERE g.status = 'InProgress'
      AND p.status = 'active'
    GROUP BY g.id, g.player_id, g.gate_number, g.started_at,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
             p.agent_id, p.coach_id
    HAVING COUNT(gc.id) > 0
      AND (COUNT(gc.id) FILTER (
        WHERE gc.is_completed = true
           OR (gc.verification_type != 'manual' AND gc.auto_verified = true)
      )::float / COUNT(gc.id)::float * 100) >= :minPct
    ORDER BY (COUNT(gc.id) FILTER (
        WHERE gc.is_completed = true
           OR (gc.verification_type != 'manual' AND gc.auto_verified = true)
      )::float / COUNT(gc.id)::float) DESC
    `,
    {
      replacements: { minPct },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const gateLabel = GATE_LABELS[row.gate_number] || `Gate ${row.gate_number}`;
    const gateLabelAr =
      GATE_LABELS_AR[row.gate_number] || `بوابة ${row.gate_number}`;
    const total = Number(row.total_items);
    const completed = Number(row.completed_items);
    const progressPct = Math.round((completed / total) * 100);
    const mandatoryLeft = Number(row.mandatory_remaining);

    const created = await createGateTask({
      playerId: row.player_id,
      triggerRuleId: "gate_progression_nudge",
      title: `Almost complete: ${playerName} — ${gateLabel} (${progressPct}%)`,
      titleAr: `شبه مكتمل: ${playerNameAr} — ${gateLabelAr} (${progressPct}%)`,
      description:
        `${playerName}'s ${gateLabel} is ${progressPct}% complete (${completed}/${total} items). ` +
        `${mandatoryLeft > 0 ? `${mandatoryLeft} mandatory item(s) remaining. ` : "All mandatory items satisfied. "}` +
        `${mandatoryLeft === 0 ? "Gate is ready to be advanced to Completed." : "Complete remaining items to advance."}`,
      descriptionAr:
        `${gateLabelAr} لـ ${playerNameAr} مكتمل بنسبة ${progressPct}% (${completed}/${total} عناصر). ` +
        `${mandatoryLeft > 0 ? `${mandatoryLeft} عنصر(عناصر) إلزامي(ة) متبقي(ة). ` : "جميع العناصر الإلزامية مستوفاة. "}` +
        `${mandatoryLeft === 0 ? "البوابة جاهزة للتقدم إلى مكتمل." : "إكمال العناصر المتبقية للتقدم."}`,
      priority: mandatoryLeft === 0 ? "high" : "medium",
      dueDays: 3,
      assignedTo: row.agent_id || row.coach_id || null,
    });

    if (created) {
      tasksCreated++;

      // If all mandatory items done, notify management
      if (mandatoryLeft === 0) {
        await notifyByRole(["Admin", "Manager"], {
          type: "system",
          title: `Gate ready: ${playerName} — ${gateLabel}`,
          titleAr: `بوابة جاهزة: ${playerNameAr} — ${gateLabelAr}`,
          body: `${progressPct}% complete. All mandatory items satisfied. Awaiting approval to advance.`,
          bodyAr: `${progressPct}% مكتمل. جميع العناصر الإلزامية مستوفاة. بانتظار الموافقة للتقدم.`,
          link: `/dashboard/players/${row.player_id}`,
          sourceType: "player",
          sourceId: row.player_id,
          priority: "normal",
        });
      }
    }
  }

  // Count total InProgress gates
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM gates WHERE status = 'InProgress'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    gatesChecked: Number(countRow?.cnt ?? 0),
    almostDone: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: Clearance Follow-up (daily — 10:00 AM)
//
// Processing-status clearances idle for 7+ days.
// Creates task to finalize or escalate.
// ══════════════════════════════════════════════════════════════

export async function checkClearanceFollowups(): Promise<{
  clearancesChecked: number;
  stale: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { clearancesChecked: 0, stale: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.clearanceStaleDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      cl.id AS clearance_id,
      cl.clearance_number,
      cl.player_id,
      cl.contract_id,
      cl.reason,
      cl.has_outstanding,
      cl.outstanding_amount,
      cl.outstanding_currency,
      cl.created_at,
      cl.updated_at,
      cl.created_by,
      EXTRACT(DAY FROM NOW() - cl.updated_at) AS days_idle,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id
    FROM clearances cl
    JOIN players p ON p.id = cl.player_id
    WHERE cl.status = 'Processing'
      AND cl.updated_at < :cutoff
    ORDER BY cl.updated_at ASC
    `,
    {
      replacements: { cutoff: cutoff.toISOString() },
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
    const clearanceNum = row.clearance_number || row.clearance_id.slice(0, 8);

    const created = await createGateTask({
      playerId: row.player_id,
      triggerRuleId: "clearance_stale",
      title: `Stale clearance: ${playerName} — #${clearanceNum} (${daysIdle}d)`,
      titleAr: `إخلاء طرف متوقف: ${playerNameAr} — #${clearanceNum} (${daysIdle} يوم)`,
      description:
        `Clearance #${clearanceNum} for ${playerName} has been in Processing status for ${daysIdle} days. ` +
        `${row.reason ? `Reason: ${row.reason}. ` : ""}` +
        `${row.has_outstanding ? `Outstanding amount: ${Number(row.outstanding_amount).toLocaleString()} ${row.outstanding_currency}. ` : ""}` +
        `Finalize the clearance or escalate outstanding issues.`,
      descriptionAr:
        `إخلاء الطرف #${clearanceNum} لـ ${playerNameAr} في حالة معالجة منذ ${daysIdle} يوم. ` +
        `${row.reason ? `السبب: ${row.reason}. ` : ""}` +
        `${row.has_outstanding ? `مبلغ مستحق: ${Number(row.outstanding_amount).toLocaleString()} ${row.outstanding_currency}. ` : ""}` +
        `إنهاء إخلاء الطرف أو تصعيد المسائل المعلقة.`,
      priority: daysIdle >= _config.clearanceStaleDays * 2 ? "high" : "medium",
      dueDays: 2,
      assignedTo: row.created_by || row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Legal"], {
        type: "system",
        title: `Stale clearance: ${playerName} — ${daysIdle}d idle`,
        titleAr: `إخلاء طرف متوقف: ${playerNameAr} — ${daysIdle} يوم`,
        body: `Clearance #${clearanceNum} pending since ${daysIdle} days.${row.has_outstanding ? ` Outstanding: ${Number(row.outstanding_amount).toLocaleString()} ${row.outstanding_currency}.` : ""}`,
        bodyAr: `إخلاء الطرف #${clearanceNum} معلق منذ ${daysIdle} يوم.${row.has_outstanding ? ` مستحقات: ${Number(row.outstanding_amount).toLocaleString()} ${row.outstanding_currency}.` : ""}`,
        link: "/dashboard/clearances",
        sourceType: "clearance",
        sourceId: row.clearance_id,
        priority: "high",
      });
    }
  }

  // Count total Processing clearances
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM clearances WHERE status = 'Processing'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    clearancesChecked: Number(countRow?.cnt ?? 0),
    stale: rows.length,
    tasksCreated,
  };
}
