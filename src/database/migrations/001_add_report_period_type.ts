import { sequelize } from "@config/database";

export async function up() {
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
    END $$;
  `);

  // Add period_params column if missing
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports
        ADD COLUMN period_params JSONB NOT NULL DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  // Add file_path column if missing
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE technical_reports ADD COLUMN file_path TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE technical_reports
      DROP COLUMN IF EXISTS period_type,
      DROP COLUMN IF EXISTS period_params,
      DROP COLUMN IF EXISTS file_path;
  `);
}
