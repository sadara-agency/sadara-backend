// ═══════════════════════════════════════════════════════════════
// Training & Development Engine
//
// Automates training oversight: stale enrollments and players
// without active training plans.
// ═══════════════════════════════════════════════════════════════

import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { Task } from "@modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
} from "@shared/utils/autoTaskHelpers";

// ── Configurable thresholds (loaded from app_settings) ──

export interface TrainingDevConfig {
  enabled: boolean;
  // training-enrollment-stale
  enrollmentStaleDays: number; // days without activity before flagging (default 14)
  // training-no-plan
  noPlanCheckEnabled: boolean; // whether to flag players with no active plan
}

const DEFAULT_CONFIG: TrainingDevConfig = {
  enabled: true,
  enrollmentStaleDays: 14,
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
// JOB 2: No Active Training Plan
//
// Flags active players who have no active training enrollment.
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
`,
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
      description: `${name} (${row.player_type}) has no active training enrollment. Consider assigning a development plan.`,
      descriptionAr: `${nameAr} (${row.player_type}) ليس لديه أي تسجيل تدريب نشط. يُنصح بتعيين خطة تطوير.`,
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
      body: `${flagged} active players have no training enrollment`,
      link: "/dashboard/training",
      sourceType: "system",
      sourceId: "no-training-plan-check",
      priority: "low",
    });
  }

  logger.info(`[TrainingDevEngine] no-training-plan: flagged ${flagged}`);
  return { flagged };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Training Course Completed
//
// Detects recently completed training enrollments and creates
// a task for the coach to review and assign next steps.
// ══════════════════════════════════════════════════════════════

export async function checkTrainingCourseCompleted(): Promise<{
  created: number;
}> {
  const rc = cfg("training_course_completed");
  if (!rc.enabled) return { created: 0 };

  // Find recently completed enrollments (within last 7 days, not already task'd)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const completedEnrollments = (await sequelize.query(
    `SELECT te.id, te.player_id, te.course_id, te.completed_at,
            tc.title, tc.title_ar,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.coach_id
     FROM training_enrollments te
     JOIN training_courses tc ON tc.id = te.course_id
     JOIN players p ON p.id = te.player_id
     WHERE te.status = 'Completed'
       AND te.completed_at >= :since
     ORDER BY te.completed_at DESC`,
    {
      replacements: { since: sevenDaysAgo.toISOString() },
      type: QueryTypes.SELECT,
    },
  )) as any[];

  let created = 0;
  for (const e of completedEnrollments) {
    const playerName = `${e.first_name} ${e.last_name}`.trim();
    const playerNameAr = e.first_name_ar
      ? `${e.first_name_ar} ${e.last_name_ar || ""}`.trim()
      : playerName;

    const assignee = e.coach_id ?? (await findUserByRole("Coach"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "training_course_completed",
        title: `Course completed: ${playerName}`,
        titleAr: `اكتمال الدورة: ${playerNameAr}`,
        description: `${playerName} completed the training course "${e.title}". Review performance and assign next course if applicable.`,
        descriptionAr: `${playerNameAr} أكمل الدورة التدريبية "${e.title_ar || e.title}". مراجعة الأداء وتعيين الدورة التالية.`,
        type: "General",
        priority: "low",
        assignedTo: assignee,
        playerId: e.player_id,
      },
      {
        roles: ["Coach"],
        link: "/dashboard/training",
      },
    );
    if (task) created++;
  }

  return { created };
}
