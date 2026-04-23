import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'training_media' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE training_media
    ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES training_lessons(id) ON DELETE SET NULL;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_training_media_lesson
    ON training_media(lesson_id);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'training_media' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`DROP INDEX IF EXISTS idx_training_media_lesson;`);
  await sequelize.query(
    `ALTER TABLE training_media DROP COLUMN IF EXISTS lesson_id;`,
  );
}
