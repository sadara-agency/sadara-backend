// 026_create_refresh_tokens.ts
// Adds a refresh_tokens table for secure token rotation.

import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      user_id UUID NOT NULL,
      user_type VARCHAR(20) NOT NULL DEFAULT 'user',
      family VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Index for fast lookup by token hash
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
    ON refresh_tokens (token_hash) WHERE revoked_at IS NULL;
  `);

  // Index for cleanup / revocation by family
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
    ON refresh_tokens (family);
  `);

  // Index for user-based revocation (logout all devices)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
    ON refresh_tokens (user_id, user_type) WHERE revoked_at IS NULL;
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS refresh_tokens;`);
}
