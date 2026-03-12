// ═══════════════════════════════════════════════════════════════
// Training & Development Engine
//
// Automates training oversight: stale enrollments, workout
// adherence, body metric target deadlines, diet compliance,
// and players without active training plans.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "../../config/database";
import { logger } from "../../config/logger";
import { Task } from "../../modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "../../modules/notifications/notification.service";

// ── Configurable thresholds (loaded from app_settings) ──

export interface TrainingDevConfig {
  enabled: boolean;
  // training-enrollment-stale
  enrollmentStaleDays: number; // days without activity before flagging (default 14)
  // workout-adherence-check
  workoutNoLogDays: number; // days with no workout log to flag (default 7)
  // body-metric-target-deadline
  targetDeadlineWarningDays: number; // days before deadline to warn (default 14)
  // diet-adherence-monitor
  dietAdherenceMinPct: number; // minimum adherence % over past 7 days (default 50)
  // training-no-plan
  noPlanCheckEnabled: boolean; // whether to flag players with no active plan
}

const DEFAULT_CONFIG: TrainingDevConfig = {
  enabled: true,
  enrollmentStaleDays: 14,
  workoutNoLogDays: 7,
  targetDeadlineWarningDays: 14,
  dietAdherenceMinPct: 50,
  noPlanCheckEnabled: true,
};

let _config: TrainingDevConfig = { ...DEFAULT_CONFIG };

export function getTrainingDevConfig(): TrainingDevConfig {
  return _config;
}

export async function loadTrainingDevConfig(): Promise<void> {
  try {
    const [rows]: any = await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'training_dev_config' LIMIT 1`,
    );
    if (rows.length) {
      _config = { ...DEFAULT_CONFIG, ...JSON.parse(rows[0].value) };
      logger.info("[TrainingDevEngine] Config loaded from DB");
    }
  } catch {
    logger.warn("[TrainingDevEngine] Using default config");
  }
}

export async function saveTrainingDevConfig(
  patch: Partial<TrainingDevConfig>,
): Promise<TrainingDevConfig> {
  _config = { ..._config, ...patch };
  await sequelize.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('training_dev_config', :val, NOW())
     ON CONFLICT (key) DO UPDATE SET value = :val, updated_at = NOW()`,
    { replacements: { val: JSON.stringify(_config) } },
  );
  return _config;
}

// ── Helper: get task rule config ──

async function getRuleConfig(
  ruleId: string,
): Promise<{ enabled: boolean; dueDays: number; threshold?: number } | null> {
  try {
    const [rows]: any = await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'task_rule_config' LIMIT 1`,
    );
    if (!rows.length) return null;
    const all = JSON.parse(rows[0].value);
    return all[ruleId] ?? null;
  } catch {
    return null;
  }
}

// ── Helper: create training task with dedup ──

async function createTrainingTask(opts: {
  playerId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  priority: "low" | "medium" | "high" | "critical";
  dueInDays: number;
  triggerRuleId: string;
}): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [existing]: any = await sequelize.query(
    `SELECT id FROM tasks
     WHERE player_id = :playerId
       AND trigger_rule_id = :ruleId
       AND created_at > :since
       AND status NOT IN ('Completed', 'Canceled')
     LIMIT 1`,
    {
      replacements: {
        playerId: opts.playerId,
        ruleId: opts.triggerRuleId,
        since: sevenDaysAgo.toISOString(),
      },
    },
  );

  if (existing.length) return false;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + opts.dueInDays);

  await Task.create({
    title: opts.title,
    titleAr: opts.titleAr,
    description: opts.description,
    type: "General",
    status: "Open",
    priority: opts.priority,
    playerId: opts.playerId,
    dueDate: dueDate.toISOString().split("T")[0],
    triggerRuleId: opts.triggerRuleId,
    isAutoCreated: true,
  });

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Training Enrollment Staleness
//
// Flags enrollments (NotStarted / InProgress) with no activity
// in the last N days.
// ══════════════════════════════════════════════════════════════

export async function checkEnrollmentStaleness(): Promise<{
  flagged: number;
}> {
  if (!_config.enabled) return { flagged: 0 };

  const rule = await getRuleConfig("enrollment_stale");
  if (rule && !rule.enabled) return { flagged: 0 };
  const dueDays = rule?.dueDays ?? 5;
  const staleDays = rule?.threshold ?? _config.enrollmentStaleDays;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  const stale: any[] = await sequelize.query(
    `SELECT te.id, te.player_id, te.course_id, te.status, te.progress_pct,
            te.enrolled_at, tc.title, tc.title_ar,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     FROM training_enrollments te
     JOIN training_courses tc ON tc.id = te.course_id
     JOIN players p ON p.id = te.player_id
     WHERE te.status IN ('NotStarted', 'InProgress')
       AND p.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM training_activities ta
         WHERE ta.enrollment_id = te.id
           AND ta.created_at > :cutoff
       )
       AND te.updated_at < :cutoff`,
    { replacements: { cutoff: cutoff.toISOString() }, type: "SELECT" as any },
  );

  let flagged = 0;

  for (const row of stale) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;
    const course = row.title || "Unknown Course";
    const courseAr = row.title_ar || course;

    const created = await createTrainingTask({
      playerId: row.player_id,
      title: `Stale training: ${name} — "${course}" (${row.progress_pct}%)`,
      titleAr: `تدريب متوقف: ${nameAr} — "${courseAr}" (${row.progress_pct}%)`,
      description: `${name} has not engaged with course "${course}" for ${staleDays}+ days. Status: ${row.status}, Progress: ${row.progress_pct}%.`,
      descriptionAr: `لم يتفاعل ${nameAr} مع الدورة "${courseAr}" لأكثر من ${staleDays} يوم. الحالة: ${row.status}، التقدم: ${row.progress_pct}%.`,
      priority: row.status === "NotStarted" ? "medium" : "low",
      dueInDays: dueDays,
      triggerRuleId: "enrollment_stale",
    });

    if (created) {
      flagged++;
      await notifyByRole(["Admin", "Coach"], {
        type: "task",
        title: `Stale enrollment: ${name} — "${course}"`,
        titleAr: `تسجيل متوقف: ${nameAr} — "${courseAr}"`,
        body: `No activity for ${staleDays}+ days. Progress: ${row.progress_pct}%`,
        link: "/dashboard/training",
        sourceType: "training",
        sourceId: row.id,
        priority: "normal",
      });
    }
  }

  logger.info(`[TrainingDevEngine] enrollment-stale: flagged ${flagged}`);
  return { flagged };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Workout Adherence Check
//
// Flags active workout assignments where the player hasn't
// logged any sessions in the last N days.
// ══════════════════════════════════════════════════════════════

export async function checkWorkoutAdherence(): Promise<{ flagged: number }> {
  if (!_config.enabled) return { flagged: 0 };

  const rule = await getRuleConfig("workout_adherence");
  if (rule && !rule.enabled) return { flagged: 0 };
  const dueDays = rule?.dueDays ?? 3;
  const noLogDays = rule?.threshold ?? _config.workoutNoLogDays;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - noLogDays);

  const inactive: any[] = await sequelize.query(
    `SELECT wa.id, wa.player_id, wa.plan_id, wa.completion_pct,
            wa.start_date, wa.end_date,
            wp.name_en, wp.name_ar,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     FROM workout_assignments wa
     JOIN workout_plans wp ON wp.id = wa.plan_id
     JOIN players p ON p.id = wa.player_id
     WHERE wa.status = 'active'
       AND p.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM workout_logs wl
         WHERE wl.assignment_id = wa.id
           AND wl.created_at > :cutoff
       )`,
    { replacements: { cutoff: cutoff.toISOString() }, type: "SELECT" as any },
  );

  let flagged = 0;

  for (const row of inactive) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;
    const plan = row.name_en || "Workout Plan";
    const planAr = row.name_ar || plan;

    const created = await createTrainingTask({
      playerId: row.player_id,
      title: `No workout logs: ${name} — "${plan}" (${row.completion_pct}%)`,
      titleAr: `لا سجلات تمرين: ${nameAr} — "${planAr}" (${row.completion_pct}%)`,
      description: `${name} has not logged any workout sessions for "${plan}" in ${noLogDays}+ days. Completion: ${row.completion_pct}%.`,
      descriptionAr: `لم يسجل ${nameAr} أي جلسات تمرين لـ "${planAr}" لأكثر من ${noLogDays} يوم. الإنجاز: ${row.completion_pct}%.`,
      priority: "medium",
      dueInDays: dueDays,
      triggerRuleId: "workout_adherence",
    });

    if (created) {
      flagged++;
      if (row.assigned_by) {
        await notifyUser(row.assigned_by, {
          type: "task",
          title: `Workout adherence alert: ${name}`,
          titleAr: `تنبيه التزام التمرين: ${nameAr}`,
          body: `No logs for ${noLogDays}+ days on "${plan}"`,
          link: "/dashboard/gym",
          sourceType: "workout",
          sourceId: row.id,
          priority: "normal",
        });
      }
    }
  }

  logger.info(`[TrainingDevEngine] workout-adherence: flagged ${flagged}`);
  return { flagged };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Body Metric Target Deadline
//
// Flags active metric targets approaching or past their deadline.
// ══════════════════════════════════════════════════════════════

export async function checkMetricTargetDeadlines(): Promise<{
  approaching: number;
  overdue: number;
}> {
  if (!_config.enabled) return { approaching: 0, overdue: 0 };

  const rule = await getRuleConfig("metric_target_deadline");
  if (rule && !rule.enabled) return { approaching: 0, overdue: 0 };
  const dueDays = rule?.dueDays ?? 3;
  const warningDays = rule?.threshold ?? _config.targetDeadlineWarningDays;

  const today = new Date().toISOString().split("T")[0];
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  const warningStr = warningDate.toISOString().split("T")[0];

  // Approaching deadline (within warning window, not overdue)
  const approaching: any[] = await sequelize.query(
    `SELECT mt.id, mt.player_id, mt.deadline,
            mt.target_weight, mt.target_body_fat, mt.target_muscle_mass,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     FROM metric_targets mt
     JOIN players p ON p.id = mt.player_id
     WHERE mt.status = 'active'
       AND mt.deadline IS NOT NULL
       AND mt.deadline >= :today
       AND mt.deadline <= :warningDate`,
    {
      replacements: { today, warningDate: warningStr },
      type: "SELECT" as any,
    },
  );

  let approachCount = 0;

  for (const row of approaching) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;

    const targets: string[] = [];
    if (row.target_weight) targets.push(`Weight: ${row.target_weight}kg`);
    if (row.target_body_fat) targets.push(`Body fat: ${row.target_body_fat}%`);
    if (row.target_muscle_mass)
      targets.push(`Muscle mass: ${row.target_muscle_mass}kg`);
    const targetStr = targets.join(", ") || "targets set";

    const daysLeft = Math.ceil(
      (new Date(row.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const created = await createTrainingTask({
      playerId: row.player_id,
      title: `Fitness target deadline in ${daysLeft}d: ${name}`,
      titleAr: `موعد هدف اللياقة خلال ${daysLeft} يوم: ${nameAr}`,
      description: `${name}'s fitness target deadline is ${row.deadline}. ${targetStr}.`,
      descriptionAr: `موعد هدف اللياقة لـ ${nameAr} هو ${row.deadline}. ${targetStr}.`,
      priority: daysLeft <= 3 ? "high" : "medium",
      dueInDays: dueDays,
      triggerRuleId: "metric_target_deadline",
    });

    if (created) approachCount++;
  }

  // Overdue targets
  const overdue: any[] = await sequelize.query(
    `SELECT mt.id, mt.player_id, mt.deadline,
            mt.target_weight, mt.target_body_fat, mt.target_muscle_mass,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     FROM metric_targets mt
     JOIN players p ON p.id = mt.player_id
     WHERE mt.status = 'active'
       AND mt.deadline IS NOT NULL
       AND mt.deadline < :today`,
    { replacements: { today }, type: "SELECT" as any },
  );

  let overdueCount = 0;

  for (const row of overdue) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(row.deadline).getTime()) / (1000 * 60 * 60 * 24),
    );

    const created = await createTrainingTask({
      playerId: row.player_id,
      title: `Overdue fitness target (${daysOverdue}d): ${name}`,
      titleAr: `هدف لياقة متأخر (${daysOverdue} يوم): ${nameAr}`,
      description: `${name}'s fitness target was due ${row.deadline} (${daysOverdue} days ago). Review and update target status.`,
      descriptionAr: `كان موعد هدف اللياقة لـ ${nameAr} في ${row.deadline} (منذ ${daysOverdue} يوم). راجع وحدّث حالة الهدف.`,
      priority: "high",
      dueInDays: dueDays,
      triggerRuleId: "metric_target_deadline",
    });

    if (created) {
      overdueCount++;
      await notifyByRole(["Admin", "Coach"], {
        type: "task",
        title: `Overdue fitness target: ${name}`,
        titleAr: `هدف لياقة متأخر: ${nameAr}`,
        body: `Deadline was ${row.deadline} — ${daysOverdue} days overdue`,
        link: "/dashboard/gym",
        sourceType: "metric_target",
        sourceId: row.id,
        priority: "high",
      });
    }
  }

  logger.info(
    `[TrainingDevEngine] metric-target-deadline: approaching=${approachCount}, overdue=${overdueCount}`,
  );
  return { approaching: approachCount, overdue: overdueCount };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Diet Adherence Monitor
//
// Checks diet adherence over the past 7 days for players with
// active diet plans. Flags players below the minimum threshold.
// ══════════════════════════════════════════════════════════════

export async function checkDietAdherence(): Promise<{ flagged: number }> {
  if (!_config.enabled) return { flagged: 0 };

  const rule = await getRuleConfig("diet_adherence_low");
  if (rule && !rule.enabled) return { flagged: 0 };
  const dueDays = rule?.dueDays ?? 3;
  const minPct = rule?.threshold ?? _config.dietAdherenceMinPct;

  // Get active diet plans with their expected daily meal count
  // and actual adherence logs over past 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const lowAdherence: any[] = await sequelize.query(
    `WITH plan_meals AS (
       SELECT dp.id AS plan_id, dp.player_id,
              COUNT(DISTINCT dm.id) AS meals_per_day
       FROM diet_plans dp
       JOIN diet_meals dm ON dm.plan_id = dp.id
       WHERE dp.status = 'active'
         AND dp.player_id IS NOT NULL
       GROUP BY dp.id, dp.player_id
     ),
     adherence_count AS (
       SELECT da.plan_id, da.player_id,
              COUNT(*) AS logged_meals
       FROM diet_adherence da
       WHERE da.date >= :weekAgo
       GROUP BY da.plan_id, da.player_id
     )
     SELECT pm.plan_id, pm.player_id,
            pm.meals_per_day,
            COALESCE(ac.logged_meals, 0) AS logged_meals,
            (pm.meals_per_day * 7) AS expected_meals,
            CASE WHEN pm.meals_per_day * 7 > 0
              THEN ROUND(COALESCE(ac.logged_meals, 0)::numeric / (pm.meals_per_day * 7) * 100)
              ELSE 0
            END AS adherence_pct,
            dp.name_en, dp.name_ar,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
     FROM plan_meals pm
     JOIN diet_plans dp ON dp.id = pm.plan_id
     JOIN players p ON p.id = pm.player_id
     LEFT JOIN adherence_count ac ON ac.plan_id = pm.plan_id AND ac.player_id = pm.player_id
     WHERE p.status = 'active'
       AND pm.meals_per_day > 0
       AND CASE WHEN pm.meals_per_day * 7 > 0
             THEN COALESCE(ac.logged_meals, 0)::numeric / (pm.meals_per_day * 7) * 100
             ELSE 0
           END < :minPct`,
    {
      replacements: { weekAgo: weekAgoStr, minPct },
      type: "SELECT" as any,
    },
  );

  let flagged = 0;

  for (const row of lowAdherence) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;
    const plan = row.name_en || "Diet Plan";
    const planAr = row.name_ar || plan;
    const pct = Number(row.adherence_pct);

    const created = await createTrainingTask({
      playerId: row.player_id,
      title: `Low diet adherence (${pct}%): ${name}`,
      titleAr: `التزام غذائي منخفض (${pct}%): ${nameAr}`,
      description: `${name}'s diet adherence for "${plan}" is ${pct}% over the past 7 days (${row.logged_meals}/${row.expected_meals} meals). Minimum threshold: ${minPct}%.`,
      descriptionAr: `التزام ${nameAr} بالنظام الغذائي "${planAr}" هو ${pct}% خلال الأيام السبعة الماضية (${row.logged_meals}/${row.expected_meals} وجبة). الحد الأدنى: ${minPct}%.`,
      priority: pct === 0 ? "high" : "medium",
      dueInDays: dueDays,
      triggerRuleId: "diet_adherence_low",
    });

    if (created) {
      flagged++;
      await notifyByRole(["Coach"], {
        type: "task",
        title: `Low diet adherence: ${name} (${pct}%)`,
        titleAr: `التزام غذائي منخفض: ${nameAr} (${pct}%)`,
        body: `${row.logged_meals}/${row.expected_meals} meals logged in past 7 days`,
        link: "/dashboard/gym",
        sourceType: "diet_plan",
        sourceId: row.plan_id,
        priority: "normal",
      });
    }
  }

  logger.info(`[TrainingDevEngine] diet-adherence: flagged ${flagged}`);
  return { flagged };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: No Active Training Plan
//
// Flags active players who have no active training enrollment
// AND no active workout assignment.
// ══════════════════════════════════════════════════════════════

export async function checkNoTrainingPlan(): Promise<{ flagged: number }> {
  if (!_config.enabled || !_config.noPlanCheckEnabled) return { flagged: 0 };

  const rule = await getRuleConfig("no_training_plan");
  if (rule && !rule.enabled) return { flagged: 0 };
  const dueDays = rule?.dueDays ?? 5;

  const unplanned: any[] = await sequelize.query(
    `SELECT p.id AS player_id,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            p.player_type
     FROM players p
     WHERE p.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM training_enrollments te
         WHERE te.player_id = p.id
           AND te.status IN ('NotStarted', 'InProgress')
       )
       AND NOT EXISTS (
         SELECT 1 FROM workout_assignments wa
         WHERE wa.player_id = p.id
           AND wa.status = 'active'
       )`,
    { type: "SELECT" as any },
  );

  let flagged = 0;

  for (const row of unplanned) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;

    const created = await createTrainingTask({
      playerId: row.player_id,
      title: `No active training plan: ${name}`,
      titleAr: `لا توجد خطة تدريب نشطة: ${nameAr}`,
      description: `${name} (${row.player_type}) has no active training enrollment or workout assignment. Consider assigning a development plan.`,
      descriptionAr: `${nameAr} (${row.player_type}) ليس لديه أي تسجيل تدريب نشط أو تعيين تمرين. يُنصح بتعيين خطة تطوير.`,
      priority: "low",
      dueInDays: dueDays,
      triggerRuleId: "no_training_plan",
    });

    if (created) flagged++;
  }

  if (flagged > 0) {
    await notifyByRole(["Admin", "Coach"], {
      type: "task",
      title: `${flagged} player(s) without training plan`,
      titleAr: `${flagged} لاعب(ين) بدون خطة تدريب`,
      body: `${flagged} active players have no training or workout assignment`,
      link: "/dashboard/training",
      sourceType: "system",
      sourceId: "no-training-plan-check",
      priority: "low",
    });
  }

  logger.info(`[TrainingDevEngine] no-training-plan: flagged ${flagged}`);
  return { flagged };
}
