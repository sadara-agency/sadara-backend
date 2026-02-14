-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 004
-- Scouting & Recruitment Pipeline
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- 19. WATCHLIST
-- ──────────────────────────────────────────
CREATE TABLE watchlists (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Prospect info (not yet a player in our system)
    prospect_name       VARCHAR(255) NOT NULL,
    prospect_name_ar    VARCHAR(255),
    date_of_birth       DATE,
    nationality         VARCHAR(100),
    position            VARCHAR(100),
    current_club        VARCHAR(255),
    current_league      VARCHAR(255),

    -- Scouting details
    status              watchlist_status DEFAULT 'Active',
    source              VARCHAR(255),       -- scout name or referral
    scouted_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    video_clips         INT DEFAULT 0,
    priority            VARCHAR(20) DEFAULT 'Medium',

    -- Assessment
    technical_rating    INT,                -- 1-10
    physical_rating     INT,
    mental_rating       INT,
    potential_rating    INT,

    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watchlists_status ON watchlists(status);
CREATE INDEX idx_watchlists_scouted_by ON watchlists(scouted_by);

-- ──────────────────────────────────────────
-- 20. SCREENING CASES
-- ──────────────────────────────────────────
CREATE TABLE screening_cases (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id        UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    case_number         VARCHAR(50) UNIQUE NOT NULL,
    status              screening_status DEFAULT 'InProgress',

    -- Identity verification
    identity_check      identity_check DEFAULT 'Pending',
    passport_verified   BOOLEAN DEFAULT FALSE,
    age_verified        BOOLEAN DEFAULT FALSE,

    -- Assessment
    fit_assessment      TEXT,
    risk_assessment     TEXT,
    medical_clearance   BOOLEAN DEFAULT FALSE,

    -- Baseline data
    baseline_stats      JSONB DEFAULT '{}',

    -- Pack
    is_pack_ready       BOOLEAN DEFAULT FALSE,
    pack_prepared_at    TIMESTAMPTZ,
    pack_prepared_by    UUID REFERENCES users(id) ON DELETE SET NULL,

    notes               TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_screening_cases_watchlist ON screening_cases(watchlist_id);
CREATE INDEX idx_screening_cases_status ON screening_cases(status);
CREATE UNIQUE INDEX idx_screening_case_number ON screening_cases(case_number);

-- ──────────────────────────────────────────
-- 21. SELECTION DECISIONS (committee votes)
-- ──────────────────────────────────────────
CREATE TABLE selection_decisions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_case_id   UUID NOT NULL REFERENCES screening_cases(id) ON DELETE CASCADE,
    committee_name      VARCHAR(255) NOT NULL,

    -- Decision (immutable after recording)
    decision            decision_type NOT NULL,
    decision_scope      decision_scope DEFAULT 'Full',
    decision_date       DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Voting
    votes_for           INT DEFAULT 0,
    votes_against       INT DEFAULT 0,
    votes_abstain       INT DEFAULT 0,
    vote_details        JSONB DEFAULT '[]',     -- array of {member, vote, comment}

    -- Rationale
    rationale           TEXT,
    conditions          TEXT,                    -- conditions attached to approval
    dissenting_opinion  TEXT,

    -- Meta (immutable — no updated_at)
    recorded_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_selection_decisions_screening ON selection_decisions(screening_case_id);
CREATE INDEX idx_selection_decisions_decision ON selection_decisions(decision);

COMMIT;
