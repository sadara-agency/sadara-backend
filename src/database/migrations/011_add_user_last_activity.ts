import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN last_activity TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE users DROP COLUMN IF EXISTS last_activity;
  `);
}
