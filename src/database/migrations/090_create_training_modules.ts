import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'training_courses' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS training_modules (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id   UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
      title       VARCHAR(500) NOT NULL,
      title_ar    VARCHAR(500),
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_training_modules_course
    ON training_modules(course_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS training_modules CASCADE;`);
}
