// 000_baseline.ts
// Baseline migration — all DDL is consolidated here (no separate schema.ts).
// All operations are idempotent (IF NOT EXISTS, etc.) so safe for existing databases.

import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

async function createMissingTables() {
  // Guard: this function patches an existing database. On a fresh install (CI/staging),
  // core tables don't exist yet — they're created by later migrations. Skip and let
  // the ordered sequence handle it.
  const [playersExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  if (!playersExists) {
    console.log(
      "⚠️  Core tables not found — skipping createMissingTables() (fresh install, later migrations will create them)",
    );
    return;
  }

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

  // player_accounts lockout columns now handled by migration 025

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
  // NOTE: ALTER TYPE...ADD VALUE cannot run inside a PL/pgSQL block / transaction,
  // so we check existence first, then run it as a top-level statement.
  const [enumCheck] = await sequelize
    .query(
      `SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = 'enum_offers_status' AND e.enumlabel = 'Converted'`,
      { type: QueryTypes.SELECT },
    )
    .catch(() => [[]]); // table may not exist yet
  const typeExists = await sequelize
    .query(`SELECT 1 FROM pg_type WHERE typname = 'enum_offers_status'`, {
      type: QueryTypes.SELECT,
    })
    .catch(() => []);
  if (typeExists.length > 0 && !enumCheck) {
    await sequelize.query(
      `ALTER TYPE enum_offers_status ADD VALUE IF NOT EXISTS 'Converted'`,
    );
  }

  // Add 'Canceled' to tasks status enum if missing
  const [taskEnumCheck] = await sequelize
    .query(
      `SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = 'enum_tasks_status' AND e.enumlabel = 'Canceled'`,
      { type: QueryTypes.SELECT },
    )
    .catch(() => [[]]); // table may not exist yet
  const taskTypeExists = await sequelize
    .query(`SELECT 1 FROM pg_type WHERE typname = 'enum_tasks_status'`, {
      type: QueryTypes.SELECT,
    })
    .catch(() => []);
  if (taskTypeExists.length > 0 && !taskEnumCheck) {
    await sequelize.query(
      `ALTER TYPE enum_tasks_status ADD VALUE IF NOT EXISTS 'Canceled'`,
    );
  }

  // ── Document polymorphic columns migration ──
  // Add entity_type, entity_id, entity_label columns; backfill from player_id/contract_id
  const [docTableCheck] = await sequelize
    .query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'documents'`,
      { type: QueryTypes.SELECT },
    )
    .catch(() => [[]]);

  if (docTableCheck) {
    // Add new columns if missing
    await sequelize
      .query(
        `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'documents' AND column_name = 'entity_type') THEN
          ALTER TABLE documents ADD COLUMN entity_type VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'documents' AND column_name = 'entity_id') THEN
          ALTER TABLE documents ADD COLUMN entity_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'documents' AND column_name = 'entity_label') THEN
          ALTER TABLE documents ADD COLUMN entity_label VARCHAR(500);
        END IF;
      END $$;
    `,
      )
      .catch(() => {});

    // Backfill from player_id → entity_type='Player', entity_id=player_id
    await sequelize
      .query(
        `
      UPDATE documents SET entity_type = 'Player', entity_id = player_id
      WHERE player_id IS NOT NULL AND entity_type IS NULL
    `,
      )
      .catch(() => {});

    // Backfill from contract_id → entity_type='Contract', entity_id=contract_id
    await sequelize
      .query(
        `
      UPDATE documents SET entity_type = 'Contract', entity_id = contract_id
      WHERE contract_id IS NOT NULL AND entity_type IS NULL
    `,
      )
      .catch(() => {});
  }

  // ── Notes ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_type VARCHAR(50) NOT NULL,
      owner_id UUID NOT NULL,
      content TEXT NOT NULL,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── Player Club History ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS player_club_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE,
      position VARCHAR(50),
      jersey_number INT,
      contract_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── Technical Reports ──
  await sequelize.query(`
    DO $$ BEGIN
        CREATE TYPE enum_technical_reports_period_type AS ENUM ('Season','DateRange','LastNMatches');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sequelize.query(`
    DO $$ BEGIN
        CREATE TYPE enum_technical_reports_status AS ENUM ('Draft','Generating','Generated','Failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS technical_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      period_type enum_technical_reports_period_type NOT NULL,
      period_params JSONB NOT NULL DEFAULT '{}',
      file_path TEXT,
      status enum_technical_reports_status DEFAULT 'Draft',
      notes TEXT,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ── Approval Requests ──
  await sequelize.query(`
    DO $$ BEGIN
        CREATE TYPE enum_approval_requests_status AS ENUM ('Pending','Approved','Rejected');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      entity_title VARCHAR(500) NOT NULL,
      action VARCHAR(100) NOT NULL,
      status enum_approval_requests_status DEFAULT 'Pending',
      priority VARCHAR(20) DEFAULT 'normal',
      requested_by UUID NOT NULL REFERENCES users(id),
      assigned_to UUID,
      assigned_role VARCHAR(50),
      comment TEXT,
      due_date DATE,
      resolved_by UUID,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

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

  // ── Add external match mapping columns to matches (Match Analysis Provider integration) ──
  const matchExtCols = [
    { col: "external_match_id", type: "VARCHAR(100)" },
    { col: "home_team_name", type: "VARCHAR(255)" },
    { col: "away_team_name", type: "VARCHAR(255)" },
    { col: "provider_source", type: "VARCHAR(50)" },
  ];
  for (const { col, type } of matchExtCols) {
    await sequelize.query(
      `DO $$ BEGIN
              ALTER TABLE matches ADD COLUMN ${col} ${type};
          EXCEPTION WHEN duplicate_column THEN NULL;
          END $$;`,
    );
  }

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
    "CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_player_contract_type ON contracts(player_contract_type)",
    "CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_type, owner_id)",
    "CREATE INDEX IF NOT EXISTS idx_player_club_history_player ON player_club_history(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_technical_reports_player ON technical_reports(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_match_analyses_match ON match_analyses(match_id)",
    "CREATE INDEX IF NOT EXISTS idx_matches_external_match_id ON matches(external_match_id)",
    // Performance & match stats indexes (high-traffic subquery targets)
    "CREATE INDEX IF NOT EXISTS idx_performances_player_id ON performances(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_performances_match_date ON performances(match_date)",
    "CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id)",
    "CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_player_match_stats_player_id ON player_match_stats(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON player_match_stats(match_id)",
    // RBAC indexes (queried on every authenticated request)
    "CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)",
    "CREATE INDEX IF NOT EXISTS idx_role_field_permissions_role ON role_field_permissions(role)",
    // Risk radar (queried by player detail & cron engines)
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_radars_player_id ON risk_radars(player_id)",
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

async function createViews() {
  const [playersExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  if (!playersExists) {
    console.log(
      "⚠️  Core tables not found — skipping createViews() (fresh install, views will be created after tables exist)",
    );
    return;
  }

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

export async function up() {
  await createMissingTables();
  await createViews();
}

export async function down() {
  // No-op — dropping all tables would be destructive
  console.warn("Baseline migration down() is a no-op");
}
