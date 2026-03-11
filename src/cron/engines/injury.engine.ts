// ═══════════════════════════════════════════════════════════════
// Injury Intelligence Engine
//
// Detects injury patterns the existing daily follow-up job misses:
// recurrence patterns, return-to-play protocol gaps, cumulative
// risk scoring, and post-surgery milestone tracking.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "../../config/database";
import { logger } from "../../config/logger";
import { Task } from "../../modules/tasks/task.model";
import { Referral } from "../../modules/referrals/referral.model";
import {
  notifyByRole,
  notifyUser,
} from "../../modules/notifications/notification.service";

// ── Configurable thresholds ──

export interface InjuryIntelConfig {
  enabled: boolean;
  // recurrence detector
  recurrenceWindowMonths: number; // look-back period (default 12)
  recurrenceMinCount: number; // same body part hits (default 3)
  // return-to-play validator
  returnClearanceWindowHours: number; // hours after status change (default 48)
  // injury risk scoring
  riskAgeFactor: number; // age threshold for higher risk (default 30)
  riskRecurringWeight: number; // weight for recurring injuries (default 2)
  riskRecentWeight: number; // weight for injuries in last 6 months (default 1.5)
  // post-surgery milestones
  surgeryMilestoneDays: number[]; // milestone checkpoints (default [30, 60, 90])
}

const DEFAULT_CONFIG: InjuryIntelConfig = {
  enabled: true,
  recurrenceWindowMonths: 12,
  recurrenceMinCount: 3,
  returnClearanceWindowHours: 48,
  riskAgeFactor: 30,
  riskRecurringWeight: 2,
  riskRecentWeight: 1.5,
  surgeryMilestoneDays: [30, 60, 90],
};

let _config: InjuryIntelConfig = { ...DEFAULT_CONFIG };

export function getInjuryIntelConfig(): InjuryIntelConfig {
  return { ..._config };
}

/** Load config from app_settings (called once at startup) */
export async function loadInjuryIntelConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'injury_intel_config' LIMIT 1`,
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
export async function saveInjuryIntelConfig(
  updates: Partial<InjuryIntelConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('injury_intel_config', :val)
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

async function createInjuryTask(opts: {
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
    type: "Health",
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
      logger.warn("[InjuryEngine] notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Injury Recurrence Detector (daily — 11 AM)
//
// Flags players with 3+ injuries to the same body part within
// 12 months. Creates a Medical referral + critical task.
// ══════════════════════════════════════════════════════════════

export async function checkInjuryRecurrence(): Promise<{
  playersChecked: number;
  recurring: number;
  tasksCreated: number;
  referralsCreated: number;
}> {
  if (!_config.enabled)
    return {
      playersChecked: 0,
      recurring: 0,
      tasksCreated: 0,
      referralsCreated: 0,
    };

  const windowMonths = _config.recurrenceWindowMonths;
  const minCount = _config.recurrenceMinCount;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - windowMonths);

  const rows: any[] = await sequelize.query(
    `
    SELECT
      i.player_id,
      i.body_part,
      i.body_part_ar,
      COUNT(*) AS injury_count,
      MAX(i.injury_date) AS latest_injury,
      ARRAY_AGG(DISTINCT i.injury_type ORDER BY i.injury_type) AS injury_types,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id, p.coach_id,
      p.date_of_birth
    FROM injuries i
    JOIN players p ON p.id = i.player_id
    WHERE i.injury_date >= :cutoff
      AND p.status = 'active'
    GROUP BY i.player_id, i.body_part, i.body_part_ar,
             p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
             p.agent_id, p.coach_id, p.date_of_birth
    HAVING COUNT(*) >= :minCount
    ORDER BY COUNT(*) DESC
    `,
    {
      replacements: {
        cutoff: cutoffDate.toISOString().split("T")[0],
        minCount,
      },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;
  let referralsCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const bodyPart = row.body_part;
    const bodyPartAr = row.body_part_ar || bodyPart;
    const types = (row.injury_types as string[]).join(", ");

    // Create task
    const taskCreated = await createInjuryTask({
      playerId: row.player_id,
      triggerRuleId: "injury_recurrence",
      title: `Recurring injury pattern: ${playerName} — ${bodyPart}`,
      titleAr: `نمط إصابة متكرر: ${playerNameAr} — ${bodyPartAr}`,
      description:
        `${playerName} has sustained ${row.injury_count} injuries to ${bodyPart} in the last ${windowMonths} months ` +
        `(types: ${types}). Latest: ${row.latest_injury}. ` +
        `Comprehensive medical assessment and prevention plan required.`,
      descriptionAr:
        `${playerNameAr} تعرض لـ ${row.injury_count} إصابات في ${bodyPartAr} خلال آخر ${windowMonths} شهراً ` +
        `(أنواع: ${types}). آخرها: ${row.latest_injury}. ` +
        `مطلوب تقييم طبي شامل وخطة وقاية.`,
      priority: "critical",
      dueDays: 1,
      assignedTo: row.agent_id || row.coach_id || null,
    });

    if (taskCreated) tasksCreated++;

    // Auto-create Medical referral (if none open for this player + body part)
    try {
      const existingReferral = await Referral.findOne({
        where: sequelize.literal(`
          player_id = '${row.player_id}'
          AND referral_type = 'Medical'
          AND trigger_rule_id = 'injury_recurrence'
          AND status NOT IN ('Resolved')
        `),
      });

      if (!existingReferral) {
        await Referral.create({
          referralType: "Medical",
          playerId: row.player_id,
          triggerDesc: `Auto-generated: ${row.injury_count} injuries to ${bodyPart} in ${windowMonths} months`,
          triggerRuleId: "injury_recurrence" as any,
          isAutoGenerated: true,
          status: "Open",
          priority: "Critical",
          dueDate: dueDate(3),
          notes: `Injury types: ${types}. Latest: ${row.latest_injury}. Requires chronic injury assessment and prevention plan.`,
        } as any);
        referralsCreated++;
      }
    } catch (err) {
      logger.warn("[InjuryEngine] referral creation failed", {
        error: (err as Error).message,
      });
    }

    // Notify medical staff
    await notifyByRole(["Admin", "Manager", "Coach"], {
      type: "injury",
      title: `Recurring injury: ${playerName} — ${bodyPart} (${row.injury_count}x)`,
      titleAr: `إصابة متكررة: ${playerNameAr} — ${bodyPartAr} (${row.injury_count} مرات)`,
      body: `${row.injury_count} injuries to same body part in ${windowMonths} months. Medical referral created.`,
      bodyAr: `${row.injury_count} إصابات في نفس المنطقة خلال ${windowMonths} شهراً. تم إنشاء تحويل طبي.`,
      link: `/dashboard/players/${row.player_id}`,
      sourceType: "player",
      sourceId: row.player_id,
      priority: "critical",
    });
  }

  return {
    playersChecked: await getActivePlayerCount(),
    recurring: rows.length,
    tasksCreated,
    referralsCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Return-to-Play Validator (daily — 7:30 AM)
//
// Players whose status changed from injured → active in the
// last 48h but have no medical clearance document uploaded
// for the related injury → verification task.
// ══════════════════════════════════════════════════════════════

export async function checkReturnToPlay(): Promise<{
  checked: number;
  flagged: number;
  tasksCreated: number;
}> {
  if (!_config.enabled) return { checked: 0, flagged: 0, tasksCreated: 0 };

  const hoursWindow = _config.returnClearanceWindowHours;
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursWindow);

  // Find injuries that were recently marked Recovered but have no
  // medical clearance document linked to that injury
  const rows: any[] = await sequelize.query(
    `
    SELECT
      i.id AS injury_id,
      i.player_id,
      i.injury_type,
      i.body_part,
      i.body_part_ar,
      i.actual_return_date,
      i.updated_at,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.agent_id, p.coach_id,
      -- Check if any document is linked to this injury
      (
        SELECT COUNT(*)
        FROM documents d
        WHERE d.entity_type = 'Injury'
          AND d.entity_id = i.id::text
      ) AS doc_count
    FROM injuries i
    JOIN players p ON p.id = i.player_id
    WHERE i.status = 'Recovered'
      AND i.updated_at >= :cutoff
      AND p.status = 'active'
    ORDER BY i.updated_at DESC
    `,
    {
      replacements: { cutoff: cutoff.toISOString() },
      type: "SELECT" as any,
    },
  );

  // Filter to those without medical docs
  const flagged = rows.filter((r) => Number(r.doc_count) === 0);
  let tasksCreated = 0;

  for (const row of flagged) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const bodyPart = row.body_part;
    const bodyPartAr = row.body_part_ar || bodyPart;

    const created = await createInjuryTask({
      playerId: row.player_id,
      triggerRuleId: "return_to_play_validation",
      title: `Missing clearance: ${playerName} — ${bodyPart}`,
      titleAr: `إذن طبي مفقود: ${playerNameAr} — ${bodyPartAr}`,
      description:
        `${playerName} was marked as recovered from ${row.injury_type} (${bodyPart}) ` +
        `but no medical clearance document has been uploaded for this injury. ` +
        `Verify return-to-play protocol compliance before match participation.`,
      descriptionAr:
        `${playerNameAr} تم تسجيله كمتعافٍ من ${row.injury_type} (${bodyPartAr}) ` +
        `لكن لم يتم رفع مستند إذن طبي لهذه الإصابة. ` +
        `التحقق من الامتثال لبروتوكول العودة للعب قبل المشاركة في المباريات.`,
      priority: "high",
      dueDays: 1,
      assignedTo: row.agent_id || row.coach_id || null,
    });

    if (created) tasksCreated++;
  }

  return {
    checked: rows.length,
    flagged: flagged.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Injury Risk Scoring (weekly — Monday 6 AM)
//
// Calculates a composite injury risk score per active player
// based on: age, recurring injury history, recent injury
// count, match load, and severity history.
// Updates risk_radars.injury_risk accordingly.
// ══════════════════════════════════════════════════════════════

export async function calculateInjuryRisk(): Promise<{
  playersScored: number;
  highRisk: number;
  mediumRisk: number;
}> {
  if (!_config.enabled) return { playersScored: 0, highRisk: 0, mediumRisk: 0 };

  const ageFactor = _config.riskAgeFactor;
  const recurringWeight = _config.riskRecurringWeight;
  const recentWeight = _config.riskRecentWeight;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Calculate risk scores using SQL
  const rows: any[] = await sequelize.query(
    `
    WITH player_injury_stats AS (
      SELECT
        p.id AS player_id,
        p.first_name, p.last_name,
        p.first_name_ar, p.last_name_ar,
        p.date_of_birth,
        p.coach_id, p.agent_id,
        -- Recent injuries (last 6 months)
        COUNT(*) FILTER (WHERE i.injury_date >= :sixMonths) AS recent_injuries,
        -- Total injuries (last 12 months)
        COUNT(*) FILTER (WHERE i.injury_date >= :twelveMonths) AS total_injuries,
        -- Recurring flag count
        COUNT(*) FILTER (WHERE i.is_recurring = true AND i.injury_date >= :twelveMonths) AS recurring_count,
        -- Severe/Critical count
        COUNT(*) FILTER (WHERE i.severity IN ('Severe', 'Critical') AND i.injury_date >= :twelveMonths) AS severe_count,
        -- Surgery count
        COUNT(*) FILTER (WHERE i.is_surgery_required = true AND i.injury_date >= :twelveMonths) AS surgery_count,
        -- Currently under treatment
        COUNT(*) FILTER (WHERE i.status IN ('UnderTreatment', 'Relapsed')) AS active_injuries
      FROM players p
      LEFT JOIN injuries i ON i.player_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
               p.date_of_birth, p.coach_id, p.agent_id
    )
    SELECT
      pis.*,
      -- Calculate age
      CASE
        WHEN pis.date_of_birth IS NOT NULL
        THEN EXTRACT(YEAR FROM age(pis.date_of_birth::date))
        ELSE 25
      END AS player_age,
      -- Risk score formula
      (
        CASE WHEN pis.date_of_birth IS NOT NULL
             AND EXTRACT(YEAR FROM age(pis.date_of_birth::date)) >= :ageFactor
             THEN 15 ELSE 0 END
        + (pis.recurring_count * :recurringWeight * 10)
        + (pis.recent_injuries * :recentWeight * 8)
        + (pis.severe_count * 12)
        + (pis.surgery_count * 15)
        + (pis.active_injuries * 20)
      ) AS risk_score
    FROM player_injury_stats pis
    ORDER BY risk_score DESC
    `,
    {
      replacements: {
        sixMonths: sixMonthsAgo.toISOString().split("T")[0],
        twelveMonths: twelveMonthsAgo.toISOString().split("T")[0],
        ageFactor,
        recurringWeight,
        recentWeight,
      },
      type: "SELECT" as any,
    },
  );

  let highRisk = 0;
  let mediumRisk = 0;

  for (const row of rows) {
    const score = Number(row.risk_score);
    let riskLevel: "Low" | "Medium" | "High";

    if (score >= 40) {
      riskLevel = "High";
      highRisk++;
    } else if (score >= 20) {
      riskLevel = "Medium";
      mediumRisk++;
    } else {
      riskLevel = "Low";
    }

    // Upsert risk_radar
    await sequelize
      .query(
        `INSERT INTO risk_radars (player_id, injury_risk, overall_risk, assessed_at)
         VALUES (:playerId, :injuryRisk, :overallRisk, NOW())
         ON CONFLICT (player_id) DO UPDATE SET
           injury_risk = :injuryRisk,
           overall_risk = CASE
             WHEN :injuryRisk = 'High' OR risk_radars.performance_risk = 'High' OR risk_radars.contract_risk = 'High' THEN 'High'
             WHEN :injuryRisk = 'Medium' OR risk_radars.performance_risk = 'Medium' OR risk_radars.contract_risk = 'Medium' THEN 'Medium'
             ELSE 'Low'
           END,
           assessed_at = NOW()`,
        {
          replacements: {
            playerId: row.player_id,
            injuryRisk: riskLevel,
            overallRisk:
              riskLevel === "High"
                ? "High"
                : riskLevel === "Medium"
                  ? "Medium"
                  : "Low",
          },
        },
      )
      .catch((err) =>
        logger.warn("[InjuryEngine] risk_radar update failed", {
          error: (err as Error).message,
        }),
      );

    // Create tasks for high-risk players
    if (riskLevel === "High") {
      const playerName = `${row.first_name} ${row.last_name}`.trim();
      const playerNameAr = row.first_name_ar
        ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
        : playerName;

      await createInjuryTask({
        playerId: row.player_id,
        triggerRuleId: "injury_risk_high",
        title: `High injury risk: ${playerName}`,
        titleAr: `خطر إصابة مرتفع: ${playerNameAr}`,
        description:
          `${playerName} has a high injury risk score (${score}). ` +
          `Recent: ${row.recent_injuries} injuries in 6mo, ${row.recurring_count} recurring, ` +
          `${row.severe_count} severe, ${row.active_injuries} currently active. ` +
          `Review training load and consider preventive measures.`,
        descriptionAr:
          `${playerNameAr} لديه نسبة خطر إصابة مرتفعة (${score}). ` +
          `حديثاً: ${row.recent_injuries} إصابات في 6 أشهر، ${row.recurring_count} متكررة، ` +
          `${row.severe_count} شديدة، ${row.active_injuries} نشطة حالياً. ` +
          `مراجعة حمل التدريب والنظر في إجراءات وقائية.`,
        priority: "high",
        dueDays: 3,
        assignedTo: row.coach_id || row.agent_id || null,
      });

      // Notify
      await notifyByRole(["Coach", "Manager"], {
        type: "injury",
        title: `High injury risk: ${playerName}`,
        titleAr: `خطر إصابة مرتفع: ${playerNameAr}`,
        body: `Risk score: ${score}. ${row.recent_injuries} recent injuries, ${row.recurring_count} recurring.`,
        bodyAr: `نسبة الخطر: ${score}. ${row.recent_injuries} إصابات حديثة، ${row.recurring_count} متكررة.`,
        link: `/dashboard/players/${row.player_id}`,
        sourceType: "player",
        sourceId: row.player_id,
        priority: "high",
      });
    }
  }

  return {
    playersScored: rows.length,
    highRisk,
    mediumRisk,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Post-Surgery Milestone Tracker (daily — 8 AM)
//
// Tracks recovery milestones at 30/60/90 days after surgery.
// Creates progress check tasks at each milestone.
// ══════════════════════════════════════════════════════════════

export async function checkSurgeryMilestones(): Promise<{
  surgeries: number;
  milestonesHit: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { surgeries: 0, milestonesHit: 0, tasksCreated: 0 };

  const milestones = _config.surgeryMilestoneDays;
  let totalMilestones = 0;
  let tasksCreated = 0;

  for (const milestoneDays of milestones) {
    // Find surgeries where today = surgery_date + milestoneDays
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - milestoneDays);
    const targetStr = targetDate.toISOString().split("T")[0];

    const rows: any[] = await sequelize.query(
      `
      SELECT
        i.id AS injury_id,
        i.player_id,
        i.injury_type,
        i.injury_type_ar,
        i.body_part,
        i.body_part_ar,
        i.severity,
        i.status,
        i.surgery_date,
        i.surgeon_name,
        i.facility,
        i.expected_return_date,
        p.first_name, p.last_name,
        p.first_name_ar, p.last_name_ar,
        p.agent_id, p.coach_id
      FROM injuries i
      JOIN players p ON p.id = i.player_id
      WHERE i.is_surgery_required = true
        AND i.surgery_date = :targetDate
        AND i.status IN ('UnderTreatment', 'Relapsed')
      ORDER BY i.surgery_date
      `,
      {
        replacements: { targetDate: targetStr },
        type: "SELECT" as any,
      },
    );

    for (const row of rows) {
      totalMilestones++;
      const playerName = `${row.first_name} ${row.last_name}`.trim();
      const playerNameAr = row.first_name_ar
        ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
        : playerName;
      const bodyPart = row.body_part;
      const bodyPartAr = row.body_part_ar || bodyPart;
      const surgeon = row.surgeon_name || row.facility || "N/A";

      const created = await createInjuryTask({
        playerId: row.player_id,
        triggerRuleId: `surgery_milestone_${milestoneDays}d`,
        title: `${milestoneDays}-day post-surgery check: ${playerName}`,
        titleAr: `فحص ما بعد الجراحة (${milestoneDays} يوم): ${playerNameAr}`,
        description:
          `${milestoneDays} days since ${playerName}'s surgery for ${row.injury_type} (${bodyPart}). ` +
          `Surgeon: ${surgeon}. Current status: ${row.status}. Severity: ${row.severity}. ` +
          `${row.expected_return_date ? `Expected return: ${row.expected_return_date}.` : ""} ` +
          `Assess recovery progress and update treatment plan.`,
        descriptionAr:
          `مضى ${milestoneDays} يوم على جراحة ${playerNameAr} لـ ${row.injury_type_ar || row.injury_type} (${bodyPartAr}). ` +
          `الحالة: ${row.status}. الشدة: ${row.severity}. ` +
          `${row.expected_return_date ? `العودة المتوقعة: ${row.expected_return_date}.` : ""} ` +
          `تقييم تقدم التعافي وتحديث الخطة العلاجية.`,
        priority: milestoneDays <= 30 ? "critical" : "high",
        dueDays: 2,
        assignedTo: row.agent_id || row.coach_id || null,
      });

      if (created) tasksCreated++;
    }
  }

  // Count total active surgeries for stats
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM injuries
     WHERE is_surgery_required = true AND status IN ('UnderTreatment', 'Relapsed')`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    surgeries: Number(countRow?.cnt ?? 0),
    milestonesHit: totalMilestones,
    tasksCreated,
  };
}

// ── Utility ──

async function getActivePlayerCount(): Promise<number> {
  const [row] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM players WHERE status = 'active'`,
    { type: "SELECT" as any },
  )) as any[];
  return Number(row?.cnt ?? 0);
}
