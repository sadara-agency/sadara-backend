// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.service.ts
// ═══════════════════════════════════════════════════════════════

import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import {
  WellnessProfile,
  WellnessWeightLog,
  WellnessCheckin,
} from "./wellness.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { checkRowAccess } from "@shared/utils/rowScope";
import { AuthUser } from "@shared/types";

const WELLNESS_BYPASS = ["Admin", "Manager", "Executive"];
const COACH_ROLE_LIST = [
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GoalkeeperCoach",
  "MentalCoach",
];

/**
 * Builds a raw SQL WHERE addition + replacements to restrict the players list
 * to only rows visible to the given user. Used in bulk queries like getCoachOverview.
 */
function buildPlayerScopeSQL(user?: AuthUser): {
  clause: string;
  replacements: Record<string, unknown>;
} {
  if (!user || WELLNESS_BYPASS.includes(user.role))
    return { clause: "", replacements: {} };
  if (user.role === "Player")
    return {
      clause: "AND p.id = :scopePlayerId",
      replacements: { scopePlayerId: user.playerId },
    };
  if (COACH_ROLE_LIST.includes(user.role))
    return {
      clause: "AND p.coach_id = :scopeCoachId",
      replacements: { scopeCoachId: user.id },
    };
  if (user.role === "Analyst")
    return {
      clause: "AND p.analyst_id = :scopeAnalystId",
      replacements: { scopeAnalystId: user.id },
    };
  return { clause: "", replacements: {} };
}
import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateBMI,
  calculateReadinessScore,
} from "./wellness.helpers";
import type {
  CreateProfileInput,
  UpdateProfileInput,
  CreateWeightLogInput,
} from "./wellness.validation";
import type {
  MacroComputeResponse,
  WeightTrendResponse,
  PlayerDashboardResponse,
  CoachOverviewResponse,
  CoachOverviewPlayer,
  TrafficLightStatus,
} from "./wellness.types";
import { calculateRingScore } from "./wellness.helpers";

// ══════════════════════════════════════════
// PROFILES
// ══════════════════════════════════════════

export async function getProfile(playerId: string, user?: AuthUser) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Wellness profile not found", 404);
  const profile = await WellnessProfile.findOne({ where: { playerId } });
  return profile ?? null;
}

export async function createProfile(body: CreateProfileInput, userId: string) {
  const existing = await WellnessProfile.findOne({
    where: { playerId: body.playerId },
  });
  if (existing)
    throw new AppError("Profile already exists for this player", 409);

  // If no manual targets, auto-compute from player data
  const profile = await WellnessProfile.create({
    ...body,
    createdBy: userId,
  });

  // Auto-calculate targets if not explicitly provided
  if (!body.targetCalories) {
    try {
      const computed = await computeMacros(body.playerId, profile);
      await profile.update({
        targetCalories: computed.macros.calories,
        targetProteinG: computed.macros.proteinG,
        targetFatG: computed.macros.fatG,
        targetCarbsG: computed.macros.carbsG,
      });
    } catch {
      // Player may lack height/weight — targets stay null
    }
  }

  return profile.reload();
}

export async function updateProfile(
  playerId: string,
  body: UpdateProfileInput,
) {
  const profile = await WellnessProfile.findOne({ where: { playerId } });
  if (!profile) throw new AppError("Wellness profile not found", 404);
  await profile.update(body);
  return profile;
}

// ══════════════════════════════════════════
// MACRO COMPUTATION
// ══════════════════════════════════════════

export async function computeMacros(
  playerId: string,
  existingProfile?: WellnessProfile,
): Promise<MacroComputeResponse> {
  const profile = existingProfile ?? (await getProfile(playerId));
  if (!profile)
    throw new AppError(
      "Wellness profile not set up — create a profile first",
      422,
    );

  const player = await Player.findByPk(playerId, {
    attributes: ["id", "heightCm", "weightKg", "dateOfBirth"],
  });
  if (!player) throw new AppError("Player not found", 404);

  const { heightCm, weightKg, dateOfBirth } = player as any;
  if (!heightCm || !weightKg || !dateOfBirth) {
    throw new AppError(
      "Player must have height, weight, and date of birth set to compute macros",
      400,
    );
  }

  // Use latest weight log if available, otherwise player.weightKg
  const latestLog = await WellnessWeightLog.findOne({
    where: { playerId },
    order: [["logged_at", "DESC"]],
  });
  const currentWeight = latestLog
    ? Number(latestLog.weightKg)
    : Number(weightKg);

  const ageYears = Math.floor(
    (Date.now() - new Date(dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  const bmr = calculateBMR(
    currentWeight,
    Number(heightCm),
    ageYears,
    profile.sex,
  );
  const tdee = calculateTDEE(bmr, Number(profile.activityLevel));
  const macros = calculateMacros(tdee, currentWeight, profile.goal);
  const bmi = calculateBMI(currentWeight, Number(heightCm));

  return {
    bmr: Math.round(bmr),
    tdee,
    macros,
    bmi,
    inputs: {
      weightKg: currentWeight,
      heightCm: Number(heightCm),
      ageYears,
      sex: profile.sex,
      activityLevel: Number(profile.activityLevel),
      goal: profile.goal,
    },
  };
}

/**
 * Recalculate and persist macro targets from current player data.
 */
export async function recalculateTargets(playerId: string) {
  const profile = await getProfile(playerId);
  if (!profile) throw new AppError("Wellness profile not found", 404);
  const computed = await computeMacros(playerId, profile ?? undefined);
  await profile.update({
    targetCalories: computed.macros.calories,
    targetProteinG: computed.macros.proteinG,
    targetFatG: computed.macros.fatG,
    targetCarbsG: computed.macros.carbsG,
  });
  return { profile: await profile.reload(), computed };
}

// ══════════════════════════════════════════
// WEIGHT LOGS
// ══════════════════════════════════════════

export async function listWeightLogs(
  playerId: string,
  queryParams: any,
  user?: AuthUser,
) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const { limit, offset, page } = parsePagination(queryParams, "logged_at");
  const where: any = { playerId };

  if (queryParams.from)
    where.loggedAt = { ...where.loggedAt, [Op.gte]: queryParams.from };
  if (queryParams.to)
    where.loggedAt = { ...where.loggedAt, [Op.lte]: queryParams.to };

  const { count, rows } = await WellnessWeightLog.findAndCountAll({
    where,
    limit,
    offset,
    order: [["logged_at", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createWeightLog(body: CreateWeightLogInput) {
  // Upsert: if entry exists for this date, update it
  const existing = await WellnessWeightLog.findOne({
    where: { playerId: body.playerId, loggedAt: body.loggedAt },
  });

  if (existing) {
    await existing.update({
      weightKg: body.weightKg,
      bodyFatPct: body.bodyFatPct ?? existing.bodyFatPct,
      notes: body.notes ?? existing.notes,
    });
    return existing;
  }

  return WellnessWeightLog.create(body);
}

export async function getWeightTrend(
  playerId: string,
  user?: AuthUser,
): Promise<WeightTrendResponse> {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fromDate = fourWeeksAgo.toISOString().slice(0, 10);

  const logs = await WellnessWeightLog.findAll({
    where: {
      playerId,
      loggedAt: { [Op.gte]: fromDate },
    },
    order: [["logged_at", "ASC"]],
  });

  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const earliest = logs.length > 0 ? logs[0] : null;

  // Get player height for BMI
  let currentBmi: number | null = null;
  if (latest) {
    const player = await Player.findByPk(playerId, {
      attributes: ["heightCm"],
    });
    const heightCm = (player as any)?.heightCm;
    if (heightCm) {
      currentBmi = calculateBMI(Number(latest.weightKg), Number(heightCm));
    }
  }

  const weightChange =
    latest && earliest
      ? Math.round((Number(latest.weightKg) - Number(earliest.weightKg)) * 10) /
        10
      : null;

  return {
    logs: logs.map((l) => l.get({ plain: true })) as any,
    currentBmi,
    weightChange4Weeks: weightChange,
    latestWeight: latest ? Number(latest.weightKg) : null,
  };
}

// meal log and food item functions removed in Phase 3 — data in _archive_meal_logs_20260422

// ══════════════════════════════════════════
// DASHBOARD (Phase 4)
// ══════════════════════════════════════════

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get player ring dashboard with today's pulse-based ring score and N-day history.
 * Phase 5: ring score is computed from today's checkin; history from wellness_checkins.
 */
export async function getPlayerDashboard(
  playerId: string,
  days = 7,
  user?: AuthUser,
): Promise<PlayerDashboardResponse> {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const today = todayLocal();

  // Get profile targets (kept for UI display)
  const profile = await WellnessProfile.findOne({ where: { playerId } });
  const targetCalories = profile
    ? Number(profile.targetCalories) || null
    : null;
  const targetProteinG = profile
    ? Number(profile.targetProteinG) || null
    : null;

  // Today's pulse — drives ring score
  const todayPulse = await WellnessCheckin.findOne({
    where: { playerId, checkinDate: today },
  });

  const ringScore = todayPulse
    ? calculateRingScore({
        readinessScore: todayPulse.readinessScore,
        sleepQuality: todayPulse.sleepQuality,
        nutritionRating: todayPulse.nutritionRating,
        trainingType: todayPulse.trainingType,
      })
    : 0;

  // N-day history from checkins — one row per date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const history: any[] = await sequelize.query(
    `SELECT checkin_date,
            readiness_score, sleep_quality, nutrition_rating, training_type,
            sleep_hours, fatigue, muscle_soreness, mood, stress
     FROM wellness_checkins
     WHERE player_id = :playerId AND checkin_date >= :cutoff
     ORDER BY checkin_date DESC`,
    { replacements: { playerId, cutoff: cutoffStr }, type: QueryTypes.SELECT },
  );

  return {
    today: {
      totalCalories: 0,
      totalProteinG: 0,
      calorieAdherencePct: null,
      proteinAdherencePct: null,
      workoutCompleted: todayPulse?.trainingType
        ? todayPulse.trainingType !== "rest"
        : false,
      ringScore,
      pulse: todayPulse
        ? {
            readinessScore: todayPulse.readinessScore,
            sleepQuality: todayPulse.sleepQuality,
            nutritionRating: todayPulse.nutritionRating,
            trainingType: todayPulse.trainingType,
          }
        : null,
    },
    history: history.map((h) => {
      const dayScore = calculateRingScore({
        readinessScore:
          h.readiness_score != null ? Number(h.readiness_score) : null,
        sleepQuality: h.sleep_quality != null ? Number(h.sleep_quality) : null,
        nutritionRating:
          h.nutrition_rating != null ? Number(h.nutrition_rating) : null,
        trainingType: h.training_type ?? null,
      });
      return {
        summaryDate: h.checkin_date,
        totalCalories: 0,
        totalProteinG: 0,
        totalCarbsG: 0,
        totalFatG: 0,
        calorieAdherencePct: null,
        proteinAdherencePct: null,
        workoutCompleted: h.training_type ? h.training_type !== "rest" : false,
        weightLogged: false,
        ringScore: dayScore,
        pulse: {
          readinessScore:
            h.readiness_score != null ? Number(h.readiness_score) : null,
          nutritionRating:
            h.nutrition_rating != null ? Number(h.nutrition_rating) : null,
          trainingType: h.training_type ?? null,
        },
      };
    }),
    profile: { targetCalories, targetProteinG },
  };
}

/**
 * Coach traffic light overview for all players with wellness profiles.
 */
export async function getCoachOverview(
  user?: AuthUser,
): Promise<CoachOverviewResponse> {
  const { clause: playerScope, replacements: scopeReplacements } =
    buildPlayerScopeSQL(user);

  // Get all active players visible to this user, LEFT JOIN profiles so players without profiles also appear
  const players: any[] = await sequelize.query(
    `SELECT p.id AS player_id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            CASE WHEN wp.id IS NOT NULL THEN true ELSE false END AS has_profile
     FROM players p
     LEFT JOIN wellness_profiles wp ON wp.player_id = p.id
     WHERE p.status = 'active' ${playerScope}
     ORDER BY p.first_name, p.last_name`,
    { type: QueryTypes.SELECT, replacements: scopeReplacements },
  );

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysStr = threeDaysAgo.toISOString().split("T")[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString().split("T")[0];

  const result: CoachOverviewPlayer[] = [];
  let greenCount = 0,
    yellowCount = 0,
    redCount = 0;

  let noneCount = 0;

  for (const p of players) {
    const hasProfile = p.has_profile === true || p.has_profile === "true";

    // Players without a profile get "none" status — no need to query summaries
    if (!hasProfile) {
      noneCount++;
      result.push({
        playerId: p.player_id,
        firstName: p.first_name,
        lastName: p.last_name,
        firstNameAr: p.first_name_ar,
        lastNameAr: p.last_name_ar,
        hasProfile: false,
        status: "none",
        avgRingScore: 0,
        lastRingScore: 0,
        missedWorkouts: 0,
        weightChange7d: null,
      });
      continue;
    }

    // Last 3 days of checkins — ring scores computed from pulse data (Phase 5)
    const recentCheckins: any[] = await sequelize.query(
      `SELECT checkin_date, readiness_score, sleep_quality, nutrition_rating, training_type
       FROM wellness_checkins
       WHERE player_id = :playerId AND checkin_date >= :cutoff
       ORDER BY checkin_date DESC
       LIMIT 3`,
      {
        replacements: { playerId: p.player_id, cutoff: threeDaysStr },
        type: QueryTypes.SELECT,
      },
    );

    // Weight change in last 7 days
    const weights: any[] = await sequelize.query(
      `SELECT weight_kg, logged_at
       FROM wellness_weight_logs
       WHERE player_id = :playerId AND logged_at >= :cutoff
       ORDER BY logged_at DESC
       LIMIT 2`,
      {
        replacements: { playerId: p.player_id, cutoff: sevenDaysStr },
        type: QueryTypes.SELECT,
      },
    );

    const summaryScores = recentCheckins.map((c) =>
      calculateRingScore({
        readinessScore:
          c.readiness_score != null ? Number(c.readiness_score) : null,
        sleepQuality: c.sleep_quality != null ? Number(c.sleep_quality) : null,
        nutritionRating:
          c.nutrition_rating != null ? Number(c.nutrition_rating) : null,
        trainingType: c.training_type ?? null,
      }),
    );

    const avgRingScore =
      summaryScores.length > 0
        ? Math.round(
            summaryScores.reduce((s, r) => s + r, 0) / summaryScores.length,
          )
        : 0;
    const lastRingScore = summaryScores.length > 0 ? summaryScores[0] : 0;
    const missedWorkouts = recentCheckins.filter(
      (c) => !c.training_type || c.training_type === "rest",
    ).length;
    const weightChange7d =
      weights.length >= 2
        ? Math.round(
            (Number(weights[0].weight_kg) -
              Number(weights[weights.length - 1].weight_kg)) *
              10,
          ) / 10
        : null;

    // Determine traffic light status
    let status: TrafficLightStatus = "green";
    const rapidWeightChange =
      weightChange7d != null && Math.abs(weightChange7d) > 2;

    if (avgRingScore < 60 || rapidWeightChange || missedWorkouts >= 3) {
      status = "red";
    } else if (avgRingScore < 80 || missedWorkouts >= 1) {
      status = "yellow";
    }

    if (status === "green") greenCount++;
    else if (status === "yellow") yellowCount++;
    else redCount++;

    result.push({
      playerId: p.player_id,
      firstName: p.first_name,
      lastName: p.last_name,
      firstNameAr: p.first_name_ar,
      lastNameAr: p.last_name_ar,
      hasProfile: true,
      status,
      avgRingScore,
      lastRingScore,
      missedWorkouts,
      weightChange7d,
    });
  }

  // Sort: red first, then yellow, then green, then no-profile
  const order: Record<string, number> = {
    red: 0,
    yellow: 1,
    green: 2,
    none: 3,
  };
  result.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));

  return {
    players: result,
    summary: {
      green: greenCount,
      yellow: yellowCount,
      red: redCount,
      none: noneCount,
      total: players.length,
    },
  };
}

// ── Heatmap Data (per-player daily ring scores) ──

export async function getHeatmapData(days = 14, user?: AuthUser) {
  const { clause: playerScope, replacements: scopeReplacements } =
    buildPlayerScopeSQL(user);
  const today = todayLocal();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().split("T")[0];

  // Phase 5: ring scores come from wellness_checkins, not the stale daily_summaries table
  const rows: any[] = await sequelize.query(
    `SELECT
       p.id AS player_id,
       p.first_name, p.last_name,
       p.first_name_ar, p.last_name_ar,
       p.photo_url,
       wc.checkin_date AS date,
       wc.readiness_score, wc.sleep_quality, wc.nutrition_rating, wc.training_type
     FROM players p
     LEFT JOIN wellness_checkins wc
       ON wc.player_id = p.id
       AND wc.checkin_date >= :startDate
       AND wc.checkin_date <= :today
     WHERE p.status = 'active' ${playerScope}
     ORDER BY p.first_name, p.last_name, wc.checkin_date`,
    {
      replacements: { startDate: startStr, today, ...scopeReplacements },
      type: QueryTypes.SELECT,
    },
  );

  // Generate all dates in range
  const allDates: string[] = [];
  const d = new Date(startStr);
  const end = new Date(today);
  while (d <= end) {
    allDates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }

  // Group by player, fill missing dates with 0
  const playerMap = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      playerNameAr: string;
      photoUrl: string | null;
      scores: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const pid = row.player_id;
    if (!playerMap.has(pid)) {
      playerMap.set(pid, {
        playerId: pid,
        playerName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
        playerNameAr:
          `${row.first_name_ar || ""} ${row.last_name_ar || ""}`.trim(),
        photoUrl: row.photo_url,
        scores: new Map(),
      });
    }
    if (row.date) {
      const dateStr =
        typeof row.date === "string"
          ? row.date
          : (row.date as Date).toISOString().split("T")[0];
      playerMap.get(pid)!.scores.set(dateStr, Number(row.ring_score) || 0);
    }
  }

  return Array.from(playerMap.values()).map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    playerNameAr: p.playerNameAr,
    photoUrl: p.photoUrl,
    dailyScores: allDates.map((date) => ({
      date,
      ringScore: p.scores.get(date) ?? 0,
    })),
  }));
}

// ── Mood Heatmap (per-player daily mood scores from checkins) ──

export async function getMoodHeatmapData(days = 7, user?: AuthUser) {
  const { clause: playerScope, replacements: scopeReplacements } =
    buildPlayerScopeSQL(user);
  const today = todayLocal();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().split("T")[0];

  const rows: any[] = await sequelize.query(
    `SELECT
       p.id AS player_id,
       p.first_name, p.last_name,
       p.first_name_ar, p.last_name_ar,
       p.photo_url,
       wc.checkin_date AS date,
       wc.mood
     FROM players p
     LEFT JOIN wellness_checkins wc
       ON wc.player_id = p.id
       AND wc.checkin_date >= :startDate
       AND wc.checkin_date <= :today
     WHERE p.status = 'active' ${playerScope}
     ORDER BY p.first_name, p.last_name, wc.checkin_date`,
    {
      replacements: { startDate: startStr, today, ...scopeReplacements },
      type: QueryTypes.SELECT,
    },
  );

  const allDates: string[] = [];
  const d = new Date(startStr);
  const end = new Date(today);
  while (d <= end) {
    allDates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }

  const playerMap = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      playerNameAr: string;
      photoUrl: string | null;
      moods: Map<string, number | null>;
    }
  >();

  for (const row of rows) {
    const pid = row.player_id;
    if (!playerMap.has(pid)) {
      playerMap.set(pid, {
        playerId: pid,
        playerName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
        playerNameAr:
          `${row.first_name_ar || ""} ${row.last_name_ar || ""}`.trim(),
        photoUrl: row.photo_url,
        moods: new Map(),
      });
    }
    if (row.date) {
      const dateStr =
        typeof row.date === "string"
          ? row.date
          : (row.date as Date).toISOString().split("T")[0];
      playerMap
        .get(pid)!
        .moods.set(dateStr, row.mood != null ? Number(row.mood) : null);
    }
  }

  return Array.from(playerMap.values()).map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    playerNameAr: p.playerNameAr,
    photoUrl: p.photoUrl,
    dailyMoods: allDates.map((date) => ({
      date,
      mood: p.moods.has(date) ? (p.moods.get(date) ?? null) : null,
    })),
  }));
}

// ═══════════════════════════════════════════════════════════════
// DAILY CHECKIN (Readiness Survey)
// ═══════════════════════════════════════════════════════════════

/**
 * Create or update a daily pulse checkin for a player (upsert by player+date).
 * Auto-calculates readinessScore from sleep/fatigue/soreness/mood/stress fields.
 */
export async function createCheckin(
  body: {
    playerId: string;
    checkinDate: string;
    sleepHours?: number;
    sleepQuality?: number;
    fatigue?: number;
    muscleSoreness?: number;
    mood?: number;
    stress?: number;
    sorenessAreas?: string[];
    notes?: string;
    // Phase 5
    trainingType?: string;
    nutritionRating?: number;
    trainingBlockId?: string;
  },
  userId?: string,
) {
  const readinessScore = calculateReadinessScore(body);

  const [checkin] = await WellnessCheckin.upsert(
    {
      playerId: body.playerId,
      checkinDate: body.checkinDate,
      sleepHours: body.sleepHours ?? null,
      sleepQuality: body.sleepQuality ?? null,
      fatigue: body.fatigue ?? null,
      muscleSoreness: body.muscleSoreness ?? null,
      mood: body.mood ?? null,
      stress: body.stress ?? null,
      sorenessAreas: body.sorenessAreas ?? [],
      readinessScore,
      notes: body.notes ?? null,
      createdBy: userId ?? null,
      trainingType:
        (body.trainingType as import("./wellness.model").DailyPulseTrainingType) ??
        null,
      nutritionRating: body.nutritionRating ?? null,
      trainingBlockId: body.trainingBlockId ?? null,
    },
    { returning: true },
  );

  return checkin;
}

/**
 * List checkins for a player with pagination and date filtering.
 */
export async function listCheckins(
  playerId: string,
  query: { page?: number; limit?: number; from?: string; to?: string },
  user?: AuthUser,
) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const { limit, offset, page } = parsePagination(query);
  const where: any = { playerId };

  if (query.from || query.to) {
    where.checkinDate = {};
    if (query.from) where.checkinDate[Op.gte] = query.from;
    if (query.to) where.checkinDate[Op.lte] = query.to;
  }

  const { rows: data, count: total } = await WellnessCheckin.findAndCountAll({
    where,
    order: [["checkinDate", "DESC"]],
    limit,
    offset,
  });

  return { data, meta: buildMeta(total, page, limit) };
}

/**
 * Get a single checkin for a player on a specific date.
 */
export async function getCheckinByDate(
  playerId: string,
  date: string,
  user?: AuthUser,
) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  return WellnessCheckin.findOne({
    where: { playerId, checkinDate: date },
  });
}

/**
 * Get readiness trend for a player over the last N days.
 */
export async function getCheckinTrend(
  playerId: string,
  days = 28,
  user?: AuthUser,
) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString().split("T")[0];

  const checkins = await WellnessCheckin.findAll({
    where: {
      playerId,
      checkinDate: { [Op.gte]: fromStr },
    },
    order: [["checkinDate", "ASC"]],
    attributes: [
      "checkinDate",
      "sleepHours",
      "sleepQuality",
      "fatigue",
      "muscleSoreness",
      "mood",
      "stress",
      "readinessScore",
    ],
  });

  const scores = checkins.map((c) => c.readinessScore ?? 0);
  const avg =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return {
    days,
    checkins: checkins.map((c) => c.get({ plain: true })),
    averageReadiness: avg,
    totalCheckins: checkins.length,
  };
}
