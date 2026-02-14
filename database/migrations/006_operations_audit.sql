-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 006
-- Operations: Tasks, Documents, IDPs, Audit Log
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- 31. TASKS
-- ──────────────────────────────────────────
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               VARCHAR(500) NOT NULL,
    title_ar            VARCHAR(500),
    description         TEXT,
    type                task_type DEFAULT 'General',
    status              task_status DEFAULT 'Open',
    priority            task_priority DEFAULT 'medium',

    -- Assignment
    assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by         UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Relations
    player_id           UUID REFERENCES players(id) ON DELETE SET NULL,
    match_id            UUID REFERENCES matches(id) ON DELETE SET NULL,
    contract_id         UUID REFERENCES contracts(id) ON DELETE SET NULL,

    -- Dates
    due_date            DATE,
    completed_at        TIMESTAMPTZ,

    -- Automation
    is_auto_created     BOOLEAN DEFAULT FALSE,
    trigger_rule_id     UUID REFERENCES trigger_rules(id) ON DELETE SET NULL,

    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_player ON tasks(player_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_type ON tasks(type);

-- ──────────────────────────────────────────
-- 32. DOCUMENTS
-- ──────────────────────────────────────────
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID REFERENCES players(id) ON DELETE SET NULL,
    contract_id         UUID REFERENCES contracts(id) ON DELETE SET NULL,

    name                VARCHAR(500) NOT NULL,
    type                document_type DEFAULT 'Other',
    status              document_status DEFAULT 'Active',
    file_url            TEXT NOT NULL,
    file_size           BIGINT,             -- bytes
    mime_type           VARCHAR(100),

    -- Validity
    issue_date          DATE,
    expiry_date         DATE,

    -- Meta
    uploaded_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    tags                TEXT[] DEFAULT '{}',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_player ON documents(player_id);
CREATE INDEX idx_documents_contract ON documents(contract_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);

-- ──────────────────────────────────────────
-- 33. TECHNICAL REPORTS
-- ──────────────────────────────────────────
CREATE TABLE tech_reports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id            UUID REFERENCES matches(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL,
    status              report_status DEFAULT 'Draft',

    -- Content
    content             TEXT,
    summary             TEXT,
    key_findings        JSONB DEFAULT '[]',
    recommendations     TEXT,

    -- Ratings (1-10)
    technical_rating    INT,
    tactical_rating     INT,
    physical_rating     INT,
    mental_rating       INT,
    overall_rating      INT,

    -- Media
    video_urls          TEXT[] DEFAULT '{}',
    attachments         JSONB DEFAULT '[]',

    -- Meta
    authored_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tech_reports_player ON tech_reports(player_id);
CREATE INDEX idx_tech_reports_match ON tech_reports(match_id);
CREATE INDEX idx_tech_reports_status ON tech_reports(status);

-- ──────────────────────────────────────────
-- 34. INDIVIDUAL DEVELOPMENT PLANS (IDP)
-- ──────────────────────────────────────────
CREATE TABLE idps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    season              VARCHAR(20),
    status              VARCHAR(50) DEFAULT 'Active',   -- Active, Completed, Archived

    -- Overview
    long_term_vision    TEXT,
    short_term_focus    TEXT,
    strengths           TEXT[] DEFAULT '{}',
    areas_to_improve    TEXT[] DEFAULT '{}',

    -- Progress
    progress_pct        INT DEFAULT 0,

    -- Meta
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    last_reviewed       DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idps_player ON idps(player_id);

-- ──────────────────────────────────────────
-- 35. IDP GOALS
-- ──────────────────────────────────────────
CREATE TABLE idp_goals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idp_id          UUID NOT NULL REFERENCES idps(id) ON DELETE CASCADE,
    area            VARCHAR(255) NOT NULL,   -- 'Technical', 'Physical', 'Mental', 'Tactical'
    target          TEXT NOT NULL,
    current         TEXT,
    metric          VARCHAR(255),            -- measurable indicator
    status          idp_goal_status DEFAULT 'InProgress',
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idp_goals_idp ON idp_goals(idp_id);

-- ──────────────────────────────────────────
-- 36. SHARE LINKS (external sharing)
-- ──────────────────────────────────────────
CREATE TABLE share_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_type       VARCHAR(100) NOT NULL,   -- 'TransferPack', 'PlayerProfile', 'Report'
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    target          VARCHAR(255),            -- who it's shared with (club name, email)

    -- Token
    token           VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

    -- Usage
    access_count    INT DEFAULT 0,
    max_access      INT,                     -- null = unlimited
    is_revoked      BOOLEAN DEFAULT FALSE,

    -- Dates
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_player ON share_links(player_id);
CREATE INDEX idx_share_links_expires ON share_links(expires_at);

-- ──────────────────────────────────────────
-- 37. NOTIFICATIONS
-- ──────────────────────────────────────────
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    message         TEXT,
    type            VARCHAR(100),            -- 'alert', 'info', 'warning', 'success'
    category        VARCHAR(100),            -- 'match', 'contract', 'payment', 'task', 'system'

    -- Relations
    entity_type     VARCHAR(100),
    entity_id       UUID,

    -- Status
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ──────────────────────────────────────────
-- 38. AUDIT LOG (immutable)
-- ──────────────────────────────────────────
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action          VARCHAR(255) NOT NULL,      -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name       VARCHAR(255),
    user_role       user_role,

    -- What changed
    entity          VARCHAR(100),               -- table name
    entity_id       UUID,
    detail          TEXT,
    changes         JSONB,                      -- {field: {old: x, new: y}}

    -- Context
    ip_address      INET,
    user_agent      TEXT,
    request_method  VARCHAR(10),
    request_path    TEXT,

    -- Timestamp (no updated_at — immutable)
    logged_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned indexes for performance on large audit tables
CREATE INDEX idx_audit_entity ON audit_logs(entity);
CREATE INDEX idx_audit_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_date ON audit_logs(logged_at);
CREATE INDEX idx_audit_date_entity ON audit_logs(logged_at, entity);

-- ──────────────────────────────────────────
-- 39. AUTOMATION LOG
-- ──────────────────────────────────────────
CREATE TABLE automation_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_rule_id UUID REFERENCES trigger_rules(id) ON DELETE SET NULL,
    rule_name       VARCHAR(255),
    trigger_type    trigger_type,

    -- Execution
    fired_at        TIMESTAMPTZ DEFAULT NOW(),
    success         BOOLEAN DEFAULT TRUE,
    error_message   TEXT,

    -- What it did
    actions_taken   JSONB DEFAULT '[]',     -- [{action, entity, entity_id}]
    tasks_created   INT DEFAULT 0,
    notifications_sent INT DEFAULT 0,

    -- Context
    triggered_by_entity VARCHAR(100),
    triggered_by_id     UUID
);

CREATE INDEX idx_automation_logs_rule ON automation_logs(trigger_rule_id);
CREATE INDEX idx_automation_logs_fired ON automation_logs(fired_at);

COMMIT;
