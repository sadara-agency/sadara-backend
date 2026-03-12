// ═══════════════════════════════════════════════════════════════
// Scouting Pipeline Engine
//
// Automates scouting workflow oversight: watchlist staleness,
// incomplete screening cases, unrated prospects, deferred
// decision follow-ups, and approved-but-not-actioned decisions.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { Task } from "@modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";

// ── Configurable thresholds (loaded from app_settings) ──

export interface ScoutingPipelineConfig {
  enabled: boolean;
  // watchlist-staleness
  watchlistStaleDays: number; // days Active without update to flag (default 30)
  // screening-incomplete
  screeningIncompleteDays: number; // days InProgress without advancement (default 14)
  // prospect-unrated
  unratedAlertDays: number; // days on watchlist without all 4 ratings (default 7)
  // deferred-decision-followup
  deferredFollowupDays: number; // days after Deferred decision to re-review (default 30)
  // approved-not-actioned
  approvedActionDays: number; // days after Approved decision without next step (default 14)
}

const DEFAULT_CONFIG: ScoutingPipelineConfig = {
  enabled: true,
  watchlistStaleDays: 30,
  screeningIncompleteDays: 14,
  unratedAlertDays: 7,
  deferredFollowupDays: 30,
  approvedActionDays: 14,
};

let _config: ScoutingPipelineConfig = { ...DEFAULT_CONFIG };

export function getScoutingPipelineConfig(): ScoutingPipelineConfig {
  return { ..._config };
}

/** Load config from app_settings (called once at startup) */
export async function loadScoutingPipelineConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'scouting_pipeline_config' LIMIT 1`,
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
export async function saveScoutingPipelineConfig(
  updates: Partial<ScoutingPipelineConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('scouting_pipeline_config', :val)
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
 * Creates a scouting task with 7-day deduplication.
 * Uses playerId = null since prospects are not yet players.
 * Dedup uses triggerRuleId + a reference ID (watchlist/screening/decision).
 */
async function createScoutingTask(opts: {
  referenceId: string;
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

  // Dedup on triggerRuleId + notes containing reference ID (no playerId for prospects)
  const existing = await Task.findOne({
    where: sequelize.literal(`
      trigger_rule_id = '${opts.triggerRuleId}'
      AND is_auto_created = true
      AND created_at > '${sevenDaysAgo.toISOString()}'
      AND status NOT IN ('Completed', 'Canceled')
      AND description LIKE '%${opts.referenceId}%'
    `),
  });
  if (existing) return false;

  await Task.create({
    title: opts.title,
    titleAr: opts.titleAr,
    description: opts.description + ` [ref:${opts.referenceId}]`,
    type: "General",
    priority: opts.priority,
    status: "Open",
    playerId: null,
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
      logger.warn("[ScoutingEngine] notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Watchlist Staleness Detector (weekly — Wednesday 10 AM)
//
// Active watchlist prospects that haven't been updated in 30+
// days. Prompts scouts to review, advance to screening, or
// archive if no longer viable.
// ══════════════════════════════════════════════════════════════

export async function checkWatchlistStaleness(): Promise<{
  activeProspects: number;
  stale: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { activeProspects: 0, stale: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.watchlistStaleDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      w.id AS watchlist_id,
      w.prospect_name,
      w.prospect_name_ar,
      w.position,
      w.current_club,
      w.current_league,
      w.priority,
      w.scouted_by,
      w.video_clips,
      w.updated_at,
      EXTRACT(DAY FROM NOW() - w.updated_at) AS days_idle,
      -- Check if screening exists
      (SELECT COUNT(*) FROM screening_cases sc WHERE sc.watchlist_id = w.id) AS screening_count
    FROM watchlists w
    WHERE w.status = 'Active'
      AND w.updated_at < :cutoff
    ORDER BY w.updated_at ASC
    `,
    {
      replacements: { cutoff: cutoff.toISOString() },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const name = row.prospect_name;
    const nameAr = row.prospect_name_ar || name;
    const daysIdle = Math.round(Number(row.days_idle));
    const hasScreening = Number(row.screening_count) > 0;

    const created = await createScoutingTask({
      referenceId: row.watchlist_id,
      triggerRuleId: "watchlist_stale",
      title: `Stale prospect: ${name} — ${daysIdle}d without update`,
      titleAr: `مرشح متوقف: ${nameAr} — ${daysIdle} يوم بدون تحديث`,
      description:
        `Prospect ${name} (${row.position || "N/A"}, ${row.current_club || "Unknown"}) ` +
        `has been on the Active watchlist for ${daysIdle} days without updates. ` +
        `Priority: ${row.priority}. Video clips: ${row.video_clips}. ` +
        `${hasScreening ? "Screening case exists — review progress." : "No screening case yet — initiate or archive."}`,
      descriptionAr:
        `المرشح ${nameAr} (${row.position || "غير محدد"}, ${row.current_club || "غير معروف"}) ` +
        `على قائمة المراقبة النشطة منذ ${daysIdle} يوم بدون تحديثات. ` +
        `الأولوية: ${row.priority}. مقاطع فيديو: ${row.video_clips}. ` +
        `${hasScreening ? "يوجد ملف فحص — مراجعة التقدم." : "لا يوجد ملف فحص — البدء أو الأرشفة."}`,
      priority: row.priority === "High" ? "high" : "medium",
      dueDays: 5,
      assignedTo: row.scouted_by || null,
    });

    if (created) tasksCreated++;
  }

  // Count total active
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM watchlists WHERE status = 'Active'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    activeProspects: Number(countRow?.cnt ?? 0),
    stale: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Screening Case Incomplete (weekly — Wednesday 10:30 AM)
//
// InProgress screening cases idle for 14+ days with missing
// required checks (identity, passport, age, medical, fit/risk).
// ══════════════════════════════════════════════════════════════

export async function checkScreeningIncomplete(): Promise<{
  casesChecked: number;
  incomplete: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { casesChecked: 0, incomplete: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.screeningIncompleteDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      sc.id AS case_id,
      sc.case_number,
      sc.status,
      sc.identity_check,
      sc.passport_verified,
      sc.age_verified,
      sc.medical_clearance,
      sc.fit_assessment,
      sc.risk_assessment,
      sc.baseline_stats,
      sc.is_pack_ready,
      sc.created_by,
      sc.updated_at,
      EXTRACT(DAY FROM NOW() - sc.updated_at) AS days_idle,
      w.prospect_name,
      w.prospect_name_ar,
      w.position,
      w.scouted_by
    FROM screening_cases sc
    JOIN watchlists w ON w.id = sc.watchlist_id
    WHERE sc.status = 'InProgress'
      AND sc.updated_at < :cutoff
    ORDER BY sc.updated_at ASC
    `,
    {
      replacements: { cutoff: cutoff.toISOString() },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const name = row.prospect_name;
    const nameAr = row.prospect_name_ar || name;
    const daysIdle = Math.round(Number(row.days_idle));

    // Identify missing checks
    const missing: string[] = [];
    const missingAr: string[] = [];
    if (row.identity_check !== "Verified") {
      missing.push("Identity verification");
      missingAr.push("التحقق من الهوية");
    }
    if (!row.passport_verified) {
      missing.push("Passport");
      missingAr.push("جواز السفر");
    }
    if (!row.age_verified) {
      missing.push("Age verification");
      missingAr.push("التحقق من العمر");
    }
    if (!row.medical_clearance) {
      missing.push("Medical clearance");
      missingAr.push("التصريح الطبي");
    }
    if (!row.fit_assessment) {
      missing.push("Fit assessment");
      missingAr.push("تقييم اللياقة");
    }
    if (!row.risk_assessment) {
      missing.push("Risk assessment");
      missingAr.push("تقييم المخاطر");
    }

    const created = await createScoutingTask({
      referenceId: row.case_id,
      triggerRuleId: "screening_incomplete",
      title: `Incomplete screening: ${name} — Case #${row.case_number}`,
      titleAr: `فحص غير مكتمل: ${nameAr} — ملف #${row.case_number}`,
      description:
        `Screening case #${row.case_number} for ${name} (${row.position || "N/A"}) ` +
        `has been InProgress for ${daysIdle} days. ` +
        `Missing: ${missing.length > 0 ? missing.join(", ") : "None — ready for pack preparation"}. ` +
        `Complete remaining checks or advance to PackReady.`,
      descriptionAr:
        `ملف الفحص #${row.case_number} لـ ${nameAr} (${row.position || "غير محدد"}) ` +
        `قيد التنفيذ منذ ${daysIdle} يوم. ` +
        `المفقود: ${missingAr.length > 0 ? missingAr.join("، ") : "لا شيء — جاهز لإعداد الحزمة"}. ` +
        `إكمال الفحوصات المتبقية أو التقدم لحالة الحزمة الجاهزة.`,
      priority: missing.length >= 3 ? "high" : "medium",
      dueDays: 3,
      assignedTo: row.created_by || row.scouted_by || null,
    });

    if (created) tasksCreated++;
  }

  // Count total InProgress
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM screening_cases WHERE status = 'InProgress'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    casesChecked: Number(countRow?.cnt ?? 0),
    incomplete: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Prospect Unrated Alert (weekly — Monday 11:30 AM)
//
// Active/Shortlisted prospects missing any of the 4 ratings
// (technical, physical, mental, potential) after 7+ days.
// ══════════════════════════════════════════════════════════════

export async function checkProspectUnrated(): Promise<{
  prospectsChecked: number;
  unrated: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { prospectsChecked: 0, unrated: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.unratedAlertDays);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      w.id AS watchlist_id,
      w.prospect_name,
      w.prospect_name_ar,
      w.position,
      w.current_club,
      w.priority,
      w.scouted_by,
      w.technical_rating,
      w.physical_rating,
      w.mental_rating,
      w.potential_rating,
      w.created_at
    FROM watchlists w
    WHERE w.status IN ('Active', 'Shortlisted')
      AND w.created_at < :cutoff
      AND (
        w.technical_rating IS NULL
        OR w.physical_rating IS NULL
        OR w.mental_rating IS NULL
        OR w.potential_rating IS NULL
      )
    ORDER BY w.created_at ASC
    `,
    {
      replacements: { cutoff: cutoff.toISOString() },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const name = row.prospect_name;
    const nameAr = row.prospect_name_ar || name;

    const missingRatings: string[] = [];
    const missingRatingsAr: string[] = [];
    if (row.technical_rating == null) {
      missingRatings.push("Technical");
      missingRatingsAr.push("فني");
    }
    if (row.physical_rating == null) {
      missingRatings.push("Physical");
      missingRatingsAr.push("بدني");
    }
    if (row.mental_rating == null) {
      missingRatings.push("Mental");
      missingRatingsAr.push("ذهني");
    }
    if (row.potential_rating == null) {
      missingRatings.push("Potential");
      missingRatingsAr.push("إمكانات");
    }

    const created = await createScoutingTask({
      referenceId: row.watchlist_id,
      triggerRuleId: "prospect_unrated",
      title: `Unrated prospect: ${name} — missing ${missingRatings.join(", ")}`,
      titleAr: `مرشح بدون تقييم: ${nameAr} — مفقود ${missingRatingsAr.join("، ")}`,
      description:
        `Prospect ${name} (${row.position || "N/A"}, ${row.current_club || "Unknown"}) ` +
        `is missing ${missingRatings.length} rating(s): ${missingRatings.join(", ")}. ` +
        `Complete the scouting assessment to enable proper evaluation.`,
      descriptionAr:
        `المرشح ${nameAr} (${row.position || "غير محدد"}, ${row.current_club || "غير معروف"}) ` +
        `ينقصه ${missingRatings.length} تقييم(ات): ${missingRatingsAr.join("، ")}. ` +
        `إكمال تقييم الاستكشاف لتمكين التقييم الصحيح.`,
      priority: missingRatings.length >= 3 ? "high" : "medium",
      dueDays: 3,
      assignedTo: row.scouted_by || null,
    });

    if (created) tasksCreated++;
  }

  return {
    prospectsChecked: rows.length,
    unrated: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Deferred Decision Follow-up (weekly — Friday 11 AM)
//
// Selection decisions with "Deferred" status older than 30
// days. Prompts committee to revisit the case.
// ══════════════════════════════════════════════════════════════

export async function checkDeferredDecisions(): Promise<{
  deferredTotal: number;
  overdue: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { deferredTotal: 0, overdue: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.deferredFollowupDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const rows: any[] = await sequelize.query(
    `
    SELECT
      sd.id AS decision_id,
      sd.screening_case_id,
      sd.committee_name,
      sd.decision_date,
      sd.rationale,
      sd.conditions,
      sd.recorded_by,
      (CURRENT_DATE - sd.decision_date::date) AS days_since,
      sc.case_number,
      w.prospect_name,
      w.prospect_name_ar,
      w.position,
      w.scouted_by
    FROM selection_decisions sd
    JOIN screening_cases sc ON sc.id = sd.screening_case_id
    JOIN watchlists w ON w.id = sc.watchlist_id
    WHERE sd.decision = 'Deferred'
      AND sd.decision_date < :cutoff
      AND sc.status != 'Closed'
    ORDER BY sd.decision_date ASC
    `,
    {
      replacements: { cutoff: cutoffStr },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const name = row.prospect_name;
    const nameAr = row.prospect_name_ar || name;
    const daysSince = Number(row.days_since);

    const created = await createScoutingTask({
      referenceId: row.decision_id,
      triggerRuleId: "deferred_decision_followup",
      title: `Deferred decision overdue: ${name} — ${daysSince}d ago`,
      titleAr: `قرار مؤجل متأخر: ${nameAr} — ${daysSince} يوم`,
      description:
        `Selection decision for ${name} (Case #${row.case_number}) was deferred ${daysSince} days ago ` +
        `by ${row.committee_name}. ` +
        `${row.conditions ? `Conditions: ${row.conditions}. ` : ""}` +
        `${row.rationale ? `Original rationale: ${row.rationale}. ` : ""}` +
        `Reconvene committee to make a final decision.`,
      descriptionAr:
        `تم تأجيل قرار الاختيار لـ ${nameAr} (ملف #${row.case_number}) قبل ${daysSince} يوم ` +
        `من قبل ${row.committee_name}. ` +
        `${row.conditions ? `الشروط: ${row.conditions}. ` : ""}` +
        `إعادة عقد اللجنة لاتخاذ قرار نهائي.`,
      priority:
        daysSince >= _config.deferredFollowupDays * 2 ? "high" : "medium",
      dueDays: 5,
      assignedTo: row.recorded_by || row.scouted_by || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Scout"], {
        type: "system",
        title: `Deferred decision: ${name} — ${daysSince}d overdue`,
        titleAr: `قرار مؤجل: ${nameAr} — ${daysSince} يوم تأخير`,
        body: `Case #${row.case_number}. Committee: ${row.committee_name}. Needs re-review.`,
        bodyAr: `ملف #${row.case_number}. اللجنة: ${row.committee_name}. يحتاج إعادة مراجعة.`,
        link: "/dashboard/scouting",
        sourceType: "system",
        priority: "normal",
      });
    }
  }

  // Count total deferred
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM selection_decisions WHERE decision = 'Deferred'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    deferredTotal: Number(countRow?.cnt ?? 0),
    overdue: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: Approved Not Actioned (weekly — Friday 11:30 AM)
//
// Approved selection decisions where the screening case is
// still open (not Closed) after 14+ days. Prompts to proceed
// with signing/onboarding or close the case.
// ══════════════════════════════════════════════════════════════

export async function checkApprovedNotActioned(): Promise<{
  approvedTotal: number;
  notActioned: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { approvedTotal: 0, notActioned: 0, tasksCreated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.approvedActionDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const rows: any[] = await sequelize.query(
    `
    SELECT
      sd.id AS decision_id,
      sd.screening_case_id,
      sd.committee_name,
      sd.decision_date,
      sd.decision_scope,
      sd.conditions,
      sd.recorded_by,
      (CURRENT_DATE - sd.decision_date::date) AS days_since,
      sc.case_number,
      sc.status AS case_status,
      w.prospect_name,
      w.prospect_name_ar,
      w.position,
      w.scouted_by
    FROM selection_decisions sd
    JOIN screening_cases sc ON sc.id = sd.screening_case_id
    JOIN watchlists w ON w.id = sc.watchlist_id
    WHERE sd.decision = 'Approved'
      AND sd.decision_date < :cutoff
      AND sc.status != 'Closed'
    ORDER BY sd.decision_date ASC
    `,
    {
      replacements: { cutoff: cutoffStr },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const name = row.prospect_name;
    const nameAr = row.prospect_name_ar || name;
    const daysSince = Number(row.days_since);

    const created = await createScoutingTask({
      referenceId: row.decision_id,
      triggerRuleId: "approved_not_actioned",
      title: `Approved but not actioned: ${name} — ${daysSince}d waiting`,
      titleAr: `معتمد بدون إجراء: ${nameAr} — ${daysSince} يوم انتظار`,
      description:
        `${name} (${row.position || "N/A"}) was approved (${row.decision_scope}) ` +
        `by ${row.committee_name} on ${row.decision_date} (${daysSince} days ago). ` +
        `Case #${row.case_number} is still ${row.case_status}. ` +
        `${row.conditions ? `Conditions: ${row.conditions}. ` : ""}` +
        `Proceed with signing/onboarding or close the case if circumstances changed.`,
      descriptionAr:
        `${nameAr} (${row.position || "غير محدد"}) تمت الموافقة عليه (${row.decision_scope}) ` +
        `من قبل ${row.committee_name} بتاريخ ${row.decision_date} (${daysSince} يوم). ` +
        `الملف #${row.case_number} لا يزال ${row.case_status}. ` +
        `${row.conditions ? `الشروط: ${row.conditions}. ` : ""}` +
        `المتابعة بالتوقيع/الإعداد أو إغلاق الملف إذا تغيرت الظروف.`,
      priority:
        daysSince >= _config.approvedActionDays * 2 ? "critical" : "high",
      dueDays: 3,
      assignedTo: row.recorded_by || row.scouted_by || null,
    });

    if (created) {
      tasksCreated++;

      await notifyByRole(["Admin", "Manager", "Scout"], {
        type: "system",
        title: `Approved prospect waiting: ${name} — ${daysSince}d`,
        titleAr: `مرشح معتمد بانتظار: ${nameAr} — ${daysSince} يوم`,
        body: `Approved ${daysSince}d ago by ${row.committee_name}. Case still ${row.case_status}.`,
        bodyAr: `تمت الموافقة قبل ${daysSince} يوم من ${row.committee_name}. الملف لا يزال ${row.case_status}.`,
        link: "/dashboard/scouting",
        sourceType: "system",
        priority: "high",
      });
    }
  }

  // Count total approved open
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM selection_decisions sd
     JOIN screening_cases sc ON sc.id = sd.screening_case_id
     WHERE sd.decision = 'Approved' AND sc.status != 'Closed'`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    approvedTotal: Number(countRow?.cnt ?? 0),
    notActioned: rows.length,
    tasksCreated,
  };
}
