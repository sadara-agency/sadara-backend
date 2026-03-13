/**
 * Gym / Training Auto-Task Generator
 *
 * Real-time trigger:
 *  16. workout_completed — assignment reaches 100% → Coach/GymCoach task
 *
 * Cron triggers (registered in scheduler.ts):
 *  15. workout_assignment_expiring — endDate in 7 days
 *  17. diet_plan_no_adherence      — active plan, 0 logs in 7 days
 *  18. metric_target_achieved      — target metric reached
 *  19. training_course_completed   — enrollment → Completed
 */

import { Op, QueryTypes } from "sequelize";
import {
  WorkoutAssignment,
  WorkoutPlan,
  MetricTarget,
  BodyMetric,
  DietPlan,
  DietAdherence,
} from "@modules/gym/gym.model";
import { Player } from "@modules/players/player.model";
import { sequelize } from "@config/database";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 16. Workout completed → Coach/GymCoach review ──

export async function generateWorkoutCompletedTask(
  assignmentId: string,
  playerId: string,
) {
  const assignment = await WorkoutAssignment.findByPk(assignmentId, {
    include: [
      {
        model: WorkoutPlan,
        as: "plan",
        attributes: ["id", "nameEn", "nameAr"],
      },
    ],
  });
  if (!assignment || assignment.completionPct < 100) return;

  const player = await Player.findByPk(playerId, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "coachId",
    ],
  });
  if (!player) return;

  const playerName = `${player.firstName} ${player.lastName}`.trim();
  const playerNameAr = player.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;
  const planName = (assignment as any).plan?.nameEn ?? "workout plan";

  const assignee =
    player.coachId ??
    (await findUserByRole("GymCoach"))?.id ??
    (await findUserByRole("Coach"))?.id ??
    null;

  await createAutoTaskIfNotExists(
    {
      ruleId: "workout_completed",
      title: `Workout completed: ${playerName}`,
      titleAr: `اكتمال التمرين: ${playerNameAr}`,
      description: `${playerName} has completed the "${planName}" workout plan (100%). Review results and assign the next plan if needed.`,
      descriptionAr: `${playerNameAr} أكمل خطة التمرين "${(assignment as any).plan?.nameAr ?? planName}". مراجعة النتائج وتعيين الخطة التالية.`,
      type: "General",
      priority: "low",
      assignedTo: assignee,
      playerId,
    },
    {
      roles: ["GymCoach", "Coach"],
      link: "/dashboard/gym",
    },
  );
}

// ── 15. Cron: workout assignment expiring ──

export async function checkWorkoutAssignmentExpiring(): Promise<{
  created: number;
}> {
  const rc = cfg("workout_assignment_expiring");
  if (!rc.enabled) return { created: 0 };

  const thresholdDays = rc.threshold ?? 7;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + thresholdDays);

  const expiring = await WorkoutAssignment.findAll({
    where: {
      status: "active",
      endDate: { [Op.between]: [now, cutoff] },
    },
    include: [
      { model: WorkoutPlan, as: "plan", attributes: ["nameEn", "nameAr"] },
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "coachId",
        ],
      },
    ],
  });

  let created = 0;
  for (const a of expiring) {
    const player = (a as any).player;
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const assignee =
      player.coachId ?? (await findUserByRole("GymCoach"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "workout_assignment_expiring",
        title: `Workout expiring: ${playerName}`,
        titleAr: `انتهاء التمرين: ${playerNameAr}`,
        description: `${playerName}'s workout plan "${(a as any).plan?.nameEn ?? "plan"}" ends on ${a.endDate}. Completion: ${a.completionPct}%. Renew or assign a new plan.`,
        descriptionAr: `خطة تمرين ${playerNameAr} تنتهي في ${a.endDate}. الإنجاز: ${a.completionPct}%.`,
        type: "General",
        priority: "medium",
        assignedTo: assignee,
        playerId: player.id,
      },
      {
        roles: ["GymCoach", "Coach"],
        link: "/dashboard/gym",
      },
    );
    if (task) created++;
  }

  return { created };
}

// ── 17. Cron: diet plan with no adherence logs ──

export async function checkDietPlanNoAdherence(): Promise<{ created: number }> {
  const rc = cfg("diet_plan_no_adherence");
  if (!rc.enabled) return { created: 0 };

  const noLogDays = rc.threshold ?? 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - noLogDays);

  // Find active diet plans
  const activePlans = await DietPlan.findAll({
    where: { status: "active", playerId: { [Op.ne]: null } },
    attributes: ["id", "playerId", "nameEn", "nameAr"],
  });

  let created = 0;
  for (const plan of activePlans) {
    if (!plan.playerId) continue;

    // Check for recent adherence logs
    const recentLog = await DietAdherence.findOne({
      where: {
        planId: plan.id,
        playerId: plan.playerId,
        createdAt: { [Op.gte]: cutoffDate },
      },
    });
    if (recentLog) continue;

    const player = await Player.findByPk(plan.playerId, {
      attributes: [
        "id",
        "firstName",
        "lastName",
        "firstNameAr",
        "lastNameAr",
        "coachId",
      ],
    });
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const assignee =
      player.coachId ?? (await findUserByRole("GymCoach"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "diet_plan_no_adherence",
        title: `No diet logs: ${playerName}`,
        titleAr: `لا سجلات غذائية: ${playerNameAr}`,
        description: `${playerName} has an active diet plan "${plan.nameEn}" but has logged 0 meals in the past ${noLogDays} days. Follow up on adherence.`,
        descriptionAr: `${playerNameAr} لديه خطة غذائية نشطة ولم يسجل أي وجبات خلال ${noLogDays} أيام.`,
        type: "General",
        priority: "high",
        assignedTo: assignee,
        playerId: player.id,
      },
      {
        roles: ["GymCoach", "Coach"],
        link: "/dashboard/gym",
      },
    );
    if (task) created++;
  }

  return { created };
}

// ── 18. Cron: metric target achieved ──

export async function checkMetricTargetAchieved(): Promise<{
  created: number;
}> {
  const rc = cfg("metric_target_achieved");
  if (!rc.enabled) return { created: 0 };

  const activeTargets = await MetricTarget.findAll({
    where: { status: "active" },
  });

  let created = 0;
  for (const target of activeTargets) {
    const latestMetric = await BodyMetric.findOne({
      where: { playerId: target.playerId },
      order: [["date", "DESC"]],
    });
    if (!latestMetric) continue;

    // Check if any target is met
    let achieved = false;
    if (target.targetWeight && latestMetric.weight) {
      achieved =
        Math.abs(Number(latestMetric.weight) - Number(target.targetWeight)) <=
        1;
    }
    if (target.targetBodyFat && latestMetric.bodyFatPct) {
      achieved =
        achieved ||
        Number(latestMetric.bodyFatPct) <= Number(target.targetBodyFat);
    }
    if (target.targetMuscleMass && latestMetric.muscleMass) {
      achieved =
        achieved ||
        Number(latestMetric.muscleMass) >= Number(target.targetMuscleMass);
    }
    if (!achieved) continue;

    const player = await Player.findByPk(target.playerId, {
      attributes: [
        "id",
        "firstName",
        "lastName",
        "firstNameAr",
        "lastNameAr",
        "coachId",
      ],
    });
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const assignee =
      player.coachId ?? (await findUserByRole("GymCoach"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "metric_target_achieved",
        title: `Target reached: ${playerName}`,
        titleAr: `تحقق الهدف: ${playerNameAr}`,
        description: `${playerName} has reached their body metric target. Review results, update goals, and set next targets.`,
        descriptionAr: `${playerNameAr} حقق هدفه في القياسات الجسدية. مراجعة النتائج وتحديد أهداف جديدة.`,
        type: "General",
        priority: "low",
        assignedTo: assignee,
        playerId: player.id,
      },
      {
        roles: ["GymCoach", "Coach"],
        link: "/dashboard/gym",
      },
    );
    if (task) created++;
  }

  return { created };
}

// ── 19. Cron: training course completed ──

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
