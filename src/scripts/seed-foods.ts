// ─────────────────────────────────────────────────────────────
// src/scripts/seed-foods.ts
//
// Seeds food_items table from USDA FoodData Central foundation
// food JSON. Safe to re-run — upserts on fdcId. Populates Arabic
// names from the curated map in food-translations.ar.ts.
//
// Local DB:       npm run seed:foods
// Production DB:  npm run seed:foods:prod   (needs Cloud SQL Auth
//                 Proxy running + .env.production.proxy.local)
//
// The JSON path can be overridden with FOODDATA_JSON; by default it
// resolves to <repo-root>/FoodData_Central_foundation_food_json_2026-04-30.json
// ─────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import { sequelize } from "@config/database";
import { FoodItem } from "@modules/wellness/foodItem.model";
import { logger } from "@config/logger";
import { FOOD_NAME_AR } from "./food-translations.ar";

const NAME_MAX = 255;
const SERVING_LABEL_MAX = 50;

const JSON_PATH =
  process.env.FOODDATA_JSON ??
  path.resolve(
    __dirname,
    "../../..",
    "FoodData_Central_foundation_food_json_2026-04-30.json",
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
  FoundationFoods: (SourceFood | null)[];
}

function isUsableFood(f: SourceFood | null): f is SourceFood {
  return (
    f != null &&
    typeof f.fdcId === "number" &&
    typeof f.description === "string" &&
    f.description.length > 0 &&
    Array.isArray(f.foodNutrients)
  );
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
  const rawLabel =
    p.amount > 0
      ? `${p.amount} ${p.measureUnit.abbreviation ?? p.measureUnit.name}`
      : null;
  return {
    defaultServingG: p.gramWeight > 0 ? p.gramWeight : 100,
    servingLabel: truncate(rawLabel, SERVING_LABEL_MAX, "serving label"),
  };
}

function truncate(
  value: string | null,
  max: number,
  what: string,
): string | null {
  if (value == null) return null;
  if (value.length <= max) return value;
  logger.warn(`Truncating ${what} (${value.length} > ${max}): "${value}"`);
  return value.slice(0, max);
}

async function main() {
  await sequelize.authenticate();
  logger.info(`DB connected — starting food seed (source: ${JSON_PATH})`);

  if (!fs.existsSync(JSON_PATH)) {
    logger.error(`JSON file not found at: ${JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  const data: FoodDataCentral = JSON.parse(raw);
  const allEntries = Array.isArray(data.FoundationFoods)
    ? data.FoundationFoods
    : [];
  const foods = allEntries.filter(isUsableFood);
  const skipped = allEntries.length - foods.length;
  logger.info(
    `Loaded ${allEntries.length} entries — ${foods.length} usable, ${skipped} skipped (null/malformed)`,
  );

  let inserted = 0;
  let updated = 0;
  let arCovered = 0;

  for (const food of foods) {
    const { defaultServingG, servingLabel } = getServing(food.foodPortions);
    // Normalize whitespace before map lookup: collapse runs of whitespace
    // (including non-breaking spaces U+00A0) and trim trailing spaces.
    const normalizedDesc = food.description.replace(/[\s\u00a0]+/g, " ").trim();
    const nameAr =
      FOOD_NAME_AR[food.description] ?? FOOD_NAME_AR[normalizedDesc] ?? null;
    if (nameAr != null) arCovered++;

    const [, created] = await FoodItem.upsert({
      fdcId: food.fdcId,
      name: truncate(food.description, NAME_MAX, "name") ?? food.description,
      nameAr: truncate(nameAr, NAME_MAX, "Arabic name"),
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

  const missingAr = foods.length - arCovered;
  logger.info(
    `Done — ${inserted} inserted, ${updated} updated, ${skipped} skipped; ` +
      `Arabic names: ${arCovered}/${foods.length} (${missingAr} still null)`,
  );
  await sequelize.close();
}

main().catch((err) => {
  logger.error("seed-foods failed", err);
  process.exit(1);
});
