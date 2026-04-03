import { sequelize } from "@config/database";

export async function up() {
  // ── Conversations ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type            VARCHAR(20) NOT NULL DEFAULT 'direct',
      title           VARCHAR(255),
      title_ar        VARCHAR(255),
      created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_conversations_last_message
      ON conversations (last_message_at DESC);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_conversations_type
      ON conversations (type);
  `);

  // ── Conversation Participants ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_archived     BOOLEAN NOT NULL DEFAULT false,
      is_muted        BOOLEAN NOT NULL DEFAULT false,
      last_read_at    TIMESTAMPTZ,
      joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(conversation_id, user_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cp_user_id
      ON conversation_participants (user_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cp_conversation_user
      ON conversation_participants (conversation_id, user_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cp_user_archived
      ON conversation_participants (user_id, is_archived);
  `);

  // ── Messages ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      content         TEXT NOT NULL,
      content_ar      TEXT,
      search_vector   TSVECTOR,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Ensure search_vector exists even if table was created by model sync without it
  await sequelize.query(`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
      ON messages (conversation_id, created_at DESC);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender
      ON messages (sender_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_search
      ON messages USING GIN (search_vector);
  `);

  // Auto-update search_vector from content + content_ar
  await sequelize.query(`
    CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        to_tsvector('simple', COALESCE(NEW.content, '')) ||
        to_tsvector('simple', COALESCE(NEW.content_ar, ''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await sequelize.query(`
    DROP TRIGGER IF EXISTS trg_messages_search_vector ON messages;
    CREATE TRIGGER trg_messages_search_vector
      BEFORE INSERT OR UPDATE OF content, content_ar ON messages
      FOR EACH ROW
      EXECUTE FUNCTION messages_search_vector_update();
  `);
}

export async function down() {
  await sequelize.query(
    `DROP TRIGGER IF EXISTS trg_messages_search_vector ON messages`,
  );
  await sequelize.query(
    `DROP FUNCTION IF EXISTS messages_search_vector_update`,
  );
  await sequelize.query(`DROP TABLE IF EXISTS messages`);
  await sequelize.query(`DROP TABLE IF EXISTS conversation_participants`);
  await sequelize.query(`DROP TABLE IF EXISTS conversations`);
}
