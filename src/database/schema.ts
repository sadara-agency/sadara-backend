// ─────────────────────────────────────────────────────────────
// src/database/seed/schema.ts
// Creates tables & views not managed by Sequelize models.
// ─────────────────────────────────────────────────────────────
import { sequelize } from './../config/database';
import { QueryTypes } from 'sequelize';

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
        { type: QueryTypes.SELECT }
    );
    if (oldCheck.length > 0) {
        await sequelize.query('DROP TABLE IF EXISTS match_players CASCADE');
        console.log('   ↻ Dropped old match_players table (migrating to new schema)');
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
    const newCols = ['key_passes', 'saves', 'clean_sheet', 'goals_conceded', 'penalties_saved'];
    for (const col of newCols) {
        const colType = col === 'clean_sheet' ? 'BOOLEAN' : 'INT';
        await sequelize.query(
            `DO $$ BEGIN
                ALTER TABLE player_match_stats ADD COLUMN ${col} ${colType};
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;`
        );
    }

    console.log('✅ Missing tables ensured');
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

    console.log('✅ Dashboard views created/updated');
}
