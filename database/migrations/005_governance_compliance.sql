-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 005
-- Governance & Compliance
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- 22. GATES (player lifecycle checkpoints)
-- ──────────────────────────────────────────
CREATE TABLE gates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    gate_number         gate_number NOT NULL,
    status              gate_status DEFAULT 'Pending',

    -- Dates
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,

    -- Approval
    approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    approver_role       VARCHAR(100),

    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, gate_number)
);

CREATE INDEX idx_gates_player ON gates(player_id);
CREATE INDEX idx_gates_status ON gates(status);

-- ──────────────────────────────────────────
-- 23. GATE CHECKLISTS
-- ──────────────────────────────────────────
CREATE TABLE gate_checklists (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gate_id             UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    item                VARCHAR(500) NOT NULL,
    is_completed        BOOLEAN DEFAULT FALSE,
    is_mandatory        BOOLEAN DEFAULT TRUE,
    assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at        TIMESTAMPTZ,
    completed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    evidence_url        TEXT,
    notes               TEXT,
    sort_order          INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gate_checklists_gate ON gate_checklists(gate_id);

-- ──────────────────────────────────────────
-- 24. GATE OVERRIDES (Gates 2-3 only)
-- ──────────────────────────────────────────
CREATE TABLE gate_overrides (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gate_id             UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    justification       TEXT NOT NULL,
    supporting_docs     TEXT,
    risk_assessment     TEXT,

    -- Dual approval
    requested_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    secondary_approver  UUID REFERENCES users(id) ON DELETE SET NULL,

    status              VARCHAR(50) DEFAULT 'Pending',   -- Pending, Approved, Rejected
    override_date       DATE DEFAULT CURRENT_DATE,

    -- 72-hour post-review
    post_review_due     DATE,
    post_review_notes   TEXT,
    post_review_done    BOOLEAN DEFAULT FALSE,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gate_overrides_gate ON gate_overrides(gate_id);

-- ──────────────────────────────────────────
-- 25. GUARDIANS (for Youth players)
-- ──────────────────────────────────────────
CREATE TABLE guardians (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    relation        VARCHAR(100),       -- 'Father', 'Mother', 'Legal Guardian'
    email           VARCHAR(255),
    phone           VARCHAR(50),
    national_id     VARCHAR(50),
    address         TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guardians_player ON guardians(player_id);

-- ──────────────────────────────────────────
-- 26. CONSENT RECORDS
-- ──────────────────────────────────────────
CREATE TABLE consent_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    consent_type        VARCHAR(100) NOT NULL,   -- 'DataProcessing', 'MediaRelease', 'MedicalInfo'
    scopes              TEXT[] DEFAULT '{}',

    -- Guardian consent (for Youth)
    guardian_required    BOOLEAN DEFAULT FALSE,
    guardian_id          UUID REFERENCES guardians(id) ON DELETE SET NULL,
    guardian_consented   BOOLEAN DEFAULT FALSE,
    guardian_consent_date DATE,

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    granted_at          TIMESTAMPTZ DEFAULT NOW(),
    expires_at          DATE,
    revoked_at          TIMESTAMPTZ,

    -- Evidence
    document_url        TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_player ON consent_records(player_id);
CREATE INDEX idx_consent_active ON consent_records(is_active);

-- ──────────────────────────────────────────
-- 27. COMMITTEES
-- ──────────────────────────────────────────
CREATE TABLE committees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    purpose         TEXT,
    members         JSONB DEFAULT '[]',     -- array of {user_id, name, role}
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- 28. QUARTERLY REVIEWS (immutable)
-- ──────────────────────────────────────────
CREATE TABLE quarterly_reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    quarter             VARCHAR(10) NOT NULL,   -- e.g., 'Q1-2026'
    review_date         DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Outcome (immutable after recording)
    outcome             review_outcome NOT NULL,
    performance_summary TEXT,
    goals_met           INT DEFAULT 0,
    goals_total         INT DEFAULT 0,

    -- Scores
    performance_score   INT,     -- 1-10
    attitude_score      INT,
    development_score   INT,

    -- Action items
    action_items        JSONB DEFAULT '[]',
    recommendations     TEXT,

    -- Meta (no updated_at — immutable)
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    committee_id        UUID REFERENCES committees(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quarterly_reviews_player ON quarterly_reviews(player_id);
CREATE INDEX idx_quarterly_reviews_quarter ON quarterly_reviews(quarter);

-- ──────────────────────────────────────────
-- 29. TRIGGER RULES (automation engine)
-- ──────────────────────────────────────────
CREATE TABLE trigger_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    trigger_type    trigger_type NOT NULL,
    severity        trigger_severity DEFAULT 'Medium',

    -- Rule config
    description     TEXT,
    threshold       TEXT NOT NULL,           -- rule condition description
    conditions      JSONB DEFAULT '{}',      -- machine-readable conditions
    evidence_sources TEXT[] DEFAULT '{}',
    actions         TEXT[] DEFAULT '{}',      -- list of actions to fire

    -- Status
    is_active       BOOLEAN DEFAULT TRUE,
    last_fired      TIMESTAMPTZ,
    fire_count      INT DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trigger_rules_type ON trigger_rules(trigger_type);
CREATE INDEX idx_trigger_rules_active ON trigger_rules(is_active);

-- ──────────────────────────────────────────
-- 30. REFERRALS
-- ──────────────────────────────────────────
CREATE TABLE referrals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_type       referral_type NOT NULL,
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

    -- Trigger info
    trigger_desc        TEXT,
    trigger_rule_id     UUID REFERENCES trigger_rules(id) ON DELETE SET NULL,
    is_auto_generated   BOOLEAN DEFAULT FALSE,

    -- Status
    status              referral_status DEFAULT 'Open',
    priority            referral_priority DEFAULT 'Medium',

    -- Assignment
    assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at         TIMESTAMPTZ,
    due_date            DATE,
    resolved_at         TIMESTAMPTZ,

    -- Details
    evidence_count      INT DEFAULT 0,
    session_count       INT DEFAULT 0,
    outcome             TEXT,
    notes               TEXT,

    -- Access control (mental health referrals are restricted)
    is_restricted       BOOLEAN DEFAULT FALSE,
    restricted_to       UUID[] DEFAULT '{}',    -- list of user IDs who can view

    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_player ON referrals(player_id);
CREATE INDEX idx_referrals_type ON referrals(referral_type);
CREATE INDEX idx_referrals_status ON referrals(status);

COMMIT;
