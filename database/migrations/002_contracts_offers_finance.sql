-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 002
-- Contracts, Offers & Finance
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- 5. CONTRACTS
-- ──────────────────────────────────────────
CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    category            contract_category NOT NULL DEFAULT 'Club',
    status              contract_status DEFAULT 'Draft',

    -- Terms
    title               VARCHAR(255),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    base_salary         DECIMAL(15,2),
    salary_currency     VARCHAR(3) DEFAULT 'SAR',
    signing_bonus       DECIMAL(15,2) DEFAULT 0,
    release_clause      DECIMAL(15,2),
    performance_bonus   DECIMAL(15,2) DEFAULT 0,

    -- Commission
    commission_pct      DECIMAL(5,2),           -- e.g., 10.00 = 10%
    total_commission    DECIMAL(15,2),
    commission_locked   BOOLEAN DEFAULT FALSE,  -- locked after calculation

    -- File & notes
    document_url        TEXT,
    notes               TEXT,

    -- Meta
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_player ON contracts(player_id);
CREATE INDEX idx_contracts_club ON contracts(club_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);

-- ──────────────────────────────────────────
-- 6. COMMISSION SCHEDULES
-- ──────────────────────────────────────────
CREATE TABLE commission_schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    total_amount    DECIMAL(15,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'SAR',
    installments    INT DEFAULT 1,
    is_locked       BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commission_schedules_contract ON commission_schedules(contract_id);

-- ──────────────────────────────────────────
-- 7. MILESTONES (commission installments)
-- ──────────────────────────────────────────
CREATE TABLE milestones (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_schedule_id  UUID NOT NULL REFERENCES commission_schedules(id) ON DELETE CASCADE,
    label                   VARCHAR(255) NOT NULL,
    amount                  DECIMAL(15,2) NOT NULL,
    due_date                DATE NOT NULL,
    is_paid                 BOOLEAN DEFAULT FALSE,
    paid_date               DATE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_schedule ON milestones(commission_schedule_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);

-- ──────────────────────────────────────────
-- 8. OFFERS
-- ──────────────────────────────────────────
CREATE TABLE offers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    from_club_id        UUID REFERENCES clubs(id) ON DELETE SET NULL,
    to_club_id          UUID REFERENCES clubs(id) ON DELETE SET NULL,
    offer_type          offer_type NOT NULL DEFAULT 'Transfer',
    status              offer_status DEFAULT 'New',

    -- Financial terms
    transfer_fee        DECIMAL(15,2),
    salary_offered      DECIMAL(15,2),
    contract_years      INT,
    agent_fee           DECIMAL(15,2),
    fee_currency        VARCHAR(3) DEFAULT 'SAR',

    -- Conditions
    conditions          JSONB DEFAULT '[]',     -- array of condition objects
    counter_offer       JSONB,                  -- counter-offer details

    -- Timeline
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    deadline            DATE,
    responded_at        TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,

    -- Notes
    notes               TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_player ON offers(player_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_from_club ON offers(from_club_id);
CREATE INDEX idx_offers_to_club ON offers(to_club_id);

-- ──────────────────────────────────────────
-- 9. INVOICES
-- ──────────────────────────────────────────
CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number      VARCHAR(50) UNIQUE NOT NULL,
    contract_id         UUID REFERENCES contracts(id) ON DELETE SET NULL,
    player_id           UUID REFERENCES players(id) ON DELETE SET NULL,
    club_id             UUID REFERENCES clubs(id) ON DELETE SET NULL,

    -- Financial
    amount              DECIMAL(15,2) NOT NULL,
    tax_amount          DECIMAL(15,2) DEFAULT 0,
    total_amount        DECIMAL(15,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'SAR',
    status              payment_status DEFAULT 'Expected',

    -- Dates
    issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date            DATE NOT NULL,
    paid_date           DATE,

    -- Details
    description         TEXT,
    line_items          JSONB DEFAULT '[]',
    document_url        TEXT,

    -- Meta
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_contract ON invoices(contract_id);
CREATE INDEX idx_invoices_player ON invoices(player_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE UNIQUE INDEX idx_invoices_number ON invoices(invoice_number);

-- ──────────────────────────────────────────
-- 10. PAYMENTS
-- ──────────────────────────────────────────
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
    milestone_id        UUID REFERENCES milestones(id) ON DELETE SET NULL,
    player_id           UUID REFERENCES players(id) ON DELETE SET NULL,

    -- Financial
    amount              DECIMAL(15,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'SAR',
    payment_type        payment_type NOT NULL DEFAULT 'Commission',
    status              payment_status DEFAULT 'Expected',

    -- Dates
    due_date            DATE NOT NULL,
    paid_date           DATE,

    -- Details
    reference           VARCHAR(255),
    payer               VARCHAR(255),
    notes               TEXT,

    -- Meta
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_player ON payments(player_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- ──────────────────────────────────────────
-- 11. MARKET VALUATIONS
-- ──────────────────────────────────────────
CREATE TABLE valuations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    value           DECIMAL(15,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'SAR',
    source          VARCHAR(255),       -- e.g., 'Transfermarkt', 'Internal'
    trend           valuation_trend DEFAULT 'stable',
    change_pct      DECIMAL(5,2),       -- percentage change from previous
    valued_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_valuations_player ON valuations(player_id);
CREATE INDEX idx_valuations_date ON valuations(valued_at);

-- ──────────────────────────────────────────
-- 12. LEDGER (double-entry accounting)
-- ──────────────────────────────────────────
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id  UUID NOT NULL DEFAULT uuid_generate_v4(),  -- groups debit/credit pairs
    side            ledger_side NOT NULL,
    account         VARCHAR(255) NOT NULL,   -- e.g., 'Accounts Receivable', 'Commission Revenue'
    amount          DECIMAL(15,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'SAR',
    description     TEXT,
    reference_type  VARCHAR(100),            -- 'Invoice', 'Payment', 'Contract'
    reference_id    UUID,
    player_id       UUID REFERENCES players(id) ON DELETE SET NULL,
    posted_at       TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account);
CREATE INDEX idx_ledger_player ON ledger_entries(player_id);
CREATE INDEX idx_ledger_posted ON ledger_entries(posted_at);

COMMIT;
