import { QueryInterface, DataTypes } from "sequelize";

const SUMMER_2026_ID = "c0000001-0000-0000-0000-000000000001";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const sq = queryInterface.sequelize;

  // ─── 1. transfer_windows ────────────────────────────────────────
  await sq.query(`
    CREATE TABLE IF NOT EXISTS transfer_windows (
      id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      season           VARCHAR(50)  NOT NULL UNIQUE,
      start_date       DATE         NOT NULL,
      end_date         DATE         NOT NULL,
      saff_window_start DATE,
      saff_window_end   DATE,
      shortlist_threshold INTEGER   NOT NULL DEFAULT 60,
      weights          JSONB        NOT NULL DEFAULT '{"performance":40,"contractFit":25,"commercial":20,"culturalFit":15}',
      tier_targets     JSONB        NOT NULL DEFAULT '{"A":3,"B":7,"C":5}',
      status           VARCHAR(20)  NOT NULL DEFAULT 'Upcoming',
      notes            TEXT,
      created_at       TIMESTAMPTZ  NOT NULL,
      updated_at       TIMESTAMPTZ  NOT NULL
    );
  `);

  await sq.query(
    `CREATE INDEX IF NOT EXISTS transfer_windows_status ON transfer_windows (status);`,
  );

  // ─── 2. Extend clubs (idempotent) ───────────────────────────────
  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS budget_sar BIGINT;`,
  );
  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS foreign_slots INTEGER;`,
  );
  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS key_contact_name VARCHAR(100);`,
  );
  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS key_contact_email VARCHAR(150);`,
  );
  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS key_contact_phone VARCHAR(30);`,
  );
  await sq.query(
    `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS last_contact_date DATE;`,
  );
  await sq.query(`
    ALTER TABLE clubs ADD COLUMN IF NOT EXISTS interest_level VARCHAR(20) DEFAULT 'Cold';
  `);

  // ─── 3. club_needs ──────────────────────────────────────────────
  await sq.query(`
    CREATE TABLE IF NOT EXISTS club_needs (
      id                    UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      club_id               UUID         NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      window_id             UUID         NOT NULL REFERENCES transfer_windows(id) ON DELETE CASCADE,
      position              VARCHAR(30)  NOT NULL,
      positional_gap_notes  TEXT,
      deal_preference       VARCHAR(20)  NOT NULL DEFAULT 'Either',
      priority              VARCHAR(10)  NOT NULL DEFAULT 'Medium',
      sadara_opportunity    TEXT,
      match_score           INTEGER,
      created_at            TIMESTAMPTZ  NOT NULL,
      updated_at            TIMESTAMPTZ  NOT NULL,
      CONSTRAINT club_needs_club_window_position_unique UNIQUE (club_id, window_id, position)
    );
  `);

  await sq.query(
    `CREATE INDEX IF NOT EXISTS club_needs_window_id ON club_needs (window_id);`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS club_needs_club_id ON club_needs (club_id);`,
  );

  // ─── 4. Seed Summer 2026 ────────────────────────────────────────
  const now = new Date().toISOString();
  await sq.query(
    `
    INSERT INTO transfer_windows
      (id, season, start_date, end_date, saff_window_start, saff_window_end,
       shortlist_threshold, weights, tier_targets, status, notes, created_at, updated_at)
    VALUES
      (:id, 'Summer 2026', '2026-05-01', '2026-06-30', '2026-05-01', '2026-06-30',
       60,
       '{"performance":40,"contractFit":25,"commercial":20,"culturalFit":15}',
       '{"A":3,"B":7,"C":5}',
       'Active',
       'Seeded by migration 130 — Summer 2026 window (May 1 – Jun 30, 2026).',
       :now, :now)
    ON CONFLICT (season) DO NOTHING;
    `,
    { replacements: { id: SUMMER_2026_ID, now } },
  );

  // ─── 5. Role permissions ────────────────────────────────────────
  await sq.query(`
    INSERT INTO role_permissions (role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
    VALUES
      ('Admin', 'transfer-windows', true, true, true, true, NOW(), NOW()),
      ('Admin', 'club-needs',       true, true, true, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const sq = queryInterface.sequelize;
  await sq.query(
    `DELETE FROM role_permissions WHERE module IN ('transfer-windows', 'club-needs');`,
  );
  await queryInterface.dropTable("club_needs");
  await queryInterface.removeColumn("clubs", "interest_level");
  await queryInterface.removeColumn("clubs", "last_contact_date");
  await queryInterface.removeColumn("clubs", "key_contact_phone");
  await queryInterface.removeColumn("clubs", "key_contact_email");
  await queryInterface.removeColumn("clubs", "key_contact_name");
  await queryInterface.removeColumn("clubs", "foreign_slots");
  await queryInterface.removeColumn("clubs", "budget_sar");
  await queryInterface.dropTable("transfer_windows");
}
