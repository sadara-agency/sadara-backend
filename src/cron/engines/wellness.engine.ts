// ═══════════════════════════════════════════════════════════════
// Wellness Engine
//
// Automates daily summary aggregation and smart nudges:
// 1. Daily summary (23:55) — aggregate meals + workout → ring score
// 2. Weight stale (09:05) — no weight log in 7+ days
// 3. Under-fueling (10:05) — calorie adherence < 70% for 3+ days
// 4. Missed workout (20:00) — pending assignment at end of day
// ═══════════════════════════════════════════════════════════════

import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import {
  notifyUser,
} from "@modules/notifications/notification.service";
import { createAutoTaskIfNotExists, cfg } from "@shared/utils/autoTaskHelpers";

import {
  WellnessProfile,
  WellnessMealLog,
} from "@modules/wellness/wellness.model";
import {
  WellnessWorkoutAssignment,
  WellnessDailySummary,
} from "@modules/wellness/fitness.model";
import { calculateRingScore } from "@modules/wellness/wellness.helpers";

// ── Helpers ──

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Daily Summary Aggregation
//
// Aggregates meal logs + workout status into wellness_daily_summaries
// and computes ring scores for all players with wellness profiles.
// ══════════════════════════════════════════════════════════════

export async function aggregateDailySummaries(): Promise<{
  processed: number;
}> {
  const rc = cfg("wellness_daily_summary");
  if (!rc.enabled) return { processed: 0 };

  const today = todayLocal();

  // Get all players with wellness profiles
  const players: any[] = await sequelize.query(
    `SELECT wp.player_id, wp.target_calories, wp.target_protein_g,
            p.first_name, p.last_name, p.user_id
     FROM wellness_profiles wp
     JOIN players p ON p.id = wp.player_id
     WHERE p.status = 'active'`,
    { type: QueryTypes.SELECT },
  );

  let processed = 0;

  for (const player of players) {
    try {
      // Aggregate meal totals
      const [mealTotals]: any = await sequelize.query(
        `SELECT COALESCE(SUM(calories), 0) AS total_calories,
                COALESCE(SUM(protein_g), 0) AS total_protein_g,
                COALESCE(SUM(carbs_g), 0) AS total_carbs_g,
                COALESCE(SUM(fat_g), 0) AS total_fat_g
         FROM wellness_meal_logs
         WHERE player_id = :playerId AND logged_date = :date`,
        {
          replacements: { playerId: player.player_id, date: today },
          type: QueryTypes.SELECT,
        },
      );

      const totalCalories = Math.round(Number(mealTotals?.total_calories || 0));
      const totalProteinG =
        Math.round(Number(mealTotals?.total_protein_g || 0) * 10) / 10;
      const totalCarbsG =
        Math.round(Number(mealTotals?.total_carbs_g || 0) * 10) / 10;
      const totalFatG =
        Math.round(Number(mealTotals?.total_fat_g || 0) * 10) / 10;

      // Adherence %
      const targetCal = Number(player.target_calories) || 0;
      const targetProt = Number(player.target_protein_g) || 0;
      const calorieAdherencePct =
        targetCal > 0 ? Math.round((totalCalories / targetCal) * 100) : null;
      const proteinAdherencePct =
        targetProt > 0 ? Math.round((totalProteinG / targetProt) * 100) : null;

      // Workout completion
      const [workoutRow]: any = await sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM wellness_workout_assignments
         WHERE player_id = :playerId
           AND assigned_date = :date
           AND status = 'completed'`,
        {
          replacements: { playerId: player.player_id, date: today },
          type: QueryTypes.SELECT,
        },
      );
      const workoutCompleted = Number(workoutRow?.cnt || 0) > 0;

      // Weight logged
      const [weightRow]: any = await sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM wellness_weight_logs
         WHERE player_id = :playerId AND logged_at = :date`,
        {
          replacements: { playerId: player.player_id, date: today },
          type: QueryTypes.SELECT,
        },
      );
      const weightLogged = Number(weightRow?.cnt || 0) > 0;

      // Ring score
      const ringScore = calculateRingScore(
        calorieAdherencePct ?? 0,
        proteinAdherencePct ?? 0,
        workoutCompleted,
      );

      // Upsert into daily summaries
      await sequelize.query(
        `INSERT INTO wellness_daily_summaries
           (id, player_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g,
            calorie_adherence_pct, protein_adherence_pct, workout_completed, weight_logged, ring_score,
            created_at, updated_at)
         VALUES (gen_random_uuid(), :playerId, :date, :totalCalories, :totalProteinG, :totalCarbsG, :totalFatG,
                 :calorieAdherencePct, :proteinAdherencePct, :workoutCompleted, :weightLogged, :ringScore,
                 NOW(), NOW())
         ON CONFLICT (player_id, summary_date)
         DO UPDATE SET
           total_calories = :totalCalories,
           total_protein_g = :totalProteinG,
           total_carbs_g = :totalCarbsG,
           total_fat_g = :totalFatG,
           calorie_adherence_pct = :calorieAdherencePct,
           protein_adherence_pct = :proteinAdherencePct,
           workout_completed = :workoutCompleted,
           weight_logged = :weightLogged,
           ring_score = :ringScore,
           updated_at = NOW()`,
        {
          replacements: {
            playerId: player.player_id,
            date: today,
            totalCalories,
            totalProteinG,
            totalCarbsG,
            totalFatG,
            calorieAdherencePct,
            proteinAdherencePct,
            workoutCompleted,
            weightLogged,
            ringScore,
          },
        },
      );

      processed++;
    } catch (err) {
      logger.warn(
        `[WellnessEngine] Failed to aggregate summary for player ${player.player_id}`,
        err,
      );
    }
  }

  logger.info(`[WellnessEngine] daily-summary: processed ${processed} players`);
  return { processed };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Weight Stale Check
//
// Flags players with no weight log in 7+ days.
// ══════════════════════════════════════════════════════════════

export async function checkWeightStale(): Promise<{ flagged: number }> {
  const rc = cfg("wellness_weight_stale");
  if (!rc.enabled) return { flagged: 0 };

  const staleDays = rc.threshold ?? 7;
  const dueDays = rc.dueDays ?? 3;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const stalePlayers: any[] = await sequelize.query(
    `SELECT wp.player_id, p.first_name, p.last_name,
            p.first_name_ar, p.last_name_ar, p.user_id
     FROM wellness_profiles wp
     JOIN players p ON p.id = wp.player_id
     WHERE p.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM wellness_weight_logs wl
         WHERE wl.player_id = wp.player_id
           AND wl.logged_at > :cutoff
       )`,
    { replacements: { cutoff: cutoffStr }, type: QueryTypes.SELECT },
  );

  let flagged = 0;

  for (const row of stalePlayers) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "wellness_weight_stale",
        title: `Weight log stale: ${name}`,
        titleAr: `تسجيل الوزن متأخر: ${nameAr}`,
        description: `${name} has not logged their weight for ${staleDays}+ days.`,
        descriptionAr: `لم يسجل ${nameAr} وزنه لأكثر من ${staleDays} يوم.`,
        type: "General",
        priority: "low",
        playerId: row.player_id,
      },
      {
        roles: ["Coach"],
        link: "/dashboard/wellness",
      },
    );

    if (task) {
      flagged++;
      // Notify player directly
      if (row.user_id) {
        await notifyUser(row.user_id, {
          type: "task",
          title: `Please log your weight`,
          titleAr: `يرجى تسجيل وزنك`,
          body: `You haven't logged your weight in over ${staleDays} days`,
          bodyAr: `لم تسجل وزنك منذ أكثر من ${staleDays} يوم`,
          link: "/player/wellness/weight",
          sourceType: "wellness",
          sourceId: row.player_id,
          priority: "low",
        });
      }
    }
  }

  logger.info(`[WellnessEngine] weight-stale: flagged ${flagged}`);
  return { flagged };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Under-Fueling Alert
//
// Flags players with calorie adherence < 70% for 3+ consecutive days.
// ══════════════════════════════════════════════════════════════

export async function checkUnderFueling(): Promise<{ flagged: number }> {
  const rc = cfg("wellness_under_fueling");
  if (!rc.enabled) return { flagged: 0 };

  const consecutiveDays = rc.threshold ?? 3;
  const thresholdPct = 70;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - consecutiveDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const underFueled: any[] = await sequelize.query(
    `SELECT ds.player_id, p.first_name, p.last_name,
            p.first_name_ar, p.last_name_ar, p.user_id,
            ROUND(AVG(ds.calorie_adherence_pct)) AS avg_adherence
     FROM wellness_daily_summaries ds
     JOIN players p ON p.id = ds.player_id
     WHERE ds.summary_date >= :cutoff
       AND ds.calorie_adherence_pct IS NOT NULL
       AND ds.calorie_adherence_pct < :threshold
       AND p.status = 'active'
     GROUP BY ds.player_id, p.first_name, p.last_name,
              p.first_name_ar, p.last_name_ar, p.user_id
     HAVING COUNT(*) >= :days`,
    {
      replacements: {
        cutoff: cutoffStr,
        threshold: thresholdPct,
        days: consecutiveDays,
      },
      type: QueryTypes.SELECT,
    },
  );

  let flagged = 0;

  for (const row of underFueled) {
    const name = `${row.first_name} ${row.last_name}`.trim();
    const nameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : name;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "wellness_under_fueling",
        title: `Under-fueling alert: ${name}`,
        titleAr: `تنبيه نقص التغذية: ${nameAr}`,
        description: `${name} has been below ${thresholdPct}% calorie target for ${consecutiveDays}+ days (avg: ${row.avg_adherence}%).`,
        descriptionAr: `${nameAr} تحت ${thresholdPct}% من هدف السعرات لأكثر من ${consecutiveDays} أيام (المتوسط: ${row.avg_adherence}%).`,
        type: "General",
        priority: "medium",
        playerId: row.player_id,
      },
      {
        roles: ["Coach"],
        link: "/dashboard/wellness",
      },
    );

    if (task) {
      flagged++;
      if (row.user_id) {
        await notifyUser(row.user_id, {
          type: "task",
          title: `Calorie intake below target`,
          titleAr: `السعرات الحرارية أقل من الهدف`,
          body: `Your calorie intake has been below ${thresholdPct}% for ${consecutiveDays}+ days`,
          bodyAr: `السعرات الحرارية أقل من ${thresholdPct}% لأكثر من ${consecutiveDays} أيام`,
          link: "/player/wellness/nutrition",
          sourceType: "wellness",
          sourceId: row.player_id,
          priority: "normal",
        });
      }
    }
  }

  logger.info(`[WellnessEngine] under-fueling: flagged ${flagged}`);
  return { flagged };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Missed Workout Nudge
//
// Notifies players who have a pending workout assignment at end of day.
// ══════════════════════════════════════════════════════════════

export async function checkMissedWorkout(): Promise<{ notified: number }> {
  const rc = cfg("wellness_missed_workout");
  if (!rc.enabled) return { notified: 0 };

  const today = todayLocal();

  const pending: any[] = await sequelize.query(
    `SELECT wa.id, wa.player_id, p.first_name, p.last_name,
            p.first_name_ar, p.last_name_ar, p.user_id,
            wt.name AS template_name, wt.name_ar AS template_name_ar
     FROM wellness_workout_assignments wa
     JOIN players p ON p.id = wa.player_id
     LEFT JOIN wellness_workout_templates wt ON wt.id = wa.template_id
     WHERE wa.assigned_date = :today
       AND wa.status = 'pending'
       AND p.status = 'active'`,
    { replacements: { today }, type: QueryTypes.SELECT },
  );

  let notified = 0;

  for (const row of pending) {
    if (!row.user_id) continue;

    const templateName = row.template_name || "Workout";
    const templateNameAr = row.template_name_ar || templateName;

    await notifyUser(row.user_id, {
      type: "task",
      title: `Incomplete workout: ${templateName}`,
      titleAr: `تمرين غير مكتمل: ${templateNameAr}`,
      body: `You have an incomplete workout scheduled for today`,
      bodyAr: `لديك تمرين غير مكتمل مجدول لليوم`,
      link: "/player/wellness/workouts",
      sourceType: "wellness",
      sourceId: row.id,
      priority: "normal",
    });

    notified++;
  }

  logger.info(`[WellnessEngine] missed-workout: notified ${notified}`);
  return { notified };
}
