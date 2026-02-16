-- ══════════════════════════════════════════════════════════════
-- SADARA FULL DATABASE RESET & SEED
-- Run this in pgAdmin Query Tool to reset everything
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- TRUNCATE ALL TABLES (order matters for FK)
-- ──────────────────────────────────────────
TRUNCATE TABLE
  automation_logs,
  audit_logs,
  notifications,
  share_links,
  idp_goals,
  idps,
  tech_reports,
  documents,
  tasks,
  referrals,
  trigger_rules,
  quarterly_reviews,
  committees,
  consent_records,
  guardians,
  gate_overrides,
  gate_checklists,
  gates,
  selection_decisions,
  screening_cases,
  watchlists,
  risk_radars,
  trainings,
  injuries,
  performances,
  match_players,
  matches,
  ledger_entries,
  valuations,
  payments,
  invoices,
  offers,
  milestones,
  commission_schedules,
  contracts,
  contacts,
  player_accounts,
  players,
  clubs,
  users
CASCADE;

-- ══════════════════════════════════════════════════════════════
-- USERS — password: sadara123
-- ══════════════════════════════════════════════════════════════
INSERT INTO users (id, email, password_hash, full_name, full_name_ar, role) VALUES
('a0000001-0000-0000-0000-000000000001', 'admin@sadara.com',   '$2a$12$sZhyoKPYR0y9bSGIBMIFnOIPOFqYCDbSMfVnYaFPB3InMGjTA8Z2W', 'Abdulaziz Al-Rashid', 'عبدالعزيز الراشد', 'Admin'),
('a0000001-0000-0000-0000-000000000002', 'omar@sadara.com',    '$2a$12$sZhyoKPYR0y9bSGIBMIFnOIPOFqYCDbSMfVnYaFPB3InMGjTA8Z2W', 'Omar Al-Dosari',     'عمر الدوسري',      'Manager'),
('a0000001-0000-0000-0000-000000000003', 'sarah@sadara.com',   '$2a$12$sZhyoKPYR0y9bSGIBMIFnOIPOFqYCDbSMfVnYaFPB3InMGjTA8Z2W', 'Sarah Al-Qahtani',   'سارة القحطاني',    'Analyst'),
('a0000001-0000-0000-0000-000000000004', 'khalid@sadara.com',  '$2a$12$sZhyoKPYR0y9bSGIBMIFnOIPOFqYCDbSMfVnYaFPB3InMGjTA8Z2W', 'Khalid Al-Shehri',   'خالد الشهري',      'Scout'),
('a0000001-0000-0000-0000-000000000005', 'fatimah@sadara.com', '$2a$12$sZhyoKPYR0y9bSGIBMIFnOIPOFqYCDbSMfVnYaFPB3InMGjTA8Z2W', 'Fatimah Al-Harbi',   'فاطمة الحربي',     'Manager');

-- ══════════════════════════════════════════════════════════════
-- CLUBS
-- ══════════════════════════════════════════════════════════════
INSERT INTO clubs (id, name, name_ar, type, country, city, league, founded_year, stadium, stadium_capacity, primary_color, secondary_color) VALUES
('c0000001-0000-0000-0000-000000000001', 'Al-Hilal FC',   'نادي الهلال',   'Club', 'Saudi Arabia', 'Riyadh',  'Saudi Pro League', 1957, 'Kingdom Arena',              68752, '#003876', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000002', 'Al-Nassr FC',   'نادي النصر',    'Club', 'Saudi Arabia', 'Riyadh',  'Saudi Pro League', 1955, 'Al-Awwal Park',              25000, '#FFDD00', '#003399'),
('c0000001-0000-0000-0000-000000000003', 'Al-Ittihad FC', 'نادي الاتحاد',  'Club', 'Saudi Arabia', 'Jeddah',  'Saudi Pro League', 1927, 'King Abdullah Sports City',  62345, '#FFD700', '#000000'),
('c0000001-0000-0000-0000-000000000004', 'Al-Ahli FC',    'نادي الأهلي',   'Club', 'Saudi Arabia', 'Jeddah',  'Saudi Pro League', 1937, 'King Abdullah Sports City',  62345, '#006633', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000005', 'Al-Shabab FC',  'نادي الشباب',   'Club', 'Saudi Arabia', 'Riyadh',  'Saudi Pro League', 1947, 'Al-Shabab Stadium',          25000, '#FFFFFF', '#000000'),
('c0000001-0000-0000-0000-000000000006', 'Al-Ettifaq FC', 'نادي الاتفاق',  'Club', 'Saudi Arabia', 'Dammam',  'Saudi Pro League', 1945, 'Prince Mohamed bin Fahd',    35000, '#006400', '#FFFF00'),
('c0000001-0000-0000-0000-000000000007', 'Al-Fateh FC',   'نادي الفتح',    'Club', 'Saudi Arabia', 'Al-Ahsa', 'Saudi Pro League', 1946, 'Prince Abdullah bin Jalawi', 22000, '#00FF00', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000008', 'Al-Raed FC',    'نادي الرائد',   'Club', 'Saudi Arabia', 'Buraidah','Saudi Pro League', 1954, 'King Abdullah Sport City',   25000, '#FF0000', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000009', 'Nike',          NULL,            'Sponsor', 'USA',       'Portland', NULL,              1964, NULL, NULL, '#000000', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000010','Adidas',         NULL,            'Sponsor', 'Germany',   'Herzogenaurach', NULL,         1949, NULL, NULL, '#000000', '#FFFFFF');

-- ══════════════════════════════════════════════════════════════
-- CONTACTS
-- ══════════════════════════════════════════════════════════════
INSERT INTO contacts (club_id, name, name_ar, role, email, phone, is_primary) VALUES
('c0000001-0000-0000-0000-000000000001', 'Mohammed Al-Otaibi', 'محمد العتيبي',  'Sporting Director',    'moh@alhilal.com',    '+966501234001', TRUE),
('c0000001-0000-0000-0000-000000000001', 'Fahad Al-Ghamdi',    'فهد الغامدي',   'Technical Director',   'fahad@alhilal.com',  '+966501234002', FALSE),
('c0000001-0000-0000-0000-000000000002', 'Sultan Al-Anazi',    'سلطان العنزي',  'GM',                   'sultan@alnassr.com', '+966501234003', TRUE),
('c0000001-0000-0000-0000-000000000003', 'Ahmed Al-Zahrani',   'أحمد الزهراني', 'Head of Transfers',    'ahmed@alittihad.com','+966501234004', TRUE),
('c0000001-0000-0000-0000-000000000004', 'Turki Al-Malki',     'تركي المالكي',  'CEO',                  'turki@alahli.com',   '+966501234005', TRUE),
('c0000001-0000-0000-0000-000000000009', 'Jake Williams',       NULL,            'Partnerships Manager', 'jake@nike.com',      '+1-503-555-0001', TRUE),
('c0000001-0000-0000-0000-000000000010','Thomas Müller',        NULL,            'Sports Marketing',     'thomas@adidas.com',  '+49-9132-0001', TRUE);

-- ══════════════════════════════════════════════════════════════
-- PLAYERS
-- ══════════════════════════════════════════════════════════════
INSERT INTO players (id, first_name, last_name, first_name_ar, last_name_ar, date_of_birth, nationality, player_type, status, position, preferred_foot, height_cm, weight_kg, jersey_number, current_club_id, agent_id, market_value, market_value_currency) VALUES
('d0000001-0000-0000-0000-000000000001', 'Faisal',      'Al-Ghamdi',  'فيصل',     'الغامدي',  '1998-03-15', 'Saudi Arabia', 'Pro',   'active',  'Midfielder',    'Right', 178, 73, 10, 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 15000000, 'SAR'),
('d0000001-0000-0000-0000-000000000002', 'Hassan',      'Al-Tamimi',  'حسن',      'التميمي',  '1995-07-22', 'Saudi Arabia', 'Pro',   'active',  'Striker',       'Left',  182, 78, 9,  'c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 22000000, 'SAR'),
('d0000001-0000-0000-0000-000000000003', 'Youssef',     'Al-Dawsari', 'يوسف',     'الدوسري',  '1997-11-08', 'Saudi Arabia', 'Pro',   'active',  'Left Winger',   'Right', 175, 70, 7,  'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 18500000, 'SAR'),
('d0000001-0000-0000-0000-000000000004', 'Abdulrahman', 'Al-Obaid',   'عبدالرحمن','العبيد',   '1996-01-30', 'Saudi Arabia', 'Pro',   'injured', 'Center Back',   'Right', 186, 82, 4,  'c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 12000000, 'SAR'),
('d0000001-0000-0000-0000-000000000005', 'Nawaf',       'Al-Abed',    'نواف',     'العابد',   '1999-05-12', 'Saudi Arabia', 'Pro',   'active',  'Goalkeeper',    'Right', 190, 85, 1,  'c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000005', 10000000, 'SAR'),
('d0000001-0000-0000-0000-000000000006', 'Salman',      'Al-Faraj',   'سلمان',    'الفرج',    '2000-09-03', 'Saudi Arabia', 'Pro',   'active',  'Right Back',    'Right', 177, 74, 2,  'c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 8000000,  'SAR'),
('d0000001-0000-0000-0000-000000000007', 'Turki',       'Al-Amri',    'تركي',     'العمري',   '1994-12-20', 'Saudi Arabia', 'Pro',   'active',  'Defensive Mid', 'Right', 180, 76, 6,  'c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000005', 7500000,  'SAR'),
('d0000001-0000-0000-0000-000000000008', 'Rayan',       'Al-Mutairi', 'ريان',     'المطيري',  '2007-04-18', 'Saudi Arabia', 'Youth', 'active',  'Striker',       'Left',  174, 65, 11, 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 500000,   'SAR'),
('d0000001-0000-0000-0000-000000000009', 'Majed',       'Al-Subaie',  'ماجد',     'السبيعي',  '2008-08-25', 'Saudi Arabia', 'Youth', 'active',  'Midfielder',    'Right', 170, 60, 14, 'c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000005', 300000,   'SAR'),
('d0000001-0000-0000-0000-000000000010', 'Bader',       'Al-Qahtani', 'بدر',      'القحطاني', '2007-12-01', 'Saudi Arabia', 'Youth', 'active',  'Left Back',     'Left',  176, 68, 3,  'c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 400000,   'SAR');

-- ══════════════════════════════════════════════════════════════
-- CONTRACTS
-- ══════════════════════════════════════════════════════════════
INSERT INTO contracts (id, player_id, club_id, category, status, title, start_date, end_date, base_salary, signing_bonus, release_clause, commission_pct, total_commission, created_by) VALUES
('c1000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Club',        'Active',        'Faisal × Al-Hilal 2024-27',          '2024-07-01', '2027-06-30', 2500000, 500000, 45000000, 10.00, 300000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Club',        'Active',        'Hassan × Al-Nassr 2023-26',          '2023-08-01', '2026-07-31', 3000000, 700000, 60000000, 12.00, 444000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Club',        'Active',        'Youssef × Al-Hilal 2025-28',         '2025-01-15', '2028-01-14', 2200000, 400000, 50000000, 10.00, 260000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', 'Club',        'Expiring Soon', 'Abdulrahman × Al-Ittihad 2023-26',   '2023-06-01', '2026-05-31', 1800000, 200000, 35000000, 8.00,  160000, 'a0000001-0000-0000-0000-000000000005'),
('c1000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000004', 'Club',        'Active',        'Nawaf × Al-Ahli 2024-27',            '2024-02-01', '2027-01-31', 1500000, 300000, 30000000, 10.00, 180000, 'a0000001-0000-0000-0000-000000000005'),
('c1000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000009', 'Sponsorship', 'Active',        'Faisal × Nike Endorsement',          '2025-01-01', '2026-12-31', 500000,  100000, NULL,     15.00, 90000,  'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000010', 'Sponsorship', 'Active',        'Hassan × Adidas Partnership',        '2024-06-01', '2026-05-31', 400000,  50000,  NULL,     15.00, 67500,  'a0000001-0000-0000-0000-000000000002');

-- ══════════════════════════════════════════════════════════════
-- OFFERS
-- ══════════════════════════════════════════════════════════════
INSERT INTO offers (player_id, from_club_id, to_club_id, offer_type, status, transfer_fee, salary_offered, contract_years, agent_fee, deadline, created_by) VALUES
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Transfer', 'Negotiation', 40000000, 3500000, 4, 4000000, '2026-03-15', 'a0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'Transfer', 'New',         55000000, 4000000, 3, 5500000, '2026-04-01', 'a0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'Loan',     'Under Review', NULL,    2000000, 1, 500000,  '2026-02-28', 'a0000001-0000-0000-0000-000000000005');

-- ══════════════════════════════════════════════════════════════
-- MATCHES
-- ══════════════════════════════════════════════════════════════
INSERT INTO matches (id, home_club_id, away_club_id, competition, season, match_date, venue, status, home_score, away_score) VALUES
('e0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Saudi Pro League', '2025-26', '2026-02-07 20:00:00+03', 'Kingdom Arena',              'completed', 2, 1),
('e0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000004', 'Saudi Pro League', '2025-26', '2026-02-08 18:00:00+03', 'King Abdullah Sports City',  'completed', 1, 1),
('e0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Saudi Pro League', '2025-26', '2026-02-20 20:00:00+03', 'Al-Awwal Park',              'upcoming',  NULL, NULL),
('e0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'Saudi Pro League', '2025-26', '2026-02-27 20:00:00+03', 'Kingdom Arena',              'upcoming',  NULL, NULL),
('e0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000006', 'Kings Cup',        '2025-26', '2026-02-22 19:00:00+03', 'King Abdullah Sports City',  'upcoming',  NULL, NULL);

-- ══════════════════════════════════════════════════════════════
-- MATCH PLAYERS
-- ══════════════════════════════════════════════════════════════
INSERT INTO match_players (match_id, player_id, club_id, started, minutes_played, goals, assists, yellow_cards, rating, position_played) VALUES
-- Match 1: Al-Hilal 2-1 Al-Nassr
('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', TRUE,  90, 1, 0, 0, 7.8, 'Midfielder'),
('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', TRUE,  85, 1, 1, 0, 8.2, 'Left Winger'),
('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000001', FALSE, 15, 0, 0, 0, 6.5, 'Striker'),
('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', TRUE,  90, 1, 0, 1, 7.2, 'Striker'),
-- Match 2: Al-Ittihad 1-1 Al-Ahli
('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', TRUE,  90, 0, 0, 1, 6.8, 'Center Back'),
('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000004', TRUE,  90, 0, 0, 0, 7.5, 'Goalkeeper'),
-- Match 3 upcoming: registered players
('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', TRUE,  0, 0, 0, 0, NULL, 'Striker'),
('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', TRUE,  0, 0, 0, 0, NULL, 'Center Back'),
-- Match 4 upcoming
('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', TRUE,  0, 0, 0, 0, NULL, 'Midfielder'),
('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', TRUE,  0, 0, 0, 0, NULL, 'Left Winger'),
('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000005', TRUE,  0, 0, 0, 0, NULL, 'Right Back');

-- ══════════════════════════════════════════════════════════════
-- PERFORMANCES (season aggregates)
-- ══════════════════════════════════════════════════════════════
INSERT INTO performances (player_id, season, competition, appearances, starts, minutes, goals, assists, yellow_cards, red_cards, clean_sheets, average_rating, xg, xa, key_passes, successful_dribbles, aerial_duels_won, data_source) VALUES
('d0000001-0000-0000-0000-000000000001', '2025-26', 'Saudi Pro League', 18, 17, 1520, 5,  7,  3, 0, 0,  7.4, 4.2,  5.8,  42, 28, 12, 'Manual'),
('d0000001-0000-0000-0000-000000000002', '2025-26', 'Saudi Pro League', 20, 20, 1780, 12, 3,  2, 0, 0,  7.8, 10.5, 2.1,  18, 35, 22, 'Manual'),
('d0000001-0000-0000-0000-000000000003', '2025-26', 'Saudi Pro League', 19, 18, 1600, 8,  10, 4, 0, 0,  7.6, 6.8,  8.2,  55, 48, 8,  'Manual'),
('d0000001-0000-0000-0000-000000000004', '2025-26', 'Saudi Pro League', 14, 14, 1260, 1,  0,  5, 1, 6,  6.9, 0.5,  0.2,  12, 5,  45, 'Manual'),
('d0000001-0000-0000-0000-000000000005', '2025-26', 'Saudi Pro League', 20, 20, 1800, 0,  0,  1, 0, 8,  7.2, 0.0,  0.0,  5,  0,  15, 'Manual'),
('d0000001-0000-0000-0000-000000000006', '2025-26', 'Saudi Pro League', 16, 15, 1380, 2,  5,  3, 0, 0,  7.0, 1.2,  3.5,  30, 22, 18, 'Manual'),
('d0000001-0000-0000-0000-000000000007', '2025-26', 'Saudi Pro League', 17, 16, 1440, 1,  2,  6, 0, 0,  6.8, 0.8,  1.5,  25, 10, 32, 'Manual'),
-- Previous season
('d0000001-0000-0000-0000-000000000001', '2024-25', 'Saudi Pro League', 28, 26, 2340, 7,  9,  4, 0, 0,  7.2, 6.0,  7.5,  58, 32, 15, 'Manual'),
('d0000001-0000-0000-0000-000000000002', '2024-25', 'Saudi Pro League', 30, 30, 2700, 18, 5,  3, 0, 0,  7.9, 16.2, 3.8,  22, 40, 28, 'Manual'),
('d0000001-0000-0000-0000-000000000003', '2024-25', 'Saudi Pro League', 26, 24, 2160, 10, 12, 5, 1, 0,  7.5, 8.5,  10.0, 65, 55, 10, 'Manual');

-- ══════════════════════════════════════════════════════════════
-- INJURIES
-- ══════════════════════════════════════════════════════════════
INSERT INTO injuries (player_id, injury_type, body_part, severity, status, injury_date, expected_return, diagnosis, match_id) VALUES
('d0000001-0000-0000-0000-000000000004', 'ACL Strain',    'Knee (Left)',   'High',   'UnderTreatment', '2026-01-20', '2026-04-15', 'Partial ACL tear requiring rehabilitation', NULL),
('d0000001-0000-0000-0000-000000000001', 'Muscle Strain', 'Hamstring',     'Medium', 'Monitoring',     '2026-02-07', '2026-02-20', 'Minor hamstring strain during match',       'e0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000007', 'Sprain',        'Ankle (Right)', 'Low',    'Recovered',      '2026-01-05', '2026-01-20', 'Mild ankle sprain, fully recovered',        NULL);

-- ══════════════════════════════════════════════════════════════
-- VALUATIONS
-- ══════════════════════════════════════════════════════════════
INSERT INTO valuations (player_id, value, currency, source, trend, change_pct, valued_at) VALUES
('d0000001-0000-0000-0000-000000000001', 15000000, 'SAR', 'Internal', 'up',     12.5,  '2026-02-01'),
('d0000001-0000-0000-0000-000000000001', 13300000, 'SAR', 'Internal', 'up',     8.0,   '2025-08-01'),
('d0000001-0000-0000-0000-000000000002', 22000000, 'SAR', 'Internal', 'up',     18.0,  '2026-02-01'),
('d0000001-0000-0000-0000-000000000002', 18600000, 'SAR', 'Internal', 'stable', 2.0,   '2025-08-01'),
('d0000001-0000-0000-0000-000000000003', 18500000, 'SAR', 'Internal', 'up',     15.0,  '2026-02-01'),
('d0000001-0000-0000-0000-000000000004', 12000000, 'SAR', 'Internal', 'down',   -20.0, '2026-02-01'),
('d0000001-0000-0000-0000-000000000005', 10000000, 'SAR', 'Internal', 'stable', 0.0,   '2026-02-01'),
('d0000001-0000-0000-0000-000000000006', 8000000,  'SAR', 'Internal', 'up',     10.0,  '2026-02-01'),
('d0000001-0000-0000-0000-000000000007', 7500000,  'SAR', 'Internal', 'down',   -5.0,  '2026-02-01'),
('d0000001-0000-0000-0000-000000000008', 500000,   'SAR', 'Internal', 'up',     25.0,  '2026-02-01'),
('d0000001-0000-0000-0000-000000000009', 300000,   'SAR', 'Internal', 'stable', 0.0,   '2026-02-01'),
('d0000001-0000-0000-0000-000000000010', 400000,   'SAR', 'Internal', 'up',     15.0,  '2026-02-01');

-- ══════════════════════════════════════════════════════════════
-- PAYMENTS
-- ══════════════════════════════════════════════════════════════
INSERT INTO payments (player_id, amount, currency, payment_type, status, due_date, paid_date, payer, reference) VALUES
-- Paid commissions (12 months of data for revenue chart)
('d0000001-0000-0000-0000-000000000001', 100000, 'SAR', 'Commission', 'Paid', '2025-04-15', '2025-04-15', 'Al-Hilal FC',  'Faisal commission installment 1'),
('d0000001-0000-0000-0000-000000000002', 148000, 'SAR', 'Commission', 'Paid', '2025-05-15', '2025-05-20', 'Al-Nassr FC',  'Hassan commission installment 1'),
('d0000001-0000-0000-0000-000000000001', 45000,  'SAR', 'Sponsorship','Paid', '2025-06-01', '2025-06-05', 'Nike',         'Faisal Nike agency fee H1'),
('d0000001-0000-0000-0000-000000000002', 33750,  'SAR', 'Sponsorship','Paid', '2025-06-15', '2025-06-15', 'Adidas',       'Hassan Adidas agency fee H1'),
('d0000001-0000-0000-0000-000000000001', 100000, 'SAR', 'Commission', 'Paid', '2025-07-15', '2025-07-15', 'Al-Hilal FC',  'Faisal commission installment 2'),
('d0000001-0000-0000-0000-000000000003', 86667,  'SAR', 'Commission', 'Paid', '2025-07-15', '2025-07-18', 'Al-Hilal FC',  'Youssef commission installment 1'),
('d0000001-0000-0000-0000-000000000002', 148000, 'SAR', 'Commission', 'Paid', '2025-08-15', '2025-08-20', 'Al-Nassr FC',  'Hassan commission installment 2'),
('d0000001-0000-0000-0000-000000000004', 53333,  'SAR', 'Commission', 'Paid', '2025-09-15', '2025-09-15', 'Al-Ittihad FC','Abdulrahman commission Q1'),
('d0000001-0000-0000-0000-000000000001', 100000, 'SAR', 'Commission', 'Paid', '2025-10-15', '2025-10-18', 'Al-Hilal FC',  'Faisal commission installment 3'),
('d0000001-0000-0000-0000-000000000003', 86667,  'SAR', 'Commission', 'Paid', '2025-10-15', '2025-10-15', 'Al-Hilal FC',  'Youssef commission installment 2'),
('d0000001-0000-0000-0000-000000000002', 148000, 'SAR', 'Commission', 'Paid', '2025-11-15', '2025-11-15', 'Al-Nassr FC',  'Hassan commission installment 3'),
('d0000001-0000-0000-0000-000000000005', 60000,  'SAR', 'Commission', 'Paid', '2025-11-15', '2025-11-18', 'Al-Ahli FC',   'Nawaf commission Q1'),
('d0000001-0000-0000-0000-000000000001', 45000,  'SAR', 'Sponsorship','Paid', '2025-12-01', '2025-12-01', 'Nike',         'Faisal Nike agency fee H2'),
('d0000001-0000-0000-0000-000000000002', 33750,  'SAR', 'Sponsorship','Paid', '2025-12-15', '2025-12-15', 'Adidas',       'Hassan Adidas agency fee H2'),
('d0000001-0000-0000-0000-000000000004', 53333,  'SAR', 'Commission', 'Paid', '2025-12-15', '2025-12-18', 'Al-Ittihad FC','Abdulrahman commission Q2'),
('d0000001-0000-0000-0000-000000000001', 100000, 'SAR', 'Commission', 'Paid', '2026-01-15', '2026-01-15', 'Al-Hilal FC',  'Faisal commission installment 4'),
('d0000001-0000-0000-0000-000000000003', 86667,  'SAR', 'Commission', 'Paid', '2026-01-15', '2026-01-18', 'Al-Hilal FC',  'Youssef commission installment 3'),
('d0000001-0000-0000-0000-000000000002', 148000, 'SAR', 'Commission', 'Paid', '2026-02-15', '2026-02-14', 'Al-Nassr FC',  'Hassan commission installment 4'),
-- Upcoming & overdue
('d0000001-0000-0000-0000-000000000004', 40000,  'SAR', 'Commission', 'Overdue',  '2026-01-31', NULL, 'Al-Ittihad FC', 'Abdulrahman commission Q3 — OVERDUE'),
('d0000001-0000-0000-0000-000000000005', 60000,  'SAR', 'Commission', 'Expected', '2026-02-28', NULL, 'Al-Ahli FC',    'Nawaf commission Q2'),
('d0000001-0000-0000-0000-000000000004', 53333,  'SAR', 'Commission', 'Expected', '2026-03-15', NULL, 'Al-Ittihad FC', 'Abdulrahman commission Q4');

-- ══════════════════════════════════════════════════════════════
-- TASKS
-- ══════════════════════════════════════════════════════════════
INSERT INTO tasks (title, title_ar, type, status, priority, assigned_to, player_id, due_date, is_auto_created) VALUES
('Post-match analysis: Al-Hilal vs Al-Nassr',    'تحليل ما بعد المباراة: الهلال ضد النصر',    'Match',    'Open',       'high',     'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000001', '2026-02-10', TRUE),
('Review Abdulrahman contract renewal options',   'مراجعة خيارات تجديد عقد عبدالرحمن',         'Contract', 'InProgress', 'high',     'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000004', '2026-03-01', FALSE),
('Schedule fitness test for Faisal',              'جدولة اختبار اللياقة لفيصل',                'Health',   'Open',       'medium',   'a0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000001', '2026-02-18', TRUE),
('Prepare transfer pack for Hassan offer',        'تجهيز ملف الانتقال لعرض حسن',               'Offer',    'Open',       'critical', 'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', '2026-02-20', FALSE),
('Update Rayan IDP for Q1 review',                'تحديث خطة تطوير ريان لمراجعة الربع الأول',   'Report',   'Open',       'medium',   'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000008', '2026-02-28', FALSE),
('Follow up overdue payment — Abdulrahman',       'متابعة دفعة متأخرة — عبدالرحمن',            'Contract', 'Open',       'critical', 'a0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000004', '2026-02-16', FALSE),
('Pre-match prep: Al-Nassr vs Al-Ittihad',        'تحضيرات ما قبل المباراة: النصر ضد الاتحاد',  'Match',    'Open',       'high',     'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002', '2026-02-19', TRUE);

-- ══════════════════════════════════════════════════════════════
-- TRIGGER RULES
-- ══════════════════════════════════════════════════════════════
INSERT INTO trigger_rules (name, name_ar, trigger_type, severity, threshold, actions, is_active) VALUES
('Post-Match Analysis',   'تحليل ما بعد المباراة',  'PostMatch',       'Medium',   'Match status changes to completed',   '{"Create analysis task","Notify analyst","Notify coach"}',               TRUE),
('Pre-Match Preparation', 'تحضيرات ما قبل المباراة', 'PreMatch',        'Medium',   'Match date is within 2 days',         '{"Create logistics task","Check injured players","Notify team"}',        TRUE),
('Contract Expiry Alert', 'تنبيه انتهاء العقد',      'ContractExpiry',  'High',     'Contract expires within 30 days',     '{"Create renewal task","Notify legal team","Notify agent"}',             TRUE),
('Payment Due Reminder',  'تذكير بموعد الدفع',       'PaymentDue',      'Medium',   'Payment due within 7 days',           '{"Create follow-up task","Send notification","Flag overdue"}',           TRUE),
('Injury-Match Conflict', 'تعارض إصابة مع مباراة',   'InjuryConflict',  'Critical', 'Injured player has upcoming match',   '{"Create health check task","Send critical alert","Notify medical staff"}', TRUE);

-- ══════════════════════════════════════════════════════════════
-- GUARDIANS (youth players)
-- ══════════════════════════════════════════════════════════════
INSERT INTO guardians (player_id, name, name_ar, relation, email, phone) VALUES
('d0000001-0000-0000-0000-000000000008', 'Abdullah Al-Mutairi', 'عبدالله المطيري', 'Father', 'abdullah.m@email.com', '+966501234010'),
('d0000001-0000-0000-0000-000000000009', 'Fahad Al-Subaie',     'فهد السبيعي',     'Father', 'fahad.s@email.com',    '+966501234011'),
('d0000001-0000-0000-0000-000000000010', 'Nasser Al-Qahtani',   'ناصر القحطاني',   'Father', 'nasser.q@email.com',   '+966501234012');

-- ══════════════════════════════════════════════════════════════
-- RISK RADARS
-- ══════════════════════════════════════════════════════════════
INSERT INTO risk_radars (player_id, performance_risk, mental_risk, medical_risk, transfer_risk, overall_risk, assessed_by) VALUES
('d0000001-0000-0000-0000-000000000001', 15, 10, 35, 60, 30, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000002', 20, 15, 10, 70, 29, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000003', 10, 20, 15, 25, 18, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000004', 45, 55, 80, 40, 55, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000005', 20, 10, 10, 15, 14, 'a0000001-0000-0000-0000-000000000003');

-- ══════════════════════════════════════════════════════════════
-- WATCHLISTS
-- ══════════════════════════════════════════════════════════════
INSERT INTO watchlists (prospect_name, prospect_name_ar, date_of_birth, nationality, position, current_club, current_league, status, source, scouted_by, video_clips, priority, technical_rating, physical_rating, mental_rating, potential_rating) VALUES
('Carlos Mendez',     NULL,              '2004-03-12', 'Brazil',       'Striker',     'Palmeiras U20',      'Brazilian Youth League',  'Active',    'Agent referral',      'a0000001-0000-0000-0000-000000000004', 5, 'High',   8, 7, 7, 9),
('Ahmed El-Sayed',    'أحمد السيد',      '2005-08-22', 'Egypt',        'Midfielder',  'Al-Ahly Youth',      'Egyptian Premier League', 'Active',    'Tournament scouting', 'a0000001-0000-0000-0000-000000000004', 3, 'Medium', 7, 8, 6, 8),
('Kenji Tanaka',      NULL,              '2003-11-05', 'Japan',        'Left Winger', 'Cerezo Osaka',       'J1 League',               'Active',    'Video analysis',      'a0000001-0000-0000-0000-000000000004', 8, 'High',   9, 7, 8, 9),
('Mohammed Al-Harbi', 'محمد الحربي',     '2006-01-15', 'Saudi Arabia', 'Goalkeeper',  'Al-Hilal Youth',     'Saudi Youth League',      'Active',    'Academy referral',    'a0000001-0000-0000-0000-000000000004', 2, 'Medium', 7, 8, 7, 8),
('Omar Benali',       NULL,              '2004-06-30', 'Morocco',      'Center Back', 'Raja Casablanca U21','Botola Pro',               'Screening', 'Agent network',       'a0000001-0000-0000-0000-000000000004', 4, 'High',   7, 9, 7, 8);

-- ══════════════════════════════════════════════════════════════
-- GATES (player lifecycle)
-- ══════════════════════════════════════════════════════════════
INSERT INTO gates (player_id, gate_number, status, started_at, completed_at, approved_by) VALUES
('d0000001-0000-0000-0000-000000000001', '1', 'Completed', '2024-06-15 10:00:00+03', '2024-06-20 14:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000001', '2', 'Completed', '2024-06-21 09:00:00+03', '2024-06-28 16:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000001', '3', 'Completed', '2024-07-01 09:00:00+03', '2024-07-05 12:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000002', '1', 'Completed', '2023-07-10 10:00:00+03', '2023-07-15 14:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000002', '2', 'Completed', '2023-07-16 09:00:00+03', '2023-07-25 16:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000003', '1', 'Completed', '2024-12-20 10:00:00+03', '2024-12-28 14:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000003', '2', 'Completed', '2025-01-02 09:00:00+03', '2025-01-10 16:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000008', '1', 'Completed', '2024-05-01 10:00:00+03', '2024-05-08 14:00:00+03', 'a0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000004', '1', 'Completed', '2023-05-10 10:00:00+03', '2023-05-18 14:00:00+03', 'a0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000005', '1', 'Completed', '2024-01-10 10:00:00+03', '2024-01-18 14:00:00+03', 'a0000001-0000-0000-0000-000000000001');

-- ══════════════════════════════════════════════════════════════
-- REFERRALS
-- ══════════════════════════════════════════════════════════════
INSERT INTO referrals (player_id, referral_type, status, trigger_desc, created_by, priority, notes) VALUES
('d0000001-0000-0000-0000-000000000004', 'Medical',     'InProgress', 'ACL rehabilitation monitoring',      'a0000001-0000-0000-0000-000000000005', 'High',   'Weekly check-ins required'),
('d0000001-0000-0000-0000-000000000008', 'Performance', 'Open',       'Youth talent fast-track assessment', 'a0000001-0000-0000-0000-000000000002', 'Medium', 'Exceptional youth league performance');

-- ══════════════════════════════════════════════════════════════
-- AUDIT LOGS (recent activity)
-- ══════════════════════════════════════════════════════════════
INSERT INTO audit_logs (action, user_id, user_name, user_role, entity, entity_id, detail, logged_at) VALUES
('CREATE', 'a0000001-0000-0000-0000-000000000002', 'Omar Al-Dosari',     'Manager', 'contracts',   'c1000001-0000-0000-0000-000000000003', 'Created contract: Youssef × Al-Hilal 2025-28',        NOW() - INTERVAL '30 days'),
('UPDATE', 'a0000001-0000-0000-0000-000000000002', 'Omar Al-Dosari',     'Manager', 'offers',      NULL,                                    'Updated Al-Ittihad offer for Faisal — Negotiation',   NOW() - INTERVAL '14 days'),
('CREATE', 'a0000001-0000-0000-0000-000000000003', 'Sarah Al-Qahtani',   'Analyst', 'performances',NULL,                                    'Updated season stats for 7 players',                  NOW() - INTERVAL '7 days'),
('UPDATE', 'a0000001-0000-0000-0000-000000000005', 'Fatimah Al-Harbi',   'Manager', 'injuries',    NULL,                                    'Abdulrahman injury status → UnderTreatment',          NOW() - INTERVAL '5 days'),
('CREATE', 'a0000001-0000-0000-0000-000000000004', 'Khalid Al-Shehri',   'Scout',   'watchlists',  NULL,                                    'Added prospect: Carlos Mendez (Palmeiras U20)',       NOW() - INTERVAL '3 days'),
('UPDATE', 'a0000001-0000-0000-0000-000000000002', 'Omar Al-Dosari',     'Manager', 'players',     'd0000001-0000-0000-0000-000000000001',  'Updated Faisal market value → 15,000,000 SAR',        NOW() - INTERVAL '2 days'),
('CREATE', 'a0000001-0000-0000-0000-000000000002', 'Omar Al-Dosari',     'Manager', 'tasks',       NULL,                                    'Created task: Prepare transfer pack for Hassan',      NOW() - INTERVAL '1 day'),
('CREATE', 'a0000001-0000-0000-0000-000000000003', 'Sarah Al-Qahtani',   'Analyst', 'tasks',       NULL,                                    'Post-match analysis: Al-Hilal vs Al-Nassr',           NOW() - INTERVAL '8 hours'),
('UPDATE', 'a0000001-0000-0000-0000-000000000005', 'Fatimah Al-Harbi',   'Manager', 'contracts',   'c1000001-0000-0000-0000-000000000004',  'Marked Abdulrahman contract → Expiring Soon',         NOW() - INTERVAL '4 hours'),
('LOGIN',  'a0000001-0000-0000-0000-000000000001', 'Abdulaziz Al-Rashid','Admin',   'users',       'a0000001-0000-0000-0000-000000000001',  'Admin login',                                         NOW() - INTERVAL '30 minutes');

COMMIT;