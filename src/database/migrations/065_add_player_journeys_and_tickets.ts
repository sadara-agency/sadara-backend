import { sequelize } from "@config/database";

/**
 * Migration 065: Add player_journeys and tickets tables
 *
 * - player_journeys: Tracks development stages per player (assessment, training, etc.)
 * - tickets: Operational tasks/exercises linked to players and optionally to journey stages
 */

export async function up() {
  const [r] = await sequelize.query(
    `SELECT to_regclass('public.players') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  // ── player_journeys ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS player_journeys (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      stage_name      VARCHAR(255) NOT NULL,
      stage_name_ar   VARCHAR(255),
      stage_order     INTEGER NOT NULL DEFAULT 0,
      status          VARCHAR(50) DEFAULT 'NotStarted',
      health          VARCHAR(50) DEFAULT 'OnTrack',
      start_date      DATE,
      expected_end_date DATE,
      actual_end_date DATE,
      assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
      responsible_party     VARCHAR(255),
      responsible_party_ar  VARCHAR(255),
      notes           TEXT,
      notes_ar        TEXT,
      created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_player_journeys_player ON player_journeys(player_id);
    CREATE INDEX IF NOT EXISTS idx_player_journeys_assigned ON player_journeys(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_player_journeys_status ON player_journeys(status);
    CREATE INDEX IF NOT EXISTS idx_player_journeys_player_order ON player_journeys(player_id, stage_order);
  `);

  // ── tickets ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      journey_stage_id UUID REFERENCES player_journeys(id) ON DELETE SET NULL,
      title           VARCHAR(500) NOT NULL,
      title_ar        VARCHAR(500),
      description     TEXT,
      description_ar  TEXT,
      ticket_type     VARCHAR(50) DEFAULT 'General',
      priority        VARCHAR(50) DEFAULT 'medium',
      status          VARCHAR(50) DEFAULT 'Open',
      assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
      receiving_party     VARCHAR(255),
      receiving_party_ar  VARCHAR(255),
      due_date        DATE,
      closure_date    DATE,
      completed_at    TIMESTAMPTZ,
      notes           TEXT,
      notes_ar        TEXT,
      created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_tickets_player ON tickets(player_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_stage ON tickets(journey_stage_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_player_status ON tickets(player_id, status);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS tickets`);
  await sequelize.query(`DROP TABLE IF EXISTS player_journeys`);
}
