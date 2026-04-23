import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports ADD COLUMN notes TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports DROP COLUMN IF EXISTS notes;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
