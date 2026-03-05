import { sequelize } from "../../config/database";

export async function up() {
  // ── Table: approval_chain_templates ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS approval_chain_templates (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type     VARCHAR(50)  NOT NULL,
      action          VARCHAR(100) NOT NULL,
      name            VARCHAR(200) NOT NULL,
      name_ar         VARCHAR(200),
      is_active       BOOLEAN NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Only one active template per (entity_type, action)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_template_active
      ON approval_chain_templates (entity_type, action)
      WHERE is_active = true;
  `);

  // ── Table: approval_chain_template_steps ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS approval_chain_template_steps (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id     UUID NOT NULL REFERENCES approval_chain_templates(id) ON DELETE CASCADE,
      step_number     INTEGER NOT NULL,
      approver_role   VARCHAR(50) NOT NULL,
      label           VARCHAR(200) NOT NULL,
      label_ar        VARCHAR(200),
      due_days        INTEGER NOT NULL DEFAULT 3,
      is_mandatory    BOOLEAN NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_template_step UNIQUE (template_id, step_number)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_template_steps_template
      ON approval_chain_template_steps(template_id);
  `);

  // ── Table: approval_steps ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS approval_steps (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_request_id   UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
      step_number           INTEGER NOT NULL,
      approver_role         VARCHAR(50) NOT NULL,
      approver_user_id      UUID,
      status                VARCHAR(20) NOT NULL DEFAULT 'Pending',
      label                 VARCHAR(200),
      label_ar              VARCHAR(200),
      comment               TEXT,
      due_date              DATE,
      resolved_by           UUID,
      resolved_at           TIMESTAMPTZ,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_approval_steps_request
      ON approval_steps(approval_request_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_approval_steps_status
      ON approval_steps(status);
  `);

  // ── Alter: approval_requests — add chain columns ──
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE approval_requests ADD COLUMN current_step INTEGER NOT NULL DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE approval_requests ADD COLUMN total_steps INTEGER NOT NULL DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE approval_requests ADD COLUMN template_id UUID REFERENCES approval_chain_templates(id);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);
}

export async function down() {
  await sequelize.query(`ALTER TABLE approval_requests DROP COLUMN IF EXISTS template_id`);
  await sequelize.query(`ALTER TABLE approval_requests DROP COLUMN IF EXISTS total_steps`);
  await sequelize.query(`ALTER TABLE approval_requests DROP COLUMN IF EXISTS current_step`);
  await sequelize.query(`DROP TABLE IF EXISTS approval_steps CASCADE`);
  await sequelize.query(`DROP TABLE IF EXISTS approval_chain_template_steps CASCADE`);
  await sequelize.query(`DROP TABLE IF EXISTS approval_chain_templates CASCADE`);
}
