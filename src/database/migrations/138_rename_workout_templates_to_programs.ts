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
  // 1. Rename tables
  await sequelize.query(
    `ALTER TABLE wellness_workout_templates RENAME TO development_programs;`,
  );
  await sequelize.query(
    `ALTER TABLE wellness_template_exercises RENAME TO program_exercises;`,
  );

  // 2. Add new columns to development_programs
  await sequelize.query(`
    ALTER TABLE development_programs
      ADD COLUMN duration_weeks  INTEGER       NOT NULL DEFAULT 4,
      ADD COLUMN phase           VARCHAR(30),
      ADD COLUMN program_type    VARCHAR(30)   NOT NULL DEFAULT 'gym',
      ADD COLUMN training_block_id UUID;
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
