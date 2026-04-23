// ═══════════════════════════════════════════════════════════════
// Migration 041: Create wellness nutrition tables
//
// Tables: wellness_food_items, wellness_meal_logs
// Supports food database caching and daily meal tracking.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  const tx = await sequelize.transaction();
  try {
    // ── wellness_food_items (cached food database) ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_food_items (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_id   VARCHAR(100),
        source        VARCHAR(20) NOT NULL DEFAULT 'custom'
                        CHECK (source IN ('nutritionix', 'edamam', 'custom')),
        name          VARCHAR(500) NOT NULL,
        name_ar       VARCHAR(500),
        brand         VARCHAR(255),
        serving_qty   DECIMAL(8,2) NOT NULL DEFAULT 1,
        serving_unit  VARCHAR(50) NOT NULL DEFAULT 'serving',
        calories      DECIMAL(8,2) NOT NULL,
        protein_g     DECIMAL(8,2) NOT NULL,
        carbs_g       DECIMAL(8,2) NOT NULL,
        fat_g         DECIMAL(8,2) NOT NULL,
        fiber_g       DECIMAL(8,2),
        photo_url     VARCHAR(500),
        is_verified   BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (external_id, source)
      );`,
      { transaction: tx },
    );

    // GIN index for text search on food names
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_food_items_name_gin
       ON wellness_food_items USING gin (to_tsvector('english', name));`,
      { transaction: tx },
    );

    // ── wellness_meal_logs ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_meal_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id     UUID NOT NULL
                        REFERENCES players(id) ON DELETE CASCADE,
        meal_type     VARCHAR(20) NOT NULL
                        CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        food_item_id  UUID REFERENCES wellness_food_items(id) ON DELETE SET NULL,
        custom_name   VARCHAR(500),
        servings      DECIMAL(6,2) NOT NULL DEFAULT 1,
        calories      DECIMAL(8,2) NOT NULL,
        protein_g     DECIMAL(8,2) NOT NULL,
        carbs_g       DECIMAL(8,2) NOT NULL,
        fat_g         DECIMAL(8,2) NOT NULL,
        logged_date   DATE NOT NULL,
        notes         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    // Indexes for meal log queries
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_meal_logs_player_date
       ON wellness_meal_logs (player_id, logged_date);
       CREATE INDEX IF NOT EXISTS idx_wellness_meal_logs_player_date_type
       ON wellness_meal_logs (player_id, logged_date, meal_type);`,
      { transaction: tx },
    );

    await tx.commit();
    console.log("Migration 041: Wellness nutrition tables created");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down() {
  const tx = await sequelize.transaction();
  try {
    await sequelize.query(
      `DROP TABLE IF EXISTS wellness_meal_logs;
       DROP TABLE IF EXISTS wellness_food_items;`,
      { transaction: tx },
    );
    await tx.commit();
    console.log("Migration 041: Wellness nutrition tables dropped");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
