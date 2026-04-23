import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS title_ar VARCHAR(255),
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS summary_ar TEXT;
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE sessions
    DROP COLUMN IF EXISTS title,
    DROP COLUMN IF EXISTS title_ar,
    DROP COLUMN IF EXISTS summary,
    DROP COLUMN IF EXISTS summary_ar;
  `);
}
