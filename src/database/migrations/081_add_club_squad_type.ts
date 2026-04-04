import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS squad_type VARCHAR(20) DEFAULT 'Senior';
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE clubs
    DROP COLUMN IF EXISTS squad_type;
  `);
}
