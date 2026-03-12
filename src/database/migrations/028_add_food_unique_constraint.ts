// 028_add_food_unique_constraint.ts
// Adds unique constraints on food_database.name_en and exercise_library.name_en
// to prevent duplicate items from repeated seeds. Removes existing duplicates first.

import { sequelize } from "@config/database";

export async function up() {
  // ── Food database: remove duplicates, add unique constraint ──
  await sequelize.query(`
    DELETE FROM food_database
    WHERE id NOT IN (
      SELECT MIN(id::text)::uuid
      FROM food_database
      GROUP BY name_en
    );
  `);

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE food_database ADD CONSTRAINT uq_food_name_en UNIQUE (name_en);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // ── Exercise library: remove duplicates, add unique constraint ──
  await sequelize.query(`
    DELETE FROM exercise_library
    WHERE id NOT IN (
      SELECT MIN(id::text)::uuid
      FROM exercise_library
      GROUP BY name_en
    );
  `);

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE exercise_library ADD CONSTRAINT uq_exercise_name_en UNIQUE (name_en);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(
    `ALTER TABLE food_database DROP CONSTRAINT IF EXISTS uq_food_name_en;`,
  );
  await sequelize.query(
    `ALTER TABLE exercise_library DROP CONSTRAINT IF EXISTS uq_exercise_name_en;`,
  );
}
