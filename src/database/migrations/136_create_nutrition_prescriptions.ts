import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS nutrition_prescriptions (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id             UUID NOT NULL,
      training_block_id     UUID,
      version_number        INTEGER NOT NULL DEFAULT 1,
      issued_by             UUID NOT NULL,
      triggering_reason     VARCHAR(20) NOT NULL DEFAULT 'manual',
      triggering_scan_id    UUID,
      target_calories       INTEGER,
      target_protein_g      DECIMAL(6,1),
      target_carbs_g        DECIMAL(6,1),
      target_fat_g          DECIMAL(6,1),
      hydration_target_ml   INTEGER,
      pre_training_guidance TEXT,
      post_training_guidance TEXT,
      notes                 TEXT,
      superseded_at         TIMESTAMPTZ,
      superseded_by         UUID,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT nutrition_prescriptions_triggering_reason_check
        CHECK (triggering_reason IN ('scan', 'manual', 'injury', 'block_change'))
    );
  `);

  // Self-referential FK for linked-list versioning
  try {
    await sequelize.query(`
      ALTER TABLE nutrition_prescriptions
        ADD CONSTRAINT fk_nutrition_prescriptions_superseded_by
        FOREIGN KEY (superseded_by) REFERENCES nutrition_prescriptions(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE nutrition_prescriptions
        ADD CONSTRAINT fk_nutrition_prescriptions_player
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE nutrition_prescriptions
        ADD CONSTRAINT fk_nutrition_prescriptions_issued_by
        FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT;
    `);
  } catch {
    // Constraint already exists
  }

  try {
    await sequelize.query(`
      ALTER TABLE nutrition_prescriptions
        ADD CONSTRAINT fk_nutrition_prescriptions_training_block
        FOREIGN KEY (training_block_id) REFERENCES training_blocks(id) ON DELETE SET NULL;
    `);
  } catch {
    // Constraint already exists
  }

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_nutrition_prescriptions_player
    ON nutrition_prescriptions (player_id);
  `);

  // Fast lookup for current prescription: WHERE superseded_at IS NULL
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_nutrition_prescriptions_player_current
    ON nutrition_prescriptions (player_id, superseded_at);
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS prescription_meals (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prescription_id UUID NOT NULL,
      day_of_week     INTEGER,
      meal_type       VARCHAR(20) NOT NULL,
      description     TEXT,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  try {
    await sequelize.query(`
      ALTER TABLE prescription_meals
        ADD CONSTRAINT fk_prescription_meals_prescription
        FOREIGN KEY (prescription_id) REFERENCES nutrition_prescriptions(id) ON DELETE CASCADE;
    `);
  } catch {
    // Constraint already exists
  }

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_prescription_meals_prescription
    ON prescription_meals (prescription_id);
  `);

  console.log(
    "Migration 136: nutrition_prescriptions + prescription_meals tables created",
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS prescription_meals`);
  await sequelize.query(
    `ALTER TABLE nutrition_prescriptions DROP CONSTRAINT IF EXISTS fk_nutrition_prescriptions_superseded_by`,
  );
  await sequelize.query(`DROP TABLE IF EXISTS nutrition_prescriptions`);
  console.log(
    "Migration 136: nutrition_prescriptions + prescription_meals tables dropped",
  );
}
