// ─────────────────────────────────────────────────────────────
// src/database/seed/schema.ts
// Creates tables & views not managed by Sequelize models.
// ─────────────────────────────────────────────────────────────
import { sequelize } from "./../config/database";
import { QueryTypes } from "sequelize";

export async function createMissingTables() {
  await sequelize.query(`
        CREATE TABLE IF NOT EXISTS performances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            match_id UUID REFERENCES matches(id),
            match_date DATE,
            average_rating NUMERIC(3,1),
            goals INT DEFAULT 0, assists INT DEFAULT 0,
            key_passes INT DEFAULT 0, successful_dribbles INT DEFAULT 0,
            minutes INT DEFAULT 0, yellow_cards INT DEFAULT 0, red_cards INT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

  await sequelize.query(`
        CREATE TABLE IF NOT EXISTS risk_radars (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            overall_risk VARCHAR(20) DEFAULT 'Low',
            injury_risk VARCHAR(20) DEFAULT 'Low',
            contract_risk VARCHAR(20) DEFAULT 'Low',
            performance_risk VARCHAR(20) DEFAULT 'Low',
            assessed_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

  await sequelize.query(`
        DO $$ BEGIN
            CREATE TYPE match_player_availability AS ENUM ('starter','bench','injured','suspended','not_called');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

  // Migrate old match_players schema if needed
  const oldCheck = await sequelize.query(
    `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'match_players' AND column_name = 'started'`,
    { type: QueryTypes.SELECT },
  );
  if (oldCheck.length > 0) {
    await sequelize.query("DROP TABLE IF EXISTS match_players CASCADE");
    console.log(
      "   ↻ Dropped old match_players table (migrating to new schema)",
    );
  }

  await sequelize.query(`
        CREATE TABLE IF NOT EXISTS match_players (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            availability match_player_availability NOT NULL DEFAULT 'starter',
            position_in_match VARCHAR(50),
            minutes_played INT, notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT uq_match_player UNIQUE (match_id, player_id)
        );
    `);

  await sequelize.query(`
        CREATE TABLE IF NOT EXISTS player_match_stats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            minutes_played INT,
            goals INT DEFAULT 0, assists INT DEFAULT 0,
            shots_total INT, shots_on_target INT,
            passes_total INT, passes_completed INT,
            tackles_total INT, interceptions INT,
            duels_won INT, duels_total INT,
            dribbles_completed INT, dribbles_attempted INT,
            fouls_committed INT, fouls_drawn INT,
            yellow_cards INT DEFAULT 0, red_cards INT DEFAULT 0,
            rating NUMERIC(3,1), position_in_match VARCHAR(50),
            key_passes INT, saves INT, clean_sheet BOOLEAN,
            goals_conceded INT, penalties_saved INT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT uq_player_match_stats UNIQUE (player_id, match_id)
        );
    `);

  // Add new columns to player_match_stats if they don't exist (for existing DBs)
  const newCols = [
    "key_passes",
    "saves",
    "clean_sheet",
    "goals_conceded",
    "penalties_saved",
  ];
  for (const col of newCols) {
    const colType = col === "clean_sheet" ? "BOOLEAN" : "INT";
    await sequelize.query(
      `DO $$ BEGIN
                ALTER TABLE player_match_stats ADD COLUMN ${col} ${colType};
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;`,
    );
  }

  // Add player_contract_type to contracts if missing (PRD requirement)
  await sequelize.query(
    `DO $$ BEGIN
            CREATE TYPE player_contract_type_enum AS ENUM ('Professional','Amateur','Youth');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;`,
  );
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE contracts ADD COLUMN player_contract_type player_contract_type_enum;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );

  // Add account lockout columns to users if missing (security requirement)
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );

  // Add logo_url column to saff_team_maps if missing (for existing DBs)
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE saff_team_maps ADD COLUMN logo_url VARCHAR(500);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );

  // Add spl_team_id and espn_team_id to clubs if missing (for existing DBs)
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE clubs ADD COLUMN spl_team_id INTEGER;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE clubs ADD COLUMN espn_team_id INTEGER;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );

  // Add converted_contract_id and converted_at to offers if missing
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE offers ADD COLUMN converted_contract_id UUID;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TABLE offers ADD COLUMN converted_at TIMESTAMPTZ;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;`,
  );
  // Add 'Converted' to offers status enum if missing
  await sequelize.query(
    `DO $$ BEGIN
            ALTER TYPE enum_offers_status ADD VALUE IF NOT EXISTS 'Converted';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;`,
  );

  // ── Match Analyses ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS match_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      analyst_id UUID NOT NULL REFERENCES users(id),
      type VARCHAR(20) NOT NULL CHECK (type IN ('pre-match','post-match','tactical')),
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      key_findings JSONB,
      recommended_actions TEXT[],
      rating NUMERIC(3,1),
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── App Settings (key-value store for runtime config) ──
  await sequelize.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            key VARCHAR(255) PRIMARY KEY,
            value JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

  // ── Performance indexes on frequently queried foreign keys ──
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_contracts_player_id ON contracts(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_club_id ON contracts(club_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)",
    "CREATE INDEX IF NOT EXISTS idx_players_current_club_id ON players(current_club_id)",
    "CREATE INDEX IF NOT EXISTS idx_players_status ON players(status)",
    "CREATE INDEX IF NOT EXISTS idx_offers_player_id ON offers(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_player_id ON tasks(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
    "CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date)",
    "CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)",
    "CREATE INDEX IF NOT EXISTS idx_injuries_player_id ON injuries(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_player_id ON payments(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)",
    "CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_player_id ON invoices(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_documents_player_id ON documents(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_player_contract_type ON contracts(player_contract_type)",
    "CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_type, owner_id)",
    "CREATE INDEX IF NOT EXISTS idx_player_club_history_player ON player_club_history(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_technical_reports_player ON technical_reports(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_match_analyses_match ON match_analyses(match_id)",
  ];

  for (const sql of indexes) {
    try {
      await sequelize.query(sql);
    } catch {
      /* table may not exist yet */
    }
  }

  console.log("✅ Missing tables & indexes ensured");
}

export async function createViews() {
  await sequelize.query(`
        CREATE OR REPLACE VIEW vw_dashboard_kpis AS
        SELECT
            (SELECT COUNT(*)::INT FROM players WHERE status = 'active') AS total_active_players,
            (SELECT COUNT(*)::INT FROM players WHERE status = 'active' AND player_type = 'Pro') AS total_pro_players,
            (SELECT COUNT(*)::INT FROM players WHERE status = 'active' AND player_type = 'Youth') AS total_youth_players,
            (SELECT COUNT(*)::INT FROM contracts WHERE status = 'Active') AS active_contracts,
            (SELECT COUNT(*)::INT FROM contracts WHERE status = 'Active'
                AND end_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_contracts,
            (SELECT COUNT(*)::INT FROM offers WHERE status IN ('New','Under Review','Negotiation')) AS open_offers,
            (SELECT COALESCE(SUM(market_value),0)::NUMERIC FROM players WHERE status = 'active') AS total_market_value,
            (SELECT COALESCE(SUM(amount),0)::NUMERIC FROM payments WHERE status = 'Paid') AS total_revenue,
            (SELECT COUNT(*)::INT FROM tasks WHERE status != 'Completed') AS open_tasks;
    `);

  await sequelize.query(`
        CREATE OR REPLACE VIEW vw_expiring_contracts AS
        SELECT c.id AS contract_id,
               p.first_name || ' ' || p.last_name AS player_name,
               (c.end_date::DATE - CURRENT_DATE) AS days_remaining
        FROM contracts c JOIN players p ON c.player_id = p.id
        WHERE c.status = 'Active' AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY days_remaining ASC;
    `);

  await sequelize.query(`
        CREATE OR REPLACE VIEW vw_overdue_payments AS
        SELECT py.id AS payment_id,
               p.first_name || ' ' || p.last_name AS player_name,
               py.amount,
               (CURRENT_DATE - py.due_date::DATE) AS days_overdue
        FROM payments py LEFT JOIN players p ON py.player_id = p.id
        WHERE py.status = 'Overdue' ORDER BY days_overdue DESC;
    `);

  await sequelize.query(`
        CREATE OR REPLACE VIEW vw_injury_match_conflicts AS
        SELECT p.first_name || ' ' || p.last_name AS player_name,
               mp.availability AS status_in_match, m.id AS match_id,
               hc.name AS home_team, ac.name AS away_team, m.match_date
        FROM match_players mp
        JOIN players p ON mp.player_id = p.id
        JOIN matches m ON mp.match_id = m.id
        LEFT JOIN clubs hc ON m.home_club_id = hc.id
        LEFT JOIN clubs ac ON m.away_club_id = ac.id
        WHERE mp.availability = 'injured' AND m.status = 'upcoming';
    `);

  console.log("✅ Dashboard views created/updated");
}
