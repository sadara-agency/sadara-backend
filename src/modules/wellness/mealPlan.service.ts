import { Op, WhereOptions } from "sequelize";
import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { MealPlan, MealPlanItem } from "./mealPlan.model";
import { WellnessFoodItem } from "./wellness.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateMealPlanInput,
  UpdateMealPlanInput,
  MealPlanQuery,
  MealPlanItemInput,
} from "./mealPlan.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
  "position",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function planIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "creator", attributes: [...USER_ATTRS] },
    {
      model: MealPlanItem,
      as: "items",
      separate: true,
      order: [
        ["day_of_week", "ASC"],
        ["sort_order", "ASC"],
      ] as [string, string][],
      include: [
        {
          model: WellnessFoodItem,
          as: "foodItem",
          attributes: [
            "id",
            "name",
            "nameAr",
            "calories",
            "proteinG",
            "carbsG",
            "fatG",
            "servingUnit",
          ],
          required: false,
        },
      ],
    },
  ];
}

function buildWhere(query: MealPlanQuery): WhereOptions {
  const where: any = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.status) where.status = query.status;
  return where;
}

// ── List ──

export async function listMealPlans(query: MealPlanQuery) {
  const where = buildWhere(query);
  const offset = (query.page - 1) * query.limit;

  const { rows: data, count: total } = await MealPlan.findAndCountAll({
    where,
    order: [[query.sort, query.order]],
    limit: query.limit,
    offset,
    include: planIncludes(),
    distinct: true,
  });

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getMealPlanById(id: string) {
  const plan = await MealPlan.findByPk(id, { include: planIncludes() });
  if (!plan) throw new AppError("Meal plan not found", 404);
  return plan;
}

// ── Get Active Plan ──

export async function getActivePlan(playerId: string) {
  const plan = await MealPlan.findOne({
    where: { playerId, status: "active" },
    include: planIncludes(),
    order: [["startDate", "DESC"]],
  });
  return plan;
}

// ── Create ──

export async function createMealPlan(
  body: CreateMealPlanInput,
  userId: string,
) {
  const { items, ...planData } = body;

  const plan = await MealPlan.create({
    ...planData,
    createdBy: userId,
  });

  if (items && items.length > 0) {
    await MealPlanItem.bulkCreate(
      items.map((item) => ({
        ...item,
        mealPlanId: plan.id,
      })),
    );
  }

  return getMealPlanById(plan.id);
}

// ── Update ──

export async function updateMealPlan(id: string, body: UpdateMealPlanInput) {
  const plan = await MealPlan.findByPk(id);
  if (!plan) throw new AppError("Meal plan not found", 404);

  const { items, ...planData } = body;

  await plan.update(planData);

  // If items are provided, replace all items
  if (items !== undefined) {
    await MealPlanItem.destroy({ where: { mealPlanId: id } });
    if (items.length > 0) {
      await MealPlanItem.bulkCreate(
        items.map((item) => ({
          ...item,
          mealPlanId: id,
        })),
      );
    }
  }

  return getMealPlanById(id);
}

// ── Delete ──

export async function deleteMealPlan(id: string) {
  const plan = await MealPlan.findByPk(id);
  if (!plan) throw new AppError("Meal plan not found", 404);

  await plan.destroy(); // Items cascade
  return { id };
}

// ── Adherence Report ──

export async function getAdherenceReport(
  planId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const plan = await MealPlan.findByPk(planId, {
    include: [{ model: MealPlanItem, as: "items" }],
  });
  if (!plan) throw new AppError("Meal plan not found", 404);

  const from = dateFrom || plan.startDate;
  const to = dateTo || plan.endDate;

  // Get actual meal logs for the period
  const actualMeals = await sequelize.query<{
    logged_date: string;
    meal_type: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    meal_count: number;
  }>(
    `SELECT
       logged_date,
       meal_type,
       SUM(calories)::numeric AS total_calories,
       SUM(protein_g)::numeric AS total_protein,
       SUM(carbs_g)::numeric AS total_carbs,
       SUM(fat_g)::numeric AS total_fat,
       COUNT(*)::int AS meal_count
     FROM wellness_meal_logs
     WHERE player_id = :playerId
       AND logged_date >= :from
       AND logged_date <= :to
     GROUP BY logged_date, meal_type
     ORDER BY logged_date, meal_type`,
    {
      replacements: { playerId: plan.playerId, from, to },
      type: QueryTypes.SELECT,
    },
  );

  // Calculate daily planned totals
  const plannedItems = plan.items || [];
  const plannedDailyTotals = {
    calories: plannedItems.reduce(
      (sum, i) => sum + (Number(i.calories) || 0),
      0,
    ),
    protein: plannedItems.reduce(
      (sum, i) => sum + (Number(i.proteinG) || 0),
      0,
    ),
    carbs: plannedItems.reduce((sum, i) => sum + (Number(i.carbsG) || 0), 0),
    fat: plannedItems.reduce((sum, i) => sum + (Number(i.fatG) || 0), 0),
  };

  // Group actual meals by date
  const byDate = new Map<
    string,
    { calories: number; protein: number; carbs: number; fat: number }
  >();
  for (const row of actualMeals) {
    const existing = byDate.get(row.logged_date) || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    byDate.set(row.logged_date, {
      calories: existing.calories + Number(row.total_calories),
      protein: existing.protein + Number(row.total_protein),
      carbs: existing.carbs + Number(row.total_carbs),
      fat: existing.fat + Number(row.total_fat),
    });
  }

  // Calculate adherence per day
  const dailyAdherence = Array.from(byDate.entries()).map(([date, actual]) => ({
    date,
    planned: plannedDailyTotals,
    actual,
    adherence: {
      calories:
        plannedDailyTotals.calories > 0
          ? Math.round((actual.calories / plannedDailyTotals.calories) * 100)
          : null,
      protein:
        plannedDailyTotals.protein > 0
          ? Math.round((actual.protein / plannedDailyTotals.protein) * 100)
          : null,
    },
  }));

  // Overall average adherence
  const avgCalorieAdherence =
    dailyAdherence.length > 0
      ? Math.round(
          dailyAdherence.reduce(
            (sum, d) => sum + (d.adherence.calories || 0),
            0,
          ) / dailyAdherence.length,
        )
      : 0;

  return {
    planId,
    playerId: plan.playerId,
    period: { from, to },
    plannedDailyTotals,
    daysLogged: dailyAdherence.length,
    avgCalorieAdherence,
    dailyAdherence,
  };
}
