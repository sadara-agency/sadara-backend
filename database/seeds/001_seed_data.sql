-- ══════════════════════════════════════════════════════════════
-- SADARA SEED DATA
-- Realistic Saudi Football Market Data
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────
-- USERS
-- ──────────────────────────────────────────
-- Password for all seed users: "sadara123" (bcrypt hash)
-- In production, change immediately!

INSERT INTO users (id, email, password_hash, full_name, full_name_ar, role) VALUES
('a0000001-0000-0000-0000-000000000001', 'admin@sadara.com',     '$2b$12$LJ3X5rN7JIQL7X5rN7JIQL7X5rN7JIQLDummyHash000001', 'Abdulaziz Al-Rashid',    'عبدالعزيز الراشد',    'Admin'),
('a0000001-0000-0000-0000-000000000002', 'omar@sadara.com',      '$2b$12$LJ3X5rN7JIQL7X5rN7JIQL7X5rN7JIQLDummyHash000002', 'Omar Al-Dosari',        'عمر الدوسري',         'Manager'),
('a0000001-0000-0000-0000-000000000003', 'sarah@sadara.com',     '$2b$12$LJ3X5rN7JIQL7X5rN7JIQL7X5rN7JIQLDummyHash000003', 'Sarah Al-Qahtani',      'سارة القحطاني',       'Analyst'),
('a0000001-0000-0000-0000-000000000004', 'khalid@sadara.com',    '$2b$12$LJ3X5rN7JIQL7X5rN7JIQL7X5rN7JIQLDummyHash000004', 'Khalid Al-Shehri',      'خالد الشهري',         'Scout'),
('a0000001-0000-0000-0000-000000000005', 'fatimah@sadara.com',   '$2b$12$LJ3X5rN7JIQL7X5rN7JIQL7X5rN7JIQLDummyHash000005', 'Fatimah Al-Harbi',      'فاطمة الحربي',        'Manager');

-- ──────────────────────────────────────────
-- CLUBS (Saudi Pro League + Sponsors)
-- ──────────────────────────────────────────

INSERT INTO clubs (id, name, name_ar, type, country, city, league, founded_year, stadium, stadium_capacity, primary_color, secondary_color) VALUES
('c0000001-0000-0000-0000-000000000001', 'Al-Hilal FC',       'نادي الهلال',       'Club', 'Saudi Arabia', 'Riyadh',  'Saudi Pro League', 1957, 'Kingdom Arena',        68752, '#003876', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000002', 'Al-Nassr FC',       'نادي النصر',        'Club', 'Saudi Arabia', 'Riyadh',  'Saudi Pro League', 1955, 'Al-Awwal Park',        25000, '#FFDD00', '#003399'),
('c0000001-0000-0000-0000-000000000003', 'Al-Ittihad FC',     'نادي الاتحاد',      'Club', 'Saudi Arabia', 'Jeddah',  'Saudi Pro League', 1927, 'King Abdullah Sports City', 62345, '#FFD700', '#000000'),
('c0000001-0000-0000-0000-000000000004', 'Al-Ahli FC',        'نادي الأهلي',       'Club', 'Saudi Arabia', 'Jeddah',  'Saudi Pro League', 1937, 'King Abdullah Sports City', 62345, '#006633', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000005', 'Al-Shabab FC',      'نادي الشباب',       'Club', 'Saudi Arabia', 'Riyadh',  'Saudi Pro League', 1947, 'Al-Shabab Stadium',    25000, '#FFFFFF', '#000000'),
('c0000001-0000-0000-0000-000000000006', 'Al-Ettifaq FC',     'نادي الاتفاق',      'Club', 'Saudi Arabia', 'Dammam',  'Saudi Pro League', 1945, 'Prince Mohamed bin Fahd', 35000, '#006400', '#FFFF00'),
('c0000001-0000-0000-0000-000000000007', 'Al-Fateh FC',       'نادي الفتح',        'Club', 'Saudi Arabia', 'Al-Ahsa', 'Saudi Pro League', 1946, 'Prince Abdullah bin Jalawi', 22000, '#00FF00', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000008', 'Al-Raed FC',        'نادي الرائد',       'Club', 'Saudi Arabia', 'Buraidah','Saudi Pro League', 1954, 'King Abdullah Sport City', 25000, '#FF0000', '#FFFFFF'),
-- Sponsors
('c0000001-0000-0000-0000-000000000009', 'Nike',              NULL,                'Sponsor', 'USA',          'Portland', NULL, 1964, NULL, NULL, '#000000', '#FFFFFF'),
('c0000001-0000-0000-0000-000000000010', 'Adidas',            NULL,                'Sponsor', 'Germany',      'Herzogenaurach', NULL, 1949, NULL, NULL, '#000000', '#FFFFFF');

-- ──────────────────────────────────────────
-- CONTACTS
-- ──────────────────────────────────────────

INSERT INTO contacts (club_id, name, name_ar, role, email, phone, is_primary) VALUES
('c0000001-0000-0000-0000-000000000001', 'Mohammed Al-Otaibi',    'محمد العتيبي',    'Sporting Director', 'moh@alhilal.com',   '+966501234001', TRUE),
('c0000001-0000-0000-0000-000000000001', 'Fahad Al-Ghamdi',       'فهد الغامدي',     'Technical Director', 'fahad@alhilal.com', '+966501234002', FALSE),
('c0000001-0000-0000-0000-000000000002', 'Sultan Al-Anazi',       'سلطان العنزي',    'GM',                'sultan@alnassr.com', '+966501234003', TRUE),
('c0000001-0000-0000-0000-000000000003', 'Ahmed Al-Zahrani',      'أحمد الزهراني',   'Head of Transfers', 'ahmed@alittihad.com', '+966501234004', TRUE),
('c0000001-0000-0000-0000-000000000004', 'Turki Al-Malki',        'تركي المالكي',    'CEO',               'turki@alahli.com',   '+966501234005', TRUE),
('c0000001-0000-0000-0000-000000000009', 'Jake Williams',          NULL,              'Partnerships Manager', 'jake@nike.com',    '+1-503-555-0001', TRUE),
('c0000001-0000-0000-0000-000000000010', 'Thomas Müller',          NULL,              'Sports Marketing',  'thomas@adidas.com',  '+49-9132-0001', TRUE);

-- ──────────────────────────────────────────
-- PLAYERS
-- ──────────────────────────────────────────

INSERT INTO players (id, first_name, last_name, first_name_ar, last_name_ar, date_of_birth, nationality, player_type, status, position, preferred_foot, height_cm, weight_kg, jersey_number, current_club_id, agent_id, market_value, market_value_currency) VALUES
-- Pro Players
('d0000001-0000-0000-0000-000000000001', 'Faisal',    'Al-Ghamdi',   'فيصل',    'الغامدي',   '1998-03-15', 'Saudi Arabia', 'Pro', 'active',  'Midfielder',       'Right', 178, 73, 10, 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 15000000, 'SAR'),
('d0000001-0000-0000-0000-000000000002', 'Hassan',    'Al-Tamimi',   'حسن',     'التميمي',   '1995-07-22', 'Saudi Arabia', 'Pro', 'active',  'Striker',          'Left',  182, 78, 9,  'c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 22000000, 'SAR'),
('d0000001-0000-0000-0000-000000000003', 'Youssef',   'Al-Dawsari',  'يوسف',    'الدوسري',   '1997-11-08', 'Saudi Arabia', 'Pro', 'active',  'Left Winger',      'Right', 175, 70, 7,  'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 18500000, 'SAR'),
('d0000001-0000-0000-0000-000000000004', 'Abdulrahman','Al-Obaid',   'عبدالرحمن','العبيد',    '1996-01-30', 'Saudi Arabia', 'Pro', 'injured', 'Center Back',      'Right', 186, 82, 4,  'c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 12000000, 'SAR'),
('d0000001-0000-0000-0000-000000000005', 'Nawaf',     'Al-Abed',     'نواف',    'العابد',    '1999-05-12', 'Saudi Arabia', 'Pro', 'active',  'Goalkeeper',       'Right', 190, 85, 1,  'c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000005', 10000000, 'SAR'),
('d0000001-0000-0000-0000-000000000006', 'Salman',    'Al-Faraj',    'سلمان',   'الفرج',     '2000-09-03', 'Saudi Arabia', 'Pro', 'active',  'Right Back',       'Right', 177, 74, 2,  'c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 8000000,  'SAR'),
('d0000001-0000-0000-0000-000000000007', 'Turki',     'Al-Amri',     'تركي',    'العمري',    '1994-12-20', 'Saudi Arabia', 'Pro', 'active',  'Defensive Mid',    'Right', 180, 76, 6,  'c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000005', 7500000,  'SAR'),
-- Youth Players
('d0000001-0000-0000-0000-000000000008', 'Rayan',     'Al-Mutairi',  'ريان',    'المطيري',   '2007-04-18', 'Saudi Arabia', 'Youth', 'active', 'Striker',         'Left',  174, 65, 11, 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 500000,   'SAR'),
('d0000001-0000-0000-0000-000000000009', 'Majed',     'Al-Subaie',   'ماجد',    'السبيعي',   '2008-08-25', 'Saudi Arabia', 'Youth', 'active', 'Midfielder',      'Right', 170, 60, 14, 'c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000005', 300000,   'SAR'),
('d0000001-0000-0000-0000-000000000010', 'Bader',     'Al-Qahtani',  'بدر',     'القحطاني',  '2007-12-01', 'Saudi Arabia', 'Youth', 'active', 'Left Back',       'Left',  176, 68, 3,  'c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 400000,   'SAR');

-- ──────────────────────────────────────────
-- CONTRACTS
-- ──────────────────────────────────────────

INSERT INTO contracts (id, player_id, club_id, category, status, title, start_date, end_date, base_salary, signing_bonus, release_clause, commission_pct, total_commission, created_by) VALUES
('c1000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Club', 'Active',        'Faisal × Al-Hilal 2024-27', '2024-07-01', '2027-06-30', 2500000, 500000, 45000000, 10.00, 300000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Club', 'Active',        'Hassan × Al-Nassr 2023-26', '2023-08-01', '2026-07-31', 3000000, 700000, 60000000, 12.00, 444000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Club', 'Active',        'Youssef × Al-Hilal 2025-28', '2025-01-15', '2028-01-14', 2200000, 400000, 50000000, 10.00, 260000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', 'Club', 'Expiring Soon', 'Abdulrahman × Al-Ittihad 2023-26', '2023-06-01', '2026-05-31', 1800000, 200000, 35000000, 8.00, 160000, 'a0000001-0000-0000-0000-000000000005'),
('c1000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000004', 'Club', 'Active',        'Nawaf × Al-Ahli 2024-27',   '2024-02-01', '2027-01-31', 1500000, 300000, 30000000, 10.00, 180000, 'a0000001-0000-0000-0000-000000000005'),
-- Sponsorship contracts
('c1000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000009', 'Sponsorship', 'Active', 'Faisal × Nike Endorsement', '2025-01-01', '2026-12-31', 500000, 100000, NULL, 15.00, 90000, 'a0000001-0000-0000-0000-000000000002'),
('c1000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000010', 'Sponsorship', 'Active', 'Hassan × Adidas Partnership', '2024-06-01', '2026-05-31', 400000, 50000, NULL, 15.00, 67500, 'a0000001-0000-0000-0000-000000000002');

-- ──────────────────────────────────────────
-- OFFERS
-- ──────────────────────────────────────────

INSERT INTO offers (player_id, from_club_id, to_club_id, offer_type, status, transfer_fee, salary_offered, contract_years, agent_fee, deadline, created_by) VALUES
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Transfer', 'Negotiation', 40000000, 3500000, 4, 4000000, '2026-03-15', 'a0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'Transfer', 'New',         55000000, 4000000, 3, 5500000, '2026-04-01', 'a0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'Loan',     'Under Review', NULL,     2000000, 1, 500000,  '2026-02-28', 'a0000001-0000-0000-0000-000000000005');

-- ──────────────────────────────────────────
-- MATCHES (upcoming & completed)
-- ──────────────────────────────────────────

INSERT INTO matches (id, home_club_id, away_club_id, competition, season, match_date, venue, status, home_score, away_score) VALUES
('e0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Saudi Pro League', '2025-26', '2026-02-07 20:00:00+03', 'Kingdom Arena',       'completed', 2, 1),
('e0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000004', 'Saudi Pro League', '2025-26', '2026-02-08 18:00:00+03', 'King Abdullah Sports City', 'completed', 1, 1),
('e0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Saudi Pro League', '2025-26', '2026-02-15 20:00:00+03', 'Al-Awwal Park',       'upcoming', NULL, NULL),
('e0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'Saudi Pro League', '2025-26', '2026-02-22 20:00:00+03', 'Kingdom Arena',       'upcoming', NULL, NULL),
('e0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000006', 'Kings Cup',        '2025-26', '2026-02-18 19:00:00+03', 'King Abdullah Sports City', 'upcoming', NULL, NULL);

-- ──────────────────────────────────────────
-- INJURIES
-- ──────────────────────────────────────────

INSERT INTO injuries (player_id, injury_type, body_part, severity, status, injury_date, expected_return, diagnosis, match_id) VALUES
('d0000001-0000-0000-0000-000000000004', 'ACL Strain',    'Knee (Left)',  'High',   'UnderTreatment', '2026-01-20', '2026-04-15', 'Partial ACL tear requiring rehabilitation',   NULL),
('d0000001-0000-0000-0000-000000000001', 'Muscle Strain', 'Hamstring',    'Medium', 'Monitoring',     '2026-02-07', '2026-02-20', 'Minor hamstring strain during match',          'e0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000007', 'Sprain',        'Ankle (Right)','Low',    'Recovered',      '2026-01-05', '2026-01-20', 'Mild ankle sprain, fully recovered',           NULL);

-- ──────────────────────────────────────────
-- TASKS
-- ──────────────────────────────────────────

INSERT INTO tasks (title, title_ar, type, status, priority, assigned_to, player_id, due_date, is_auto_created) VALUES
('Post-match analysis: Al-Hilal vs Al-Nassr', 'تحليل ما بعد المباراة: الهلال ضد النصر', 'Match', 'Open', 'high', 'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000001', '2026-02-10', TRUE),
('Review Abdulrahman contract renewal options', 'مراجعة خيارات تجديد عقد عبدالرحمن', 'Contract', 'InProgress', 'high', 'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000004', '2026-03-01', FALSE),
('Schedule fitness test for Faisal', 'جدولة اختبار اللياقة لفيصل', 'Health', 'Open', 'medium', 'a0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000001', '2026-02-18', TRUE),
('Prepare transfer pack for Hassan offer', 'تجهيز ملف الانتقال لعرض حسن', 'Offer', 'Open', 'critical', 'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', '2026-02-20', FALSE),
('Update Rayan IDP for Q1 review', 'تحديث خطة تطوير ريان لمراجعة الربع الأول', 'Report', 'Open', 'medium', 'a0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000008', '2026-02-28', FALSE);

-- ──────────────────────────────────────────
-- TRIGGER RULES (automation)
-- ──────────────────────────────────────────

INSERT INTO trigger_rules (name, name_ar, trigger_type, severity, threshold, actions, is_active) VALUES
('Post-Match Analysis',   'تحليل ما بعد المباراة',  'PostMatch',       'Medium', 'Match status changes to completed', '{"Create analysis task", "Notify analyst", "Notify coach"}', TRUE),
('Pre-Match Preparation', 'تحضيرات ما قبل المباراة', 'PreMatch',        'Medium', 'Match date is within 2 days',       '{"Create logistics task", "Check injured players", "Notify team"}', TRUE),
('Contract Expiry Alert', 'تنبيه انتهاء العقد',      'ContractExpiry',  'High',   'Contract expires within 30 days',   '{"Create renewal task", "Notify legal team", "Notify agent"}', TRUE),
('Payment Due Reminder',  'تذكير بموعد الدفع',       'PaymentDue',      'Medium', 'Payment due within 7 days',         '{"Create follow-up task", "Send notification", "Flag overdue"}', TRUE),
('Injury-Match Conflict', 'تعارض إصابة مع مباراة',   'InjuryConflict',  'Critical','Injured player has upcoming match', '{"Create health check task", "Send critical alert", "Notify medical staff"}', TRUE);

-- ──────────────────────────────────────────
-- GUARDIANS (for Youth players)
-- ──────────────────────────────────────────

INSERT INTO guardians (player_id, name, name_ar, relation, email, phone) VALUES
('d0000001-0000-0000-0000-000000000008', 'Abdullah Al-Mutairi',  'عبدالله المطيري', 'Father', 'abdullah.m@email.com', '+966501234010'),
('d0000001-0000-0000-0000-000000000009', 'Fahad Al-Subaie',      'فهد السبيعي',     'Father', 'fahad.s@email.com',    '+966501234011'),
('d0000001-0000-0000-0000-000000000010', 'Nasser Al-Qahtani',    'ناصر القحطاني',   'Father', 'nasser.q@email.com',   '+966501234012');

-- ──────────────────────────────────────────
-- RISK RADARS
-- ──────────────────────────────────────────

INSERT INTO risk_radars (player_id, performance_risk, mental_risk, medical_risk, transfer_risk, overall_risk, assessed_by) VALUES
('d0000001-0000-0000-0000-000000000001', 15, 10, 35, 60, 30, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000002', 20, 15, 10, 70, 29, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000003', 10, 20, 15, 25, 18, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000004', 45, 55, 80, 40, 55, 'a0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000005', 20, 10, 10, 15, 14, 'a0000001-0000-0000-0000-000000000003');

COMMIT;