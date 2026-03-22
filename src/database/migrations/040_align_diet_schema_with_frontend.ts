// 040_align_diet_schema_with_frontend.ts
// Aligns the diet/gym schema with the frontend's expected field names:
// 1. diet_plans: rename target_protein → protein_g, target_carbs → carbs_g, target_fat → fat_g
// 2. diet_meals: add name_en, name_ar columns
// 3. diet_meal_items: rename serving_size → portion_size, serving_unit → portion_unit
// 4. diet_adherence: update status enum values (consumed → ate)

import { sequelize } from "@config/database";

export async function up() {
  // ── 1. Diet Plans: rename macro columns ──
  await sequelize.query(`
    ALTER TABLE diet_plans
      RENAME COLUMN target_protein TO protein_g;
  `);
  await sequelize.query(`
    ALTER TABLE diet_plans
      RENAME COLUMN target_carbs TO carbs_g;
  `);
  await sequelize.query(`
    ALTER TABLE diet_plans
      RENAME COLUMN target_fat TO fat_g;
  `);

  // ── 2. Diet Meals: add name columns ──
  await sequelize.query(`
    ALTER TABLE diet_meals
      ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
      ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200);
  `);

  // ── 3. Diet Meal Items: rename serving → portion ──
  await sequelize.query(`
    ALTER TABLE diet_meal_items
      RENAME COLUMN serving_size TO portion_size;
  `);
  await sequelize.query(`
    ALTER TABLE diet_meal_items
      RENAME COLUMN serving_unit TO portion_unit;
  `);

  // ── 4. Diet Adherence: rename consumed → ate ──
  await sequelize.query(`
    UPDATE diet_adherence SET status = 'ate' WHERE status = 'consumed';
  `);
}

export async function down() {
  // ── 1. Revert diet_plans column names ──
  await sequelize.query(
    `ALTER TABLE diet_plans RENAME COLUMN protein_g TO target_protein;`,
  );
  await sequelize.query(
    `ALTER TABLE diet_plans RENAME COLUMN carbs_g TO target_carbs;`,
  );
  await sequelize.query(
    `ALTER TABLE diet_plans RENAME COLUMN fat_g TO target_fat;`,
  );

  // ── 2. Drop diet_meals name columns ──
  await sequelize.query(`
    ALTER TABLE diet_meals
      DROP COLUMN IF EXISTS name_en,
      DROP COLUMN IF EXISTS name_ar;
  `);

  // ── 3. Revert diet_meal_items column names ──
  await sequelize.query(
    `ALTER TABLE diet_meal_items RENAME COLUMN portion_size TO serving_size;`,
  );
  await sequelize.query(
    `ALTER TABLE diet_meal_items RENAME COLUMN portion_unit TO serving_unit;`,
  );

  // ── 4. Revert adherence status ──
  await sequelize.query(
    `UPDATE diet_adherence SET status = 'consumed' WHERE status = 'ate';`,
  );
}
