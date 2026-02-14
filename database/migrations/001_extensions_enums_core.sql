-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 001
-- Extensions, Enums & Core Tables
-- PostgreSQL 16+
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────
-- Custom ENUM types
-- ──────────────────────────────────────────

-- Core
CREATE TYPE user_role AS ENUM ('Admin', 'Manager', 'Analyst', 'Scout', 'Player');
CREATE TYPE player_type AS ENUM ('Pro', 'Youth');
CREATE TYPE player_status AS ENUM ('active', 'injured', 'inactive');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE entity_type AS ENUM ('Club', 'Sponsor');

-- Contracts & Offers
CREATE TYPE contract_category AS ENUM ('Club', 'Sponsorship');
CREATE TYPE contract_status AS ENUM ('Active', 'Expiring Soon', 'Expired', 'Draft');
CREATE TYPE offer_type AS ENUM ('Transfer', 'Loan');
CREATE TYPE offer_status AS ENUM ('New', 'Under Review', 'Negotiation', 'Closed');

-- Matches & Performance
CREATE TYPE match_status AS ENUM ('upcoming', 'live', 'completed', 'cancelled');
CREATE TYPE injury_status AS ENUM ('UnderTreatment', 'Recovered', 'Monitoring');
CREATE TYPE injury_severity AS ENUM ('Low', 'Medium', 'High');

-- Tasks & Documents
CREATE TYPE task_status AS ENUM ('Open', 'InProgress', 'Completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_type AS ENUM ('Match', 'Contract', 'Health', 'Report', 'Offer', 'General');
CREATE TYPE document_type AS ENUM ('Contract', 'Passport', 'Medical', 'ID', 'Agreement', 'Other');
CREATE TYPE document_status AS ENUM ('Active', 'Valid', 'Pending', 'Expired');

-- Finance
CREATE TYPE payment_type AS ENUM ('Commission', 'Sponsorship', 'Bonus');
CREATE TYPE payment_status AS ENUM ('Paid', 'Expected', 'Overdue', 'Cancelled');
CREATE TYPE valuation_trend AS ENUM ('up', 'down', 'stable');
CREATE TYPE ledger_side AS ENUM ('Debit', 'Credit');

-- Reports & Scouting
CREATE TYPE report_status AS ENUM ('Published', 'Draft');
CREATE TYPE watchlist_status AS ENUM ('Active', 'Screening', 'Selected', 'Rejected');
CREATE TYPE screening_status AS ENUM ('InProgress', 'PackReady', 'Closed');
CREATE TYPE identity_check AS ENUM ('Verified', 'Pending', 'Failed');
CREATE TYPE decision_type AS ENUM ('Approved', 'Rejected', 'Deferred');
CREATE TYPE decision_scope AS ENUM ('Full', 'Transfer-Only');

-- Governance
CREATE TYPE gate_number AS ENUM ('0', '1', '2', '3');
CREATE TYPE gate_status AS ENUM ('InProgress', 'Pending', 'Completed');
CREATE TYPE referral_type AS ENUM ('Performance', 'Mental', 'Medical');
CREATE TYPE referral_status AS ENUM ('Open', 'InProgress', 'Resolved', 'Escalated');
CREATE TYPE referral_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE trigger_type AS ENUM ('PostMatch', 'PreMatch', 'ContractExpiry', 'PaymentDue', 'InjuryConflict');
CREATE TYPE trigger_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE review_outcome AS ENUM ('OnTrack', 'AtRisk', 'ActionRequired');
CREATE TYPE idp_goal_status AS ENUM ('NotStarted', 'InProgress', 'Completed', 'Deferred');
CREATE TYPE automation_status AS ENUM ('active', 'inactive');

-- ──────────────────────────────────────────
-- 1. USERS (authentication & RBAC)
-- ──────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    full_name_ar    VARCHAR(255),
    role            user_role NOT NULL DEFAULT 'Analyst',
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret  VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ──────────────────────────────────────────
-- 2. CLUBS & CONTACTS
-- ──────────────────────────────────────────
CREATE TABLE clubs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    type            entity_type NOT NULL DEFAULT 'Club',
    country         VARCHAR(100),
    city            VARCHAR(100),
    league          VARCHAR(255),
    logo_url        TEXT,
    website         VARCHAR(255),
    founded_year    INT,
    stadium         VARCHAR(255),
    stadium_capacity INT,
    primary_color   VARCHAR(7),
    secondary_color VARCHAR(7),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clubs_type ON clubs(type);
CREATE INDEX idx_clubs_country ON clubs(country);

CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    role            VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    is_primary      BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_club ON contacts(club_id);

-- ──────────────────────────────────────────
-- 3. PLAYERS
-- ──────────────────────────────────────────
CREATE TABLE players (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Basic info
    first_name          VARCHAR(255) NOT NULL,
    last_name           VARCHAR(255) NOT NULL,
    first_name_ar       VARCHAR(255),
    last_name_ar        VARCHAR(255),
    date_of_birth       DATE NOT NULL,
    nationality         VARCHAR(100),
    secondary_nationality VARCHAR(100),
    photo_url           TEXT,

    -- Football info
    player_type         player_type NOT NULL DEFAULT 'Pro',
    status              player_status DEFAULT 'active',
    position            VARCHAR(100),
    secondary_position  VARCHAR(100),
    preferred_foot      VARCHAR(10),        -- Left, Right, Both
    height_cm           DECIMAL(5,1),
    weight_kg           DECIMAL(5,1),
    jersey_number       INT,

    -- Current affiliation
    current_club_id     UUID REFERENCES clubs(id) ON DELETE SET NULL,

    -- Agent info
    agent_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    representation_start DATE,
    representation_end   DATE,

    -- Market
    market_value         DECIMAL(15,2),
    market_value_currency VARCHAR(3) DEFAULT 'SAR',

    -- Contact
    email               VARCHAR(255),
    phone               VARCHAR(50),
    address             TEXT,

    -- Meta
    notes               TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_players_type ON players(player_type);
CREATE INDEX idx_players_club ON players(current_club_id);
CREATE INDEX idx_players_agent ON players(agent_id);
CREATE INDEX idx_players_name ON players(last_name, first_name);

-- ──────────────────────────────────────────
-- 4. PLAYER ACCOUNTS (separate auth for players)
-- ──────────────────────────────────────────
CREATE TABLE player_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    status          account_status DEFAULT 'pending',
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_accounts_player ON player_accounts(player_id);
CREATE INDEX idx_player_accounts_email ON player_accounts(email);

COMMIT;
