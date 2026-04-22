// ═══════════════════════════════════════════════════════════════
// Migration 139: Archive meal_plans + meal_plan_items (Phase 3 leftovers)
//                Archive wellness_workout_logs (per-set data)
//                Rename wellness_workout_assignments → development_sessions
//
// Column renames on development_sessions:
//   template_id  → program_id
//   assigned_date → scheduled_date
//   assigned_by  → prescribed_by
//
// New columns on development_sessions:
//   session_type, overall_rpe, actual_duration_minutes, session_note
//
// down() reverses in reverse order.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  // 1. Archive Phase 3 leftovers (meal_plans was never renamed in migration 136)
  await sequelize.query(
    `ALTER TABLE meal_plan_items RENAME TO _archive_meal_plan_items_20260422;`,
  );
  await sequelize.query(
    `ALTER TABLE meal_plans RENAME TO _archive_meal_plans_20260422;`,
  );

  // 2. Archive per-set workout logs
  await sequelize.query(
    `ALTER TABLE wellness_workout_logs RENAME TO _archive_workout_logs_20260422;`,
  );

  // 3. Rename assignments → development_sessions
  await sequelize.query(
    `ALTER TABLE wellness_workout_assignments RENAME TO development_sessions;`,
  );

  // 4. Column renames
  await sequelize.query(
    `ALTER TABLE development_sessions RENAME COLUMN template_id TO program_id;`,
  );
  await sequelize.query(
    `ALTER TABLE development_sessions RENAME COLUMN assigned_date TO scheduled_date;`,
  );
  await sequelize.query(
    `ALTER TABLE development_sessions RENAME COLUMN assigned_by TO prescribed_by;`,
  );

  // 5. Add new columns
  await sequelize.query(`
    ALTER TABLE development_sessions
      ADD COLUMN session_type            VARCHAR(30) NOT NULL DEFAULT 'development_gym',
      ADD COLUMN overall_rpe             DECIMAL(3,1),
      ADD COLUMN actual_duration_minutes INTEGER,
      ADD COLUMN session_note            TEXT;
  `);

  // 6. Index for player+date lookups
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_development_sessions_player_date
    ON development_sessions (player_id, scheduled_date DESC);
  `);

  console.log(
    "Migration 139: meal_plans → archived, wellness_workout_logs → archived, " +
      "wellness_workout_assignments → development_sessions",
  );
}

export async function down() {
  // Reverse in exact opposite order
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_development_sessions_player_date;`,
  );

  await sequelize.query(`
    ALTER TABLE development_sessions
      DROP COLUMN IF EXISTS session_note,
      DROP COLUMN IF EXISTS actual_duration_minutes,
      DROP COLUMN IF EXISTS overall_rpe,
      DROP COLUMN IF EXISTS session_type;
  `);

  await sequelize.query(
    `ALTER TABLE development_sessions RENAME COLUMN prescribed_by TO assigned_by;`,
  );
  await sequelize.query(
    `ALTER TABLE development_sessions RENAME COLUMN scheduled_date TO assigned_date;`,
  );
  await sequelize.query(
    `ALTER TABLE development_sessions RENAME COLUMN program_id TO template_id;`,
  );

  await sequelize.query(
    `ALTER TABLE development_sessions RENAME TO wellness_workout_assignments;`,
  );

  await sequelize.query(
    `ALTER TABLE _archive_workout_logs_20260422 RENAME TO wellness_workout_logs;`,
  );

  await sequelize.query(
    `ALTER TABLE _archive_meal_plans_20260422 RENAME TO meal_plans;`,
  );
  await sequelize.query(
    `ALTER TABLE _archive_meal_plan_items_20260422 RENAME TO meal_plan_items;`,
  );

  console.log(
    "Migration 139: reverted development_sessions → wellness_workout_assignments",
  );
}
