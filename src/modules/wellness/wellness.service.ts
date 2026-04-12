// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.service.ts
// ═══════════════════════════════════════════════════════════════

import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import {
  WellnessProfile,
  WellnessWeightLog,
  WellnessFoodItem,
  WellnessMealLog,
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
import {
  searchFood as nutritionixSearch,
  mapToFoodItem,
} from "./nutrition.provider";
import type {
  CreateProfileInput,
  UpdateProfileInput,
  CreateWeightLogInput,
  CreateFoodItemInput,
  CreateMealLogInput,
  UpdateMealLogInput,
  CopyDayInput,
} from "./wellness.validation";
import type {
  MacroComputeResponse,
  WeightTrendResponse,
  DailyTotalsResponse,
  PlayerDashboardResponse,
  CoachOverviewResponse,
  CoachOverviewPlayer,
  TrafficLightStatus,
  DailySummaryResponse,
} from "./wellness.types";
import { calculateRingScore } from "./wellness.helpers";

// ══════════════════════════════════════════
// PROFILES
// ══════════════════════════════════════════

export async function getProfile(playerId: string, user?: AuthUser) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Wellness profile not found", 404);
  const profile = await WellnessProfile.findOne({ where: { playerId } });
  if (!profile) throw new AppError("Wellness profile not found", 404);
  return profile;
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
  const computed = await computeMacros(playerId, profile);
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

// ══════════════════════════════════════════
// FOOD ITEMS
// ══════════════════════════════════════════

/**
 * Search foods via Nutritionix API, caching results in our DB.
 * Falls back to local DB text search if API is not configured.
 */
export async function searchFoods(query: string) {
  if (!query.trim()) return [];

  try {
    // Try Nutritionix first
    const apiResults = await nutritionixSearch(query);
    if (apiResults.length > 0) {
      // Upsert results into our food_items table (fire-and-forget)
      upsertFoodItems(apiResults.map(mapToFoodItem)).catch(() => {});
      return apiResults.map(mapToFoodItem);
    }
  } catch {
    // Nutritionix not configured or failed — fall through to DB search
  }

  // Fallback: search local DB
  const rows = await WellnessFoodItem.findAll({
    where: {
      name: { [Op.iLike]: `%${query.trim()}%` },
    },
    limit: 30,
    order: [
      ["is_verified", "DESC"],
      ["name", "ASC"],
    ],
  });

  return rows.map((r) => r.get({ plain: true }));
}

/**
 * Bulk upsert food items from API results.
 */
async function upsertFoodItems(items: ReturnType<typeof mapToFoodItem>[]) {
  for (const item of items) {
    await WellnessFoodItem.findOrCreate({
      where: {
        externalId: item.externalId,
        source: item.source,
      },
      defaults: item as any,
    });
  }
}

/**
 * Create a custom food item (Admin only).
 */
export async function createFoodItem(body: CreateFoodItemInput) {
  return WellnessFoodItem.create({
    ...body,
    source: "custom",
    isVerified: false,
  } as any);
}

/**
 * Get a single food item by ID.
 */
export async function getFoodItem(id: string) {
  const item = await WellnessFoodItem.findByPk(id);
  if (!item) throw new AppError("Food item not found", 404);
  return item;
}

// ══════════════════════════════════════════
// MEAL LOGS
// ══════════════════════════════════════════

export async function listMealLogs(
  playerId: string,
  queryParams: any,
  user?: AuthUser,
) {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const where: any = { playerId };

  if (queryParams.date) {
    where.loggedDate = queryParams.date;
  }
  if (queryParams.mealType) {
    where.mealType = queryParams.mealType;
  }

  const { limit, offset, page } = parsePagination(queryParams, "logged_date");

  const { count, rows } = await WellnessMealLog.findAndCountAll({
    where,
    include: [
      {
        model: WellnessFoodItem,
        as: "foodItem",
        required: false,
      },
    ],
    limit,
    offset,
    order: [
      ["logged_date", "DESC"],
      ["created_at", "DESC"],
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function createMealLog(body: CreateMealLogInput) {
  const log = await WellnessMealLog.create(body as any);
  return log;
}

export async function updateMealLog(id: string, body: UpdateMealLogInput) {
  const log = await WellnessMealLog.findByPk(id);
  if (!log) throw new AppError("Meal log not found", 404);
  await log.update(body);
  return log;
}

export async function deleteMealLog(id: string) {
  const log = await WellnessMealLog.findByPk(id);
  if (!log) throw new AppError("Meal log not found", 404);
  await log.destroy();
}

/**
 * Copy all meals from one day to another for a player.
 */
export async function copyDay(body: CopyDayInput & { playerId: string }) {
  const { playerId, fromDate, toDate } = body;

  const sourceMeals = await WellnessMealLog.findAll({
    where: { playerId, loggedDate: fromDate },
  });

  if (sourceMeals.length === 0) {
    throw new AppError("No meals found on the source date to copy", 404);
  }

  const copied = await WellnessMealLog.bulkCreate(
    sourceMeals.map((m) => ({
      playerId,
      mealType: m.mealType,
      foodItemId: m.foodItemId,
      customName: m.customName,
      servings: m.servings,
      calories: m.calories,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      loggedDate: toDate,
      notes: m.notes,
    })),
  );

  return copied;
}

/**
 * Get daily meal totals with adherence percentages.
 */
export async function getDailyTotals(
  playerId: string,
  date: string,
  user?: AuthUser,
): Promise<DailyTotalsResponse> {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const meals = await WellnessMealLog.findAll({
    where: { playerId, loggedDate: date },
    include: [
      {
        model: WellnessFoodItem,
        as: "foodItem",
        required: false,
      },
    ],
    order: [
      ["meal_type", "ASC"],
      ["created_at", "ASC"],
    ],
  });

  const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0);
  const totalProteinG = meals.reduce((s, m) => s + Number(m.proteinG), 0);
  const totalCarbsG = meals.reduce((s, m) => s + Number(m.carbsG), 0);
  const totalFatG = meals.reduce((s, m) => s + Number(m.fatG), 0);

  // Get profile targets for adherence
  let calorieAdherencePct: number | null = null;
  let proteinAdherencePct: number | null = null;

  try {
    const profile = await WellnessProfile.findOne({ where: { playerId } });
    if (profile?.targetCalories) {
      calorieAdherencePct = Math.round(
        (totalCalories / Number(profile.targetCalories)) * 100,
      );
    }
    if (profile?.targetProteinG) {
      proteinAdherencePct = Math.round(
        (totalProteinG / Number(profile.targetProteinG)) * 100,
      );
    }
  } catch {
    // No profile — adherence stays null
  }

  return {
    date,
    totalCalories: Math.round(totalCalories),
    totalProteinG: Math.round(totalProteinG * 10) / 10,
    totalCarbsG: Math.round(totalCarbsG * 10) / 10,
    totalFatG: Math.round(totalFatG * 10) / 10,
    mealCount: meals.length,
    calorieAdherencePct,
    proteinAdherencePct,
    meals: meals.map((m) => m.get({ plain: true })) as any,
  };
}

// ══════════════════════════════════════════
// DASHBOARD (Phase 4)
// ══════════════════════════════════════════

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get player ring dashboard with today's stats and 7-day history.
 */
export async function getPlayerDashboard(
  playerId: string,
  days = 7,
  user?: AuthUser,
): Promise<PlayerDashboardResponse> {
  const ok = await checkRowAccess("wellness", { playerId }, user);
  if (!ok) throw new AppError("Not found", 404);
  const today = todayLocal();

  // Get profile targets
  const profile = await WellnessProfile.findOne({ where: { playerId } });
  const targetCalories = profile
    ? Number(profile.targetCalories) || null
    : null;
  const targetProteinG = profile
    ? Number(profile.targetProteinG) || null
    : null;

  // Get today's totals (reuse existing logic)
  const todayTotals = await getDailyTotals(playerId, today);

  // Check if workout completed today
  const [workoutRow]: any = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM wellness_workout_assignments
     WHERE player_id = :playerId AND assigned_date = :date AND status = 'completed'`,
    { replacements: { playerId, date: today }, type: QueryTypes.SELECT },
  );
  const workoutCompleted = Number(workoutRow?.cnt || 0) > 0;

  const ringScore = calculateRingScore(
    todayTotals.calorieAdherencePct ?? 0,
    todayTotals.proteinAdherencePct ?? 0,
    workoutCompleted,
  );

  // Get history from daily summaries
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const history: any[] = await sequelize.query(
    `SELECT summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g,
            calorie_adherence_pct, protein_adherence_pct, workout_completed, weight_logged, ring_score
     FROM wellness_daily_summaries
     WHERE player_id = :playerId AND summary_date >= :cutoff
     ORDER BY summary_date DESC`,
    { replacements: { playerId, cutoff: cutoffStr }, type: QueryTypes.SELECT },
  );

  return {
    today: {
      totalCalories: todayTotals.totalCalories,
      totalProteinG: todayTotals.totalProteinG,
      calorieAdherencePct: todayTotals.calorieAdherencePct,
      proteinAdherencePct: todayTotals.proteinAdherencePct,
      workoutCompleted,
      ringScore,
    },
    history: history.map((h) => ({
      summaryDate: h.summary_date,
      totalCalories: Number(h.total_calories),
      totalProteinG: Number(h.total_protein_g),
      totalCarbsG: Number(h.total_carbs_g),
      totalFatG: Number(h.total_fat_g),
      calorieAdherencePct:
        h.calorie_adherence_pct != null
          ? Number(h.calorie_adherence_pct)
          : null,
      proteinAdherencePct:
        h.protein_adherence_pct != null
          ? Number(h.protein_adherence_pct)
          : null,
      workoutCompleted: Boolean(h.workout_completed),
      weightLogged: Boolean(h.weight_logged),
      ringScore: Number(h.ring_score),
    })),
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

    // Last 3 days of summaries
    const summaries: any[] = await sequelize.query(
      `SELECT ring_score, workout_completed, summary_date
       FROM wellness_daily_summaries
       WHERE player_id = :playerId AND summary_date >= :cutoff
       ORDER BY summary_date DESC
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

    const avgRingScore =
      summaries.length > 0
        ? Math.round(
            summaries.reduce((s, r) => s + Number(r.ring_score), 0) /
              summaries.length,
          )
        : 0;
    const lastRingScore =
      summaries.length > 0 ? Number(summaries[0].ring_score) : 0;
    const missedWorkouts = summaries.filter((s) => !s.workout_completed).length;
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

  const rows: any[] = await sequelize.query(
    `SELECT
       p.id AS player_id,
       p.first_name, p.last_name,
       p.first_name_ar, p.last_name_ar,
       p.photo_url,
       ds.summary_date AS date,
       ds.ring_score
     FROM players p
     INNER JOIN wellness_profiles wp ON wp.player_id = p.id
     LEFT JOIN wellness_daily_summaries ds
       ON ds.player_id = p.id
       AND ds.summary_date >= :startDate
       AND ds.summary_date <= :today
     WHERE p.status = 'active' ${playerScope}
     ORDER BY p.first_name, p.last_name, ds.summary_date`,
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

// ═══════════════════════════════════════════════════════════════
// DAILY CHECKIN (Readiness Survey)
// ═══════════════════════════════════════════════════════════════

/**
 * Create or update a daily checkin for a player (upsert by player+date).
 * Auto-calculates readinessScore from the responses.
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
