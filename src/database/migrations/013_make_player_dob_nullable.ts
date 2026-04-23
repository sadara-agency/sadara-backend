import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players ALTER COLUMN date_of_birth DROP NOT NULL;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players ALTER COLUMN date_of_birth SET NOT NULL;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
