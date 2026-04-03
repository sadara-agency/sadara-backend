import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE wellness_daily_summaries
    ADD COLUMN IF NOT EXISTS readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100);
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE wellness_daily_summaries
    DROP COLUMN IF EXISTS readiness_score;
  `);
}
