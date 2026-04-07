import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS training_lessons (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
      title        VARCHAR(500) NOT NULL,
      title_ar     VARCHAR(500),
      type         VARCHAR(20) NOT NULL DEFAULT 'video',
      sort_order   INTEGER NOT NULL DEFAULT 0,
      content_url  TEXT,
      media_id     UUID REFERENCES training_media(id) ON DELETE SET NULL,
      duration_sec INTEGER,
      is_free      BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_training_lessons_module
    ON training_lessons(module_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS training_lessons CASCADE;`);
}
