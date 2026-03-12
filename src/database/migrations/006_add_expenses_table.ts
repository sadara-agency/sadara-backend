import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE enum_expenses_category AS ENUM (
        'Operational', 'Marketing', 'Travel', 'Staff', 'Legal', 'Other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category      enum_expenses_category NOT NULL DEFAULT 'Operational',
      amount        DECIMAL(15, 2) NOT NULL,
      currency      VARCHAR(3) NOT NULL DEFAULT 'SAR',
      date          DATE NOT NULL DEFAULT CURRENT_DATE,
      description   TEXT,
      player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
      created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_expenses_player_id ON expenses(player_id)`,
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS expenses CASCADE`);
  await sequelize.query(`DROP TYPE IF EXISTS enum_expenses_category`);
}
