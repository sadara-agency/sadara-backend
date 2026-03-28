import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE approval_requests
    ADD COLUMN IF NOT EXISTS entity_title_ar VARCHAR(500);
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE approval_requests
    DROP COLUMN IF EXISTS entity_title_ar;
  `);
}
