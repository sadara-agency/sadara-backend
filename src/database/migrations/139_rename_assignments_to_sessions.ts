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
  // 1. Archive Phase 3 leftovers (idempotent — skip if source already gone)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meal_plan_items')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_archive_meal_plan_items_20260422') THEN
        ALTER TABLE meal_plan_items RENAME TO _archive_meal_plan_items_20260422;
      END IF;
    END $$;
  `);
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meal_plans')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_archive_meal_plans_20260422') THEN
        ALTER TABLE meal_plans RENAME TO _archive_meal_plans_20260422;
      END IF;
    END $$;
  `);

  // 2. Archive per-set workout logs (idempotent)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wellness_workout_logs')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_archive_workout_logs_20260422') THEN
        ALTER TABLE wellness_workout_logs RENAME TO _archive_workout_logs_20260422;
      END IF;
    END $$;
  `);

  // 3. Rename assignments → development_sessions (idempotent)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wellness_workout_assignments')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'development_sessions') THEN
        ALTER TABLE wellness_workout_assignments RENAME TO development_sessions;
      END IF;
    END $$;
  `);

  // 4. Column renames (idempotent — check column name before renaming)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'development_sessions' AND column_name = 'template_id') THEN
        ALTER TABLE development_sessions RENAME COLUMN template_id TO program_id;
      END IF;
    END $$;
  `);
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'development_sessions' AND column_name = 'assigned_date') THEN
        ALTER TABLE development_sessions RENAME COLUMN assigned_date TO scheduled_date;
      END IF;
    END $$;
  `);
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'development_sessions' AND column_name = 'assigned_by') THEN
        ALTER TABLE development_sessions RENAME COLUMN assigned_by TO prescribed_by;
      END IF;
    END $$;
  `);

  // 5. Add new columns (idempotent — skip if table doesn't exist on fresh DB)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'development_sessions') THEN
        ALTER TABLE development_sessions
          ADD COLUMN IF NOT EXISTS session_type            VARCHAR(30) NOT NULL DEFAULT 'development_gym',
          ADD COLUMN IF NOT EXISTS overall_rpe             DECIMAL(3,1),
          ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
          ADD COLUMN IF NOT EXISTS session_note            TEXT;
      END IF;
    END $$;
  `);

  // 6. Index for player+date lookups (idempotent)
  await sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'development_sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_development_sessions_player_date
          ON development_sessions (player_id, scheduled_date DESC);
      END IF;
    END $$;
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
