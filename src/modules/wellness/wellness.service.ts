// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.service.ts
// ═══════════════════════════════════════════════════════════════

import { Op } from "sequelize";
import {
  WellnessProfile,
  WellnessWeightLog,
  WellnessFoodItem,
  WellnessMealLog,
} from "./wellness.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateBMI,
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
} from "./wellness.schema";
import type {
  MacroComputeResponse,
  WeightTrendResponse,
  DailyTotalsResponse,
} from "./wellness.types";

// ══════════════════════════════════════════
// PROFILES
// ══════════════════════════════════════════

export async function getProfile(playerId: string) {
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

export async function listWeightLogs(playerId: string, queryParams: any) {
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
): Promise<WeightTrendResponse> {
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

export async function listMealLogs(playerId: string, queryParams: any) {
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
): Promise<DailyTotalsResponse> {
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
