// ─────────────────────────────────────────────────────────────
// src/scripts/seed-foods.ts
//
// Seeds food_items table from USDA FoodData Central foundation
// food JSON. Safe to re-run — upserts on fdcId.
//
// Usage: npm run seed:foods
// ─────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import { sequelize } from "@config/database";
import { FoodItem } from "@modules/wellness/foodItem.model";
import { logger } from "@config/logger";

const JSON_PATH = path.resolve(
  __dirname,
  "../../../..",
  "docs/FoodData_Central_foundation_food_json_2026-04-30.json",
);

interface SourceNutrient {
  nutrient: { name: string; unitName: string };
  amount: number;
}

interface SourcePortion {
  gramWeight: number;
  measureUnit: { name: string; abbreviation: string };
  amount: number;
}

interface SourceFood {
  fdcId: number;
  description: string;
  foodCategory?: { description: string };
  foodNutrients: SourceNutrient[];
  foodPortions?: SourcePortion[];
}

interface FoodDataCentral {
  FoundationFoods: SourceFood[];
}

function getNutrient(
  nutrients: SourceNutrient[],
  ...names: string[]
): number | null {
  for (const name of names) {
    const found = nutrients.find((n) =>
      n.nutrient.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (found != null) return found.amount;
  }
  return null;
}

function getCaloriesKcal(nutrients: SourceNutrient[]): number | null {
  const kcal = nutrients.find(
    (n) =>
      n.nutrient.name.toLowerCase().includes("energy") &&
      n.nutrient.unitName.toLowerCase() === "kcal",
  );
  return kcal?.amount ?? null;
}

function getServing(portions?: SourcePortion[]): {
  defaultServingG: number;
  servingLabel: string | null;
} {
  if (!portions || portions.length === 0) {
    return { defaultServingG: 100, servingLabel: null };
  }
  const p = portions[0];
  const label =
    p.amount > 0
      ? `${p.amount} ${p.measureUnit.abbreviation ?? p.measureUnit.name}`
      : null;
  return {
    defaultServingG: p.gramWeight > 0 ? p.gramWeight : 100,
    servingLabel: label,
  };
}

async function main() {
  await sequelize.authenticate();
  logger.info("DB connected — starting food seed");

  if (!fs.existsSync(JSON_PATH)) {
    logger.error(`JSON file not found at: ${JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  const data: FoodDataCentral = JSON.parse(raw);
  const foods = data.FoundationFoods;
  logger.info(`Loaded ${foods.length} foundation foods`);

  let inserted = 0;
  let updated = 0;

  for (const food of foods) {
    const { defaultServingG, servingLabel } = getServing(food.foodPortions);
    const [, created] = await FoodItem.upsert({
      fdcId: food.fdcId,
      name: food.description,
      nameAr: null,
      category: food.foodCategory?.description ?? null,
      calories: getCaloriesKcal(food.foodNutrients),
      proteinG: getNutrient(food.foodNutrients, "protein"),
      carbsG: getNutrient(
        food.foodNutrients,
        "carbohydrate, by difference",
        "carbohydrate, by summation",
      ),
      fatG: getNutrient(food.foodNutrients, "total lipid (fat)"),
      fiberG: getNutrient(food.foodNutrients, "fiber, total dietary"),
      sodiumMg: getNutrient(food.foodNutrients, "sodium, na"),
      defaultServingG,
      servingLabel,
      source: "usda",
    });
    if (created) inserted++;
    else updated++;
  }

  logger.info(`Done — ${inserted} inserted, ${updated} updated`);
  await sequelize.close();
}

main().catch((err) => {
  logger.error("seed-foods failed", err);
  process.exit(1);
});
