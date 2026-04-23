import { sequelize } from "@config/database";

export async function up() {
  const [guard] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
  );
  if ((guard as unknown[]).length === 0) return;

  const [r] = await sequelize.query(
    `SELECT to_regclass('public.documents') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  // ── Table: signature_requests ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS signature_requests (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      title               VARCHAR(500) NOT NULL,
      message             TEXT,
      status              VARCHAR(20) NOT NULL DEFAULT 'Draft',
      signing_order       VARCHAR(20) NOT NULL DEFAULT 'sequential',
      due_date            DATE,
      signed_document_url TEXT,
      created_by          UUID NOT NULL REFERENCES users(id),
      completed_at        TIMESTAMPTZ,
      cancelled_at        TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigreq_document ON signature_requests(document_id);`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigreq_status ON signature_requests(status);`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigreq_created_by ON signature_requests(created_by);`,
  );

  // ── Table: signature_signers ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS signature_signers (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      signature_request_id    UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
      signer_type             VARCHAR(20) NOT NULL DEFAULT 'internal',
      user_id                 UUID REFERENCES users(id),
      external_name           VARCHAR(255),
      external_email          VARCHAR(255),
      step_order              INTEGER NOT NULL DEFAULT 1,
      status                  VARCHAR(20) NOT NULL DEFAULT 'Pending',
      signature_data          TEXT,
      signing_method          VARCHAR(20),
      signed_at               TIMESTAMPTZ,
      ip_address              VARCHAR(45),
      user_agent              TEXT,
      token                   VARCHAR(128),
      token_expires_at        TIMESTAMPTZ,
      declined_reason         TEXT,
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigsigner_request ON signature_signers(signature_request_id);`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigsigner_user ON signature_signers(user_id);`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigsigner_status ON signature_signers(status);`,
  );
  await sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sigsigner_token ON signature_signers(token) WHERE token IS NOT NULL;`,
  );

  // ── Table: signature_audit_trail ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS signature_audit_trail (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      signature_request_id    UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
      signer_id               UUID REFERENCES signature_signers(id) ON DELETE SET NULL,
      action                  VARCHAR(50) NOT NULL,
      actor_id                UUID,
      actor_name              VARCHAR(255),
      ip_address              VARCHAR(45),
      user_agent              TEXT,
      metadata                JSONB DEFAULT '{}',
      created_at              TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigaudit_request ON signature_audit_trail(signature_request_id);`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_sigaudit_action ON signature_audit_trail(action);`,
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS signature_audit_trail CASCADE;`);
  await sequelize.query(`DROP TABLE IF EXISTS signature_signers CASCADE;`);
  await sequelize.query(`DROP TABLE IF EXISTS signature_requests CASCADE;`);
}
