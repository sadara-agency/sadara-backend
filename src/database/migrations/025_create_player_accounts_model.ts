// 025_create_player_accounts_model.ts
// Ensures player_accounts table exists with all columns the Sequelize model expects.
// The table may already exist from legacy raw SQL — this migration is fully idempotent.

import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database";

export async function up() {
  // Create the table if it doesn't exist (fresh installs)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS player_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      last_login TIMESTAMPTZ,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add columns that may be missing on existing tables (from schema.ts migration)
  const columnsToAdd = [
    { col: "failed_login_attempts", type: "INT NOT NULL DEFAULT 0" },
    { col: "locked_until", type: "TIMESTAMPTZ" },
    { col: "created_at", type: "TIMESTAMPTZ NOT NULL DEFAULT NOW()" },
    { col: "updated_at", type: "TIMESTAMPTZ NOT NULL DEFAULT NOW()" },
  ];

  for (const { col, type } of columnsToAdd) {
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE player_accounts ADD COLUMN ${col} ${type};
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
  }

  // Add index for faster lookups
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_accounts_player_id ON player_accounts(player_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_accounts_email ON player_accounts(email);
  `);
}

export async function down() {
  // Don't drop the table — too destructive for auth data
  console.warn("025 down() is a no-op — player_accounts table preserved");
}
