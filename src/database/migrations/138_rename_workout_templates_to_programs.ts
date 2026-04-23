// ═══════════════════════════════════════════════════════════════
// Migration 138: Rename wellness_workout_templates → development_programs
//                Rename wellness_template_exercises → program_exercises
//
// Adds four new columns to development_programs:
//   duration_weeks, phase, program_type, training_block_id
//
// Also adds a FK index on training_block_id.
// down() reverses in reverse order.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_workout_templates' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // 1. Rename tables (idempotent — skip if target already exists)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wellness_workout_templates')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'development_programs') THEN
        ALTER TABLE wellness_workout_templates RENAME TO development_programs;
      END IF;
    END $$;
  `);
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wellness_template_exercises')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'program_exercises') THEN
        ALTER TABLE wellness_template_exercises RENAME TO program_exercises;
      END IF;
    END $$;
  `);

  // 2. Add new columns to development_programs (idempotent)
  await sequelize.query(`
    ALTER TABLE development_programs
      ADD COLUMN IF NOT EXISTS duration_weeks  INTEGER       NOT NULL DEFAULT 4,
      ADD COLUMN IF NOT EXISTS phase           VARCHAR(30),
      ADD COLUMN IF NOT EXISTS program_type    VARCHAR(30)   NOT NULL DEFAULT 'gym',
      ADD COLUMN IF NOT EXISTS training_block_id UUID;
  `);

  // 3. Add FK constraint for training_block_id
  try {
    await sequelize.query(`
      ALTER TABLE development_programs
        ADD CONSTRAINT fk_development_programs_training_block
        FOREIGN KEY (training_block_id) REFERENCES training_blocks(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists (idempotent)
  }

  // 4. Index on training_block_id for block-scoped queries
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_development_programs_training_block
    ON development_programs (training_block_id);
  `);

  console.log(
    "Migration 138: wellness_workout_templates → development_programs, " +
      "wellness_template_exercises → program_exercises",
  );
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_workout_templates' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  // Reverse in opposite order
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_development_programs_training_block;`,
  );

  try {
    await sequelize.query(`
      ALTER TABLE development_programs
        DROP CONSTRAINT IF EXISTS fk_development_programs_training_block;
    `);
  } catch {
    // Ignore
  }

  await sequelize.query(`
    ALTER TABLE development_programs
      DROP COLUMN IF EXISTS training_block_id,
      DROP COLUMN IF EXISTS program_type,
      DROP COLUMN IF EXISTS phase,
      DROP COLUMN IF EXISTS duration_weeks;
  `);

  await sequelize.query(
    `ALTER TABLE program_exercises RENAME TO wellness_template_exercises;`,
  );
  await sequelize.query(
    `ALTER TABLE development_programs RENAME TO wellness_workout_templates;`,
  );

  console.log(
    "Migration 138: reverted development_programs → wellness_workout_templates",
  );
}
