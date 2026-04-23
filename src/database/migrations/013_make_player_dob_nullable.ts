import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players ALTER COLUMN date_of_birth DROP NOT NULL;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE players ALTER COLUMN date_of_birth SET NOT NULL;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
