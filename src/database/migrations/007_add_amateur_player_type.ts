import { sequelize } from "../../config/database";

export async function up() {
  await sequelize.query(`
    ALTER TYPE player_type ADD VALUE IF NOT EXISTS 'Amateur';
  `);
}

export async function down() {
  // PostgreSQL does not support removing enum values directly
}
