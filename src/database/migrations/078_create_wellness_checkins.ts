import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS wellness_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      checkin_date DATE NOT NULL,
      sleep_hours REAL,
      sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
      fatigue INTEGER CHECK (fatigue BETWEEN 1 AND 5),
      muscle_soreness INTEGER CHECK (muscle_soreness BETWEEN 1 AND 5),
      mood INTEGER CHECK (mood BETWEEN 1 AND 5),
      stress INTEGER CHECK (stress BETWEEN 1 AND 5),
      soreness_areas JSONB DEFAULT '[]',
      readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
      notes TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (player_id, checkin_date)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_wellness_checkins_player_date
    ON wellness_checkins (player_id, checkin_date DESC);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS wellness_checkins;`);
}
