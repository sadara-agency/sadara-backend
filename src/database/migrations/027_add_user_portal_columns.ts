// 027_add_user_portal_columns.ts
// Adds player_id, invite_token, and invite_token_expiry columns to the users table.
// These are required for the player portal invite flow.

import { sequelize } from "@config/database";

export async function up() {
  const columns = [
    {
      col: "player_id",
      type: "UUID REFERENCES players(id) ON DELETE SET NULL",
    },
    { col: "invite_token", type: "VARCHAR(255)" },
    { col: "invite_token_expiry", type: "TIMESTAMPTZ" },
  ];

  for (const { col, type } of columns) {
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN ${col} ${type};
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
  }

  // Index for faster player lookups
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_users_player_id ON users(player_id);
  `);

  // Index for invite token lookups
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token);
  `);
}

export async function down() {
  await sequelize.query(`DROP INDEX IF EXISTS idx_users_invite_token;`);
  await sequelize.query(`DROP INDEX IF EXISTS idx_users_player_id;`);
  await sequelize.query(
    `ALTER TABLE users DROP COLUMN IF EXISTS invite_token_expiry;`,
  );
  await sequelize.query(
    `ALTER TABLE users DROP COLUMN IF EXISTS invite_token;`,
  );
  await sequelize.query(`ALTER TABLE users DROP COLUMN IF EXISTS player_id;`);
}
