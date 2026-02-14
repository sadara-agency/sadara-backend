-- ══════════════════════════════════════════════════════════════
-- SADARA DATABASE SCHEMA — Migration 007
-- Triggers, Functions & Views
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that have updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name NOT IN ('audit_logs', 'selection_decisions', 'quarterly_reviews')
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp()',
            t, t
        );
    END LOOP;
END $$;


-- ══════════════════════════════════════════
-- AUDIT LOG HELPER FUNCTION
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_log_audit(
    p_action VARCHAR,
    p_user_id UUID,
    p_user_name VARCHAR,
    p_entity VARCHAR,
    p_entity_id UUID,
    p_detail TEXT DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_ip INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_logs (action, user_id, user_name, entity, entity_id, detail, changes, ip_address)
    VALUES (p_action, p_user_id, p_user_name, p_entity, p_entity_id, p_detail, p_changes, p_ip)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- ══════════════════════════════════════════
-- CONTRACT STATUS AUTO-UPDATE
-- Sets 'Expiring Soon' when within 30 days
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_update_contract_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_date IS NOT NULL THEN
        IF NEW.end_date < CURRENT_DATE THEN
            NEW.status = 'Expired';
        ELSIF NEW.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN
            NEW.status = 'Expiring Soon';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contract_status_check
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION fn_update_contract_status();


-- ══════════════════════════════════════════
-- INVOICE NUMBER AUTO-GENERATION
-- Format: INV-YYYYMM-XXXX
-- ══════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION fn_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                             LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION fn_generate_invoice_number();


-- ══════════════════════════════════════════
-- SCREENING CASE NUMBER AUTO-GENERATION
-- Format: SC-YYYYMM-XXXX
-- ══════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS screening_case_seq START WITH 1;

CREATE OR REPLACE FUNCTION fn_generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
        NEW.case_number = 'SC-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                          LPAD(nextval('screening_case_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_case_number
BEFORE INSERT ON screening_cases
FOR EACH ROW EXECUTE FUNCTION fn_generate_case_number();


-- ══════════════════════════════════════════
-- USEFUL VIEWS
-- ══════════════════════════════════════════

-- Player overview with current club and agent
CREATE OR REPLACE VIEW vw_player_overview AS
SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.first_name_ar,
    p.last_name_ar,
    p.first_name || ' ' || p.last_name AS full_name,
    COALESCE(p.first_name_ar || ' ' || p.last_name_ar, '') AS full_name_ar,
    p.date_of_birth,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::INT AS age,
    p.nationality,
    p.player_type,
    p.status,
    p.position,
    p.preferred_foot,
    p.market_value,
    p.photo_url,
    c.name AS club_name,
    c.logo_url AS club_logo,
    u.full_name AS agent_name,
    (SELECT COUNT(*) FROM contracts ct WHERE ct.player_id = p.id AND ct.status = 'Active') AS active_contracts,
    (SELECT COUNT(*) FROM injuries i WHERE i.player_id = p.id AND i.status = 'UnderTreatment') AS active_injuries,
    rr.overall_risk
FROM players p
LEFT JOIN clubs c ON p.current_club_id = c.id
LEFT JOIN users u ON p.agent_id = u.id
LEFT JOIN risk_radars rr ON rr.player_id = p.id;


-- Expiring contracts (next 90 days)
CREATE OR REPLACE VIEW vw_expiring_contracts AS
SELECT
    c.id,
    c.title,
    c.status,
    c.end_date,
    c.end_date - CURRENT_DATE AS days_remaining,
    c.base_salary,
    c.total_commission,
    p.first_name || ' ' || p.last_name AS player_name,
    cl.name AS club_name
FROM contracts c
JOIN players p ON c.player_id = p.id
JOIN clubs cl ON c.club_id = cl.id
WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  AND c.status != 'Expired'
ORDER BY c.end_date ASC;


-- Overdue payments
CREATE OR REPLACE VIEW vw_overdue_payments AS
SELECT
    py.id,
    py.amount,
    py.currency,
    py.due_date,
    CURRENT_DATE - py.due_date AS days_overdue,
    py.payment_type,
    py.payer,
    p.first_name || ' ' || p.last_name AS player_name,
    i.invoice_number
FROM payments py
LEFT JOIN players p ON py.player_id = p.id
LEFT JOIN invoices i ON py.invoice_id = i.id
WHERE py.status = 'Overdue'
   OR (py.status = 'Expected' AND py.due_date < CURRENT_DATE)
ORDER BY py.due_date ASC;


-- Dashboard KPIs
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM players WHERE status = 'active') AS total_active_players,
    (SELECT COUNT(*) FROM players WHERE player_type = 'Pro' AND status = 'active') AS pro_players,
    (SELECT COUNT(*) FROM players WHERE player_type = 'Youth' AND status = 'active') AS youth_players,
    (SELECT COUNT(*) FROM contracts WHERE status = 'Active') AS active_contracts,
    (SELECT COUNT(*) FROM contracts WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS expiring_soon,
    (SELECT COUNT(*) FROM offers WHERE status IN ('New', 'Under Review', 'Negotiation')) AS pending_offers,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'Paid' AND paid_date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_revenue,
    (SELECT COUNT(*) FROM payments WHERE status = 'Overdue' OR (status = 'Expected' AND due_date < CURRENT_DATE)) AS overdue_payments,
    (SELECT COUNT(*) FROM tasks WHERE status = 'Open') AS open_tasks,
    (SELECT COUNT(*) FROM injuries WHERE status = 'UnderTreatment') AS active_injuries,
    (SELECT COUNT(*) FROM referrals WHERE status IN ('Open', 'InProgress')) AS open_referrals,
    (SELECT COUNT(*) FROM matches WHERE status = 'upcoming' AND match_date <= CURRENT_DATE + 7) AS upcoming_matches;


-- Injured players with upcoming matches (conflict detection)
CREATE OR REPLACE VIEW vw_injury_match_conflicts AS
SELECT
    i.id AS injury_id,
    p.id AS player_id,
    p.first_name || ' ' || p.last_name AS player_name,
    i.injury_type,
    i.severity,
    i.expected_return,
    m.id AS match_id,
    m.match_date,
    m.competition,
    hc.name AS home_team,
    ac.name AS away_team
FROM injuries i
JOIN players p ON i.player_id = p.id
JOIN matches m ON (
    m.home_club_id = p.current_club_id
    OR m.away_club_id = p.current_club_id
)
LEFT JOIN clubs hc ON m.home_club_id = hc.id
LEFT JOIN clubs ac ON m.away_club_id = ac.id
WHERE i.status = 'UnderTreatment'
  AND m.status = 'upcoming'
  AND m.match_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
  AND (i.expected_return IS NULL OR i.expected_return > m.match_date)
ORDER BY m.match_date ASC;

COMMIT;
