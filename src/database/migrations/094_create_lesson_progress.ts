import { sequelize } from "@config/database";

/**
 * Migration 094: Per-lesson watch progress tracking.
 * Stores the player's watch position per lesson so they can resume,
 * and auto-completes when watched >= 90%.
 */
export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'training_enrollments' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id   UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
      lesson_id       UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
      player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      watched_seconds INTEGER NOT NULL DEFAULT 0,
      total_seconds   INTEGER NOT NULL DEFAULT 0,
      last_position   INTEGER NOT NULL DEFAULT 0,
      is_completed    BOOLEAN NOT NULL DEFAULT false,
      completed_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(enrollment_id, lesson_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment
    ON lesson_progress(enrollment_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_lesson_progress_player_lesson
    ON lesson_progress(player_id, lesson_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS lesson_progress CASCADE;`);
}
