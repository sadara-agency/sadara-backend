-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 003
-- Matches, Performance, Injuries & Health
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- 13. MATCHES
-- ──────────────────────────────────────────
CREATE TABLE matches (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_club_id        UUID REFERENCES clubs(id) ON DELETE SET NULL,
    away_club_id        UUID REFERENCES clubs(id) ON DELETE SET NULL,
    competition         VARCHAR(255),
    season              VARCHAR(20),            -- e.g., '2025-26'
    match_date          TIMESTAMPTZ NOT NULL,
    venue               VARCHAR(255),
    status              match_status DEFAULT 'upcoming',

    -- Score
    home_score          INT,
    away_score          INT,

    -- Additional info
    attendance          INT,
    referee             VARCHAR(255),
    broadcast           VARCHAR(255),
    notes               TEXT,

    -- Meta
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_home ON matches(home_club_id);
CREATE INDEX idx_matches_away ON matches(away_club_id);

-- ──────────────────────────────────────────
-- 14. MATCH PLAYERS (player participation)
-- ──────────────────────────────────────────
CREATE TABLE match_players (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_id         UUID REFERENCES clubs(id) ON DELETE SET NULL,

    -- Participation
    started         BOOLEAN DEFAULT FALSE,
    minutes_played  INT DEFAULT 0,
    sub_in          INT,                -- minute subbed in
    sub_out         INT,                -- minute subbed out
    position_played VARCHAR(100),

    -- Stats
    goals           INT DEFAULT 0,
    assists         INT DEFAULT 0,
    yellow_cards    INT DEFAULT 0,
    red_cards       INT DEFAULT 0,
    shots           INT DEFAULT 0,
    shots_on_target INT DEFAULT 0,
    passes          INT DEFAULT 0,
    pass_accuracy   DECIMAL(5,2),
    tackles         INT DEFAULT 0,
    interceptions   INT DEFAULT 0,
    saves           INT DEFAULT 0,      -- for goalkeepers

    -- Rating
    rating          DECIMAL(3,1),       -- e.g., 7.5

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

CREATE INDEX idx_match_players_match ON match_players(match_id);
CREATE INDEX idx_match_players_player ON match_players(player_id);

-- ──────────────────────────────────────────
-- 15. PERFORMANCE RECORDS (aggregated stats)
-- ──────────────────────────────────────────
CREATE TABLE performances (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season              VARCHAR(20),
    competition         VARCHAR(255),

    -- Aggregated stats
    appearances         INT DEFAULT 0,
    starts              INT DEFAULT 0,
    minutes             INT DEFAULT 0,
    goals               INT DEFAULT 0,
    assists             INT DEFAULT 0,
    yellow_cards        INT DEFAULT 0,
    red_cards           INT DEFAULT 0,
    clean_sheets        INT DEFAULT 0,  -- for defenders/GK
    average_rating      DECIMAL(3,1),

    -- Advanced metrics (from external sources)
    xg                  DECIMAL(5,2),   -- expected goals
    xa                  DECIMAL(5,2),   -- expected assists
    key_passes          INT DEFAULT 0,
    successful_dribbles INT DEFAULT 0,
    aerial_duels_won    INT DEFAULT 0,

    -- Data source
    data_source         VARCHAR(100),   -- 'Manual', 'Wyscout', 'InStat', 'StatsBomb'

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, season, competition)
);

CREATE INDEX idx_performances_player ON performances(player_id);
CREATE INDEX idx_performances_season ON performances(season);

-- ──────────────────────────────────────────
-- 16. INJURIES
-- ──────────────────────────────────────────
CREATE TABLE injuries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    injury_type         VARCHAR(255) NOT NULL,
    body_part           VARCHAR(100),
    severity            injury_severity DEFAULT 'Medium',
    status              injury_status DEFAULT 'UnderTreatment',

    -- Timeline
    injury_date         DATE NOT NULL,
    expected_return     DATE,
    actual_return       DATE,
    days_out            INT,

    -- Medical details
    diagnosis           TEXT,
    treatment           TEXT,
    surgeon             VARCHAR(255),
    facility            VARCHAR(255),

    -- Context
    match_id            UUID REFERENCES matches(id) ON DELETE SET NULL,  -- injury during match
    is_recurring        BOOLEAN DEFAULT FALSE,
    related_injury_id   UUID REFERENCES injuries(id) ON DELETE SET NULL,

    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_injuries_player ON injuries(player_id);
CREATE INDEX idx_injuries_status ON injuries(status);
CREATE INDEX idx_injuries_date ON injuries(injury_date);

-- ──────────────────────────────────────────
-- 17. TRAINING PROGRAMS
-- ──────────────────────────────────────────
CREATE TABLE trainings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    type                VARCHAR(100),       -- 'Physical', 'Technical', 'Tactical', 'Recovery'
    coach               VARCHAR(255),
    facility            VARCHAR(255),

    -- Schedule
    start_date          DATE NOT NULL,
    end_date            DATE,
    frequency           VARCHAR(100),       -- e.g., '3x/week'

    -- Progress
    status              VARCHAR(50) DEFAULT 'Active',
    progress_pct        INT DEFAULT 0,
    notes               TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trainings_player ON trainings(player_id);

-- ──────────────────────────────────────────
-- 18. RISK RADAR
-- ──────────────────────────────────────────
CREATE TABLE risk_radars (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,

    -- Risk scores (0-100)
    performance_risk    INT DEFAULT 0,
    mental_risk         INT DEFAULT 0,
    medical_risk        INT DEFAULT 0,
    transfer_risk       INT DEFAULT 0,
    overall_risk        INT DEFAULT 0,

    -- Context
    last_assessed       DATE DEFAULT CURRENT_DATE,
    assessed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    notes               TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_radars_overall ON risk_radars(overall_risk);

COMMIT;
