import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    ALTER TABLE players
      ALTER COLUMN date_of_birth DROP NOT NULL;
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE players
      ALTER COLUMN date_of_birth SET NOT NULL;
  `);
}
