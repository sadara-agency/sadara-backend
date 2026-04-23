import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_daily_summaries' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    ALTER TABLE wellness_daily_summaries
    ADD COLUMN IF NOT EXISTS readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_daily_summaries' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await sequelize.query(`
    ALTER TABLE wellness_daily_summaries
    DROP COLUMN IF EXISTS readiness_score;
  `);
}
