import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'technical_reports' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Create ENUM type if it doesn't exist
  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_technical_reports_period_type AS ENUM ('Season','DateRange','LastNMatches');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Add period_type column if missing
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports
        ADD COLUMN period_type enum_technical_reports_period_type NOT NULL DEFAULT 'Season';
    EXCEPTION WHEN duplicate_column THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;
  `);

  // Add period_params column if missing
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports
        ADD COLUMN period_params JSONB NOT NULL DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;
  `);

  // Add file_path column if missing
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports ADD COLUMN file_path TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'technical_reports' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    ALTER TABLE technical_reports
      DROP COLUMN IF EXISTS period_type,
      DROP COLUMN IF EXISTS period_params,
      DROP COLUMN IF EXISTS file_path;
  `);
}
