import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS termination_type VARCHAR(20);
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE contracts
    DROP COLUMN IF EXISTS termination_type;
  `);
}
