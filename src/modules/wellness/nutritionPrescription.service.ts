import { Op } from "sequelize";
import {
  NutritionPrescription,
  PrescriptionMeal,
  PrescriptionMealItem,
  type TriggeringReason,
} from "./nutritionPrescription.model";
import { FoodItem } from "./foodItem.model";
import type {
  IssuePrescriptionDTO,
  UpdatePrescriptionDTO,
  ListPrescriptionsQueryDTO,
  CreateFoodItemDTO,
  UpdateFoodItemDTO,
  ListFoodItemsDTO,
} from "./nutritionPrescription.validation";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { sequelize as db } from "@config/database";

export async function listPrescriptions(
  query: ListPrescriptionsQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, playerId, currentOnly } = query;
  const where: any = {};
  if (playerId) where.playerId = playerId;
  if (currentOnly) where.supersededAt = null;

  const scope = await buildRowScope("wellness", user);
  if (scope) mergeScope(where, scope);

  const { rows, count } = await NutritionPrescription.findAndCountAll({
    where,
    include: [
      {
        model: PrescriptionMeal,
        as: "meals",
        include: [
          {
            model: PrescriptionMealItem,
            as: "items",
            include: [{ model: FoodItem, as: "food" }],
          },
        ],
      },
    ],
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getCurrentPrescription(
  playerId: string,
  user?: AuthUser,
): Promise<NutritionPrescription | null> {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) return null;

  return NutritionPrescription.findOne({
    where: { playerId, supersededAt: null },
    include: [
      {
        model: PrescriptionMeal,
        as: "meals",
        include: [
          {
            model: PrescriptionMealItem,
            as: "items",
            include: [{ model: FoodItem, as: "food" }],
          },
        ],
      },
    ],
    order: [["versionNumber", "DESC"]],
  });
}

export async function getVersionHistory(
  playerId: string,
  user?: AuthUser,
): Promise<NutritionPrescription[]> {
  const allowed = await checkRowAccess("wellness", { playerId }, user);
  if (!allowed) return [];

  return NutritionPrescription.findAll({
    where: { playerId },
    include: [
      {
        model: PrescriptionMeal,
        as: "meals",
        include: [
          {
            model: PrescriptionMealItem,
            as: "items",
            include: [{ model: FoodItem, as: "food" }],
          },
        ],
      },
    ],
    order: [["versionNumber", "DESC"]],
  });
}

export async function getPrescriptionById(
  id: string,
  user?: AuthUser,
): Promise<NutritionPrescription> {
  const prescription = await NutritionPrescription.findByPk(id, {
    include: [
      {
        model: PrescriptionMeal,
        as: "meals",
        include: [
          {
            model: PrescriptionMealItem,
            as: "items",
            include: [{ model: FoodItem, as: "food" }],
          },
        ],
      },
    ],
  });
  if (!prescription) throw new AppError("Prescription not found", 404);

  const allowed = await checkRowAccess(
    "wellness",
    { playerId: prescription.playerId },
    user,
  );
  if (!allowed) throw new AppError("Prescription not found", 404);

  return prescription;
}

export async function issuePrescription(
  data: IssuePrescriptionDTO,
  userId: string,
): Promise<NutritionPrescription> {
  const existing = await NutritionPrescription.findOne({
    where: { playerId: data.playerId, supersededAt: null },
  });
  if (existing) {
    throw new AppError(
      "Player already has an active prescription. Use reissue to create a new version.",
      409,
    );
  }

  const { meals, ...prescriptionData } = data;

  const prescription = await db.transaction(async (t) => {
    const rx = await NutritionPrescription.create(
      {
        ...prescriptionData,
        versionNumber: 1,
        issuedBy: userId,
        triggeringReason: "manual",
      },
      { transaction: t },
    );

    if (meals && meals.length > 0) {
      for (const [idx, meal] of meals.entries()) {
        const mealRow = await PrescriptionMeal.create(
          {
            prescriptionId: rx.id,
            customName: meal.customName,
            sortOrder: meal.sortOrder ?? idx,
          },
          { transaction: t },
        );

        if (meal.items.length > 0) {
          // Only look up library items (null foodItemId = manual entry)
          const libraryIds = meal.items
            .map((i) => i.foodItemId)
            .filter((id): id is string => !!id);

          const foodMap = new Map<string, FoodItem>();
          if (libraryIds.length > 0) {
            const foods = await FoodItem.findAll({
              where: { id: libraryIds },
              transaction: t,
            });
            foods.forEach((f) => foodMap.set(f.id, f));
          }

          await PrescriptionMealItem.bulkCreate(
            meal.items.map((item) => {
              if (!item.foodItemId) {
                // Manual item: store client-supplied macros as-is
                return {
                  mealId: mealRow.id,
                  foodItemId: null,
                  name: item.name ?? null,
                  servings: item.servings,
                  calories: item.calories ?? null,
                  proteinG: item.proteinG ?? null,
                  carbsG: item.carbsG ?? null,
                  fatG: item.fatG ?? null,
                };
              }
              const food = foodMap.get(item.foodItemId);
              const scale = food
                ? item.servings * (food.defaultServingG / 100)
                : item.servings;
              return {
                mealId: mealRow.id,
                foodItemId: item.foodItemId,
                name: null,
                servings: item.servings,
                calories:
                  food?.calories != null
                    ? +(food.calories * scale).toFixed(1)
                    : null,
                proteinG:
                  food?.proteinG != null
                    ? +(food.proteinG * scale).toFixed(2)
                    : null,
                carbsG:
                  food?.carbsG != null
                    ? +(food.carbsG * scale).toFixed(2)
                    : null,
                fatG:
                  food?.fatG != null ? +(food.fatG * scale).toFixed(2) : null,
              };
            }),
            { transaction: t },
          );
        }
      }
    }

    return rx;
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return getPrescriptionById(prescription.id);
}

/**
 * Creates a new prescription version triggered by a scan, injury, or manual
 * reissue. Copies macro targets and meal structure from the superseded version.
 * Returns null if the player has no current prescription (caller handles silently).
 */
export async function issueNewVersion(
  playerId: string,
  reason: TriggeringReason,
  triggeringScanId?: string,
  userId?: string,
): Promise<NutritionPrescription | null> {
  const current = await NutritionPrescription.findOne({
    where: { playerId, supersededAt: null },
    include: [
      {
        model: PrescriptionMeal,
        as: "meals",
        include: [
          {
            model: PrescriptionMealItem,
            as: "items",
            include: [{ model: FoodItem, as: "food" }],
          },
        ],
      },
    ],
  });

  if (!current) return null;

  const newVersion = await NutritionPrescription.create({
    playerId,
    versionNumber: current.versionNumber + 1,
    issuedBy: userId ?? current.issuedBy,
    triggeringReason: reason,
    triggeringScanId: triggeringScanId ?? null,
    targetCalories: current.targetCalories,
    targetProteinG: current.targetProteinG,
    targetCarbsG: current.targetCarbsG,
    targetFatG: current.targetFatG,
    hydrationTargetMl: current.hydrationTargetMl,
    preTrainingGuidance: current.preTrainingGuidance,
    postTrainingGuidance: current.postTrainingGuidance,
    notes: current.notes,
  });

  if (current.meals && current.meals.length > 0) {
    for (const m of current.meals) {
      const newMeal = await PrescriptionMeal.create({
        prescriptionId: newVersion.id,
        dayOfWeek: m.dayOfWeek,
        mealType: m.mealType,
        customName: m.customName,
        description: m.description,
        sortOrder: m.sortOrder,
        notes: m.notes,
      });

      if (m.items && m.items.length > 0) {
        await PrescriptionMealItem.bulkCreate(
          m.items.map((item) => ({
            mealId: newMeal.id,
            foodItemId: item.foodItemId,
            name: item.name,
            servings: item.servings,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
          })),
        );
      }
    }
  }

  await current.update({
    supersededAt: new Date(),
    supersededBy: newVersion.id,
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return newVersion;
}

export async function updatePrescription(
  id: string,
  data: UpdatePrescriptionDTO,
): Promise<NutritionPrescription> {
  const prescription = await getPrescriptionById(id);
  if (prescription.supersededAt) {
    throw new AppError("Cannot update a superseded prescription", 422);
  }
  await prescription.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return prescription;
}

export async function deletePrescription(id: string): Promise<{ id: string }> {
  const prescription = await getPrescriptionById(id);
  if (prescription.supersededAt) {
    throw new AppError("Cannot delete a superseded prescription", 422);
  }
  await prescription.destroy();
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { id };
}

export async function searchFoods(q: string, limit = 20): Promise<FoodItem[]> {
  const safeLimit = Math.min(limit, 50);
  const term = q.trim();
  const pattern = `%${term}%`;

  // Arabic text: always use iLike on name_ar (GIN index is English-only)
  const isArabic = /[؀-ۿ]/.test(term);

  if (isArabic || term.length < 3) {
    return FoodItem.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: pattern } },
          { nameAr: { [Op.iLike]: pattern } },
        ],
      },
      limit: safeLimit,
      order: [["name", "ASC"]],
    });
  }

  // English full-text via GIN index, fall back to iLike on both columns
  const ftResults = await FoodItem.findAll({
    where: db.where(db.fn("to_tsvector", "english", db.col("name")), {
      [Op.match]: db.fn("plainto_tsquery", "english", term),
    }),
    limit: safeLimit,
    order: [["name", "ASC"]],
  });

  if (ftResults.length > 0) return ftResults;

  return FoodItem.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: pattern } },
        { nameAr: { [Op.iLike]: pattern } },
      ],
    },
    limit: safeLimit,
    order: [["name", "ASC"]],
  });
}

// ── Food Library CRUD ─────────────────────────────────────────────────────────

function deriveMacroType(item: FoodItem): string[] {
  if (item.macroType && item.macroType.length > 0) return item.macroType;
  const derived: string[] = [];
  if ((item.proteinG ?? 0) >= 10) derived.push("protein");
  if ((item.carbsG ?? 0) >= 20) derived.push("carb");
  if ((item.fatG ?? 0) >= 10) derived.push("fat");
  return derived;
}

export async function listFoodItems(query: ListFoodItemsDTO) {
  const { q, category, macroType, page, limit } = query;

  const where: any = {};

  if (q?.trim()) {
    const term = q.trim();
    const pattern = `%${term}%`;
    const isArabic = /[؀-ۿ]/.test(term);
    if (isArabic || term.length < 3) {
      where[Op.or] = [
        { name: { [Op.iLike]: pattern } },
        { nameAr: { [Op.iLike]: pattern } },
      ];
    } else {
      where[Op.or] = [
        db.where(db.fn("to_tsvector", "english", db.col("name")), {
          [Op.match]: db.fn("plainto_tsquery", "english", term),
        }),
        { name: { [Op.iLike]: pattern } },
        { nameAr: { [Op.iLike]: pattern } },
      ];
    }
  }

  if (category) {
    where.category = { [Op.iLike]: `%${category}%` };
  }

  // macroType filter: use stored tag or derive from thresholds
  if (macroType) {
    const thresholds: Record<string, object> = {
      protein: { proteinG: { [Op.gte]: 10 } },
      carb: { carbsG: { [Op.gte]: 20 } },
      fat: { fatG: { [Op.gte]: 10 } },
    };
    where[Op.and] = [
      {
        [Op.or]: [
          { macroType: { [Op.contains]: [macroType] } },
          thresholds[macroType],
        ],
      },
    ];
  }

  const { rows, count } = await FoodItem.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["name", "ASC"]],
  });

  const data = rows.map((item) => ({
    ...item.toJSON(),
    macroType: deriveMacroType(item),
  }));

  return { data, meta: buildMeta(count, page, limit) };
}

export async function getFoodItemById(id: string) {
  const item = await FoodItem.findByPk(id);
  if (!item) throw new AppError("Food item not found", 404);
  return { ...item.toJSON(), macroType: deriveMacroType(item) };
}

export async function createFoodItem(data: CreateFoodItemDTO) {
  const { defaultServingG, ...rest } = data;
  const item = await FoodItem.create({
    source: "manual",
    ...rest,
    defaultServingG: defaultServingG ?? 100,
  });
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { ...item.toJSON(), macroType: deriveMacroType(item) };
}

export async function updateFoodItem(id: string, data: UpdateFoodItemDTO) {
  const item = await FoodItem.findByPk(id);
  if (!item) throw new AppError("Food item not found", 404);
  await item.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { ...item.toJSON(), macroType: deriveMacroType(item) };
}

export async function deleteFoodItem(id: string) {
  const item = await FoodItem.findByPk(id);
  if (!item) throw new AppError("Food item not found", 404);
  await item.destroy();
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { id };
}
