import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Rename template_id → program_id in program_exercises (was template_id
  // from the original wellness_template_exercises table; migration 138 renamed
  // the table but not this FK column, so INSERT via the model failed at runtime)
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'program_exercises' AND column_name = 'template_id'
      ) THEN
        ALTER TABLE program_exercises RENAME COLUMN template_id TO program_id;
      END IF;
    END $$;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'program_exercises' AND column_name = 'program_id'
      ) THEN
        ALTER TABLE program_exercises RENAME COLUMN program_id TO template_id;
      END IF;
    END $$;
  `);
}
