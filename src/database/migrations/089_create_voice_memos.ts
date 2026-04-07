import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS voice_memos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_type VARCHAR(50) NOT NULL,
      owner_id UUID NOT NULL,
      file_url TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      duration_seconds INTEGER NOT NULL,
      recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_voice_memos_owner
    ON voice_memos (owner_type, owner_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS voice_memos;`);
}
