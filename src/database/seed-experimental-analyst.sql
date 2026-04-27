-- ============================================================================
--  EXPERIMENTAL TEST DATA — Analyst Portal
-- ============================================================================
--  Purpose : Populate every data source the Analyst Portal reads from with a
--            small set of safe, fake rows so dashboards / charts / sub-pages
--            can be exercised end-to-end.
--
--  Marker  : Every visible text field is suffixed with "(Experimental)" in
--            English and "(تجريبي)" in Arabic so anyone seeing this data in
--            the UI knows it is test data, not real agency data.
--
--  Scope   : ~5 rows per analyst-facing table.
--
--  Idempotent: hard-coded UUIDs + ON CONFLICT DO NOTHING — safe to re-run.
--
--  Run     : psql "$DATABASE_URL" -f backend/src/database/seed-experimental-analyst.sql
--  Cleanup : uncomment and run the DELETE block at the bottom.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. USER  — one analyst (needed for FK on players.created_by NOT NULL)
-- ────────────────────────────────────────────────────────────────────────────
-- password_hash is a placeholder bcrypt-shaped string; this account is not
-- meant to be logged into. Reset via the normal flow if needed.
INSERT INTO users (
  id, email, password_hash, full_name, full_name_ar, role, is_active,
  failed_login_attempts, notification_preferences,
  created_at, updated_at
) VALUES (
  'aaaaaaaa-0000-4000-8000-000000000001',
  'experimental.analyst@sadara.test',
  '$2b$10$ExperimentalPlaceholderHashDoNotUseInProductionXXXXXXXXXX',
  'Experimental Analyst (Experimental)',
  'محلل تجريبي (تجريبي)',
  'Analyst',
  true,
  0,
  '{"contracts":true,"offers":true,"matches":true,"tasks":true,"email":true,"push":false,"sms":false}'::jsonb,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. CLUBS  — three experimental clubs for matches and contracts
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO clubs (id, name, name_ar, type, country, league, is_active, is_home_agency, created_at, updated_at) VALUES
  ('b1111111-0000-4000-8000-000000000001', 'Al Hilal SC (Experimental)',  'الهلال (تجريبي)',   'Club', 'Saudi Arabia', 'SPL', true, false, NOW(), NOW()),
  ('b1111111-0000-4000-8000-000000000002', 'Al Nassr FC (Experimental)',  'النصر (تجريبي)',    'Club', 'Saudi Arabia', 'SPL', true, false, NOW(), NOW()),
  ('b1111111-0000-4000-8000-000000000003', 'Al Ittihad (Experimental)',   'الاتحاد (تجريبي)',  'Club', 'Saudi Arabia', 'SPL', true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. PLAYERS  — five players, all linked to the experimental analyst
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO players (
  id, first_name, last_name, first_name_ar, last_name_ar,
  date_of_birth, nationality, player_type, player_package, contract_type,
  position, preferred_foot, height_cm, weight_kg, jersey_number,
  current_club_id, analyst_id, market_value, market_value_currency, status,
  pace, stamina, strength, agility, jumping,
  external_ids, notes,
  created_by, created_at, updated_at
) VALUES
  ('c1111111-0000-4000-8000-000000000001', 'Tariq',  'Al-Mansour (Experimental)', 'طارق',  'المنصور (تجريبي)',
   '2001-03-12', 'Saudi Arabia', 'Pro', 'A', 'Professional',
   'CM', 'Right', 178, 72, 8,
   'b1111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 1500000, 'SAR', 'active',
   78, 82, 70, 75, 65,
   '{}'::jsonb, 'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('c1111111-0000-4000-8000-000000000002', 'Yousef', 'Al-Qahtani (Experimental)', 'يوسف', 'القحطاني (تجريبي)',
   '2000-07-22', 'Saudi Arabia', 'Pro', 'A', 'Professional',
   'ST', 'Left',  182, 78, 9,
   'b1111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 2200000, 'SAR', 'active',
   85, 78, 76, 80, 72,
   '{}'::jsonb, 'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('c1111111-0000-4000-8000-000000000003', 'Saif',   'Al-Dosari (Experimental)',  'سيف',   'الدوسري (تجريبي)',
   '2002-11-05', 'Saudi Arabia', 'Pro', 'B', 'Professional',
   'LW', 'Right', 175, 70, 11,
   'b1111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 900000, 'SAR', 'active',
   88, 80, 65, 86, 60,
   '{}'::jsonb, 'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('c1111111-0000-4000-8000-000000000004', 'Faisal', 'Al-Harbi (Experimental)',   'فيصل',  'الحربي (تجريبي)',
   '1999-01-30', 'Saudi Arabia', 'Pro', 'A', 'Professional',
   'CB', 'Right', 188, 84, 4,
   'b1111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 1800000, 'SAR', 'active',
   65, 85, 88, 60, 82,
   '{}'::jsonb, 'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('c1111111-0000-4000-8000-000000000005', 'Khalid', 'Al-Otaibi (Experimental)',  'خالد',  'العتيبي (تجريبي)',
   '2003-06-18', 'Saudi Arabia', 'Youth', 'C', 'Youth',
   'GK', 'Right', 190, 80, 1,
   'b1111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 600000, 'SAR', 'injured',
   55, 75, 80, 65, 90,
   '{}'::jsonb, 'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. MATCHES  — five completed matches across the last 8 weeks
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO matches (
  id, home_club_id, away_club_id, competition, season, match_date,
  status, home_score, away_score, venue, notes,
  extra_time, is_neutral_venue,
  created_at, updated_at
) VALUES
  ('d1111111-0000-4000-8000-000000000001',
   'b1111111-0000-4000-8000-000000000001', 'b1111111-0000-4000-8000-000000000002',
   'SPL (Experimental)', '2025/26', NOW() - INTERVAL '3 days',
   'completed', 2, 1, 'Kingdom Arena (Experimental)',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   false, false, NOW(), NOW()),

  ('d1111111-0000-4000-8000-000000000002',
   'b1111111-0000-4000-8000-000000000003', 'b1111111-0000-4000-8000-000000000001',
   'SPL (Experimental)', '2025/26', NOW() - INTERVAL '10 days',
   'completed', 0, 3, 'Prince Abdullah Stadium (Experimental)',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   false, false, NOW(), NOW()),

  ('d1111111-0000-4000-8000-000000000003',
   'b1111111-0000-4000-8000-000000000002', 'b1111111-0000-4000-8000-000000000003',
   'SPL (Experimental)', '2025/26', NOW() - INTERVAL '24 days',
   'completed', 1, 1, 'Al-Awwal Park (Experimental)',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   false, false, NOW(), NOW()),

  ('d1111111-0000-4000-8000-000000000004',
   'b1111111-0000-4000-8000-000000000001', 'b1111111-0000-4000-8000-000000000003',
   'SPL (Experimental)', '2025/26', NOW() - INTERVAL '38 days',
   'completed', 4, 0, 'Kingdom Arena (Experimental)',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   false, false, NOW(), NOW()),

  ('d1111111-0000-4000-8000-000000000005',
   'b1111111-0000-4000-8000-000000000002', 'b1111111-0000-4000-8000-000000000001',
   'SPL (Experimental)', '2025/26', NOW() - INTERVAL '52 days',
   'completed', 2, 2, 'Al-Awwal Park (Experimental)',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   false, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. SESSIONS  — analyst-owned sessions (drives "Today's sessions" + 8w trend)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO sessions (
  id, player_id, match_id, session_type, program_owner, responsible_id,
  session_date, title, title_ar, summary, summary_ar,
  completion_status, rating, created_by, created_at, updated_at
) VALUES
  -- Today, scheduled
  ('e1111111-0000-4000-8000-000000000001',
   'c1111111-0000-4000-8000-000000000001', 'd1111111-0000-4000-8000-000000000001',
   'Tactical', 'Analyst', 'aaaaaaaa-0000-4000-8000-000000000001',
   CURRENT_DATE,
   'Pre-match tactical review (Experimental)', 'مراجعة تكتيكية قبل المباراة (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Scheduled', NULL,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  -- 4 days ago, completed
  ('e1111111-0000-4000-8000-000000000002',
   'c1111111-0000-4000-8000-000000000002', 'd1111111-0000-4000-8000-000000000001',
   'Tactical', 'Analyst', 'aaaaaaaa-0000-4000-8000-000000000001',
   CURRENT_DATE - INTERVAL '4 days',
   'Striker movement clinic (Experimental)', 'جلسة تحركات المهاجم (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Completed', 4,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  -- 12 days ago, completed
  ('e1111111-0000-4000-8000-000000000003',
   'c1111111-0000-4000-8000-000000000003', 'd1111111-0000-4000-8000-000000000002',
   'Tactical', 'Analyst', 'aaaaaaaa-0000-4000-8000-000000000001',
   CURRENT_DATE - INTERVAL '12 days',
   'Wing-play decision making (Experimental)', 'اتخاذ القرار في الجناح (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Completed', 5,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  -- 26 days ago, completed
  ('e1111111-0000-4000-8000-000000000004',
   'c1111111-0000-4000-8000-000000000004', 'd1111111-0000-4000-8000-000000000003',
   'Tactical', 'Analyst', 'aaaaaaaa-0000-4000-8000-000000000001',
   CURRENT_DATE - INTERVAL '26 days',
   'Defensive line review (Experimental)', 'مراجعة خط الدفاع (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Completed', 4,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  -- 40 days ago, cancelled
  ('e1111111-0000-4000-8000-000000000005',
   'c1111111-0000-4000-8000-000000000005', 'd1111111-0000-4000-8000-000000000004',
   'Tactical', 'Analyst', 'aaaaaaaa-0000-4000-8000-000000000001',
   CURRENT_DATE - INTERVAL '40 days',
   'GK distribution session (Experimental)', 'جلسة توزيع حارس المرمى (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Cancelled', NULL,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. TACTICAL KPI SCORES  — drives top-5 tactical chart + KPI count
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO tactical_kpi_scores (
  id, player_id, match_id,
  press_intensity, defensive_contribution_pct, progressive_pass_rate,
  chances_created_per90, xg_contribution, territorial_control,
  counter_press_success, build_up_involvement, overall_tactical_score,
  computed_at, computed_by, raw_data,
  created_by, created_at, updated_at
) VALUES
  ('f1111111-0000-4000-8000-000000000001',
   'c1111111-0000-4000-8000-000000000001', 'd1111111-0000-4000-8000-000000000001',
   72.50, 68.00, 81.20, 1.80, 0.220, 58.40, 64.10, 85.00, 84.50,
   NOW(), 'system', '{"note":"Experimental test data, do not use."}'::jsonb,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('f1111111-0000-4000-8000-000000000002',
   'c1111111-0000-4000-8000-000000000002', 'd1111111-0000-4000-8000-000000000001',
   65.00, 42.00, 70.50, 2.40, 0.580, 52.10, 55.00, 70.00, 88.00,
   NOW(), 'system', '{"note":"Experimental test data, do not use."}'::jsonb,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('f1111111-0000-4000-8000-000000000003',
   'c1111111-0000-4000-8000-000000000003', 'd1111111-0000-4000-8000-000000000002',
   78.20, 55.00, 76.40, 2.10, 0.310, 60.20, 70.30, 78.10, 79.00,
   NOW(), 'system', '{"note":"Experimental test data, do not use."}'::jsonb,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('f1111111-0000-4000-8000-000000000004',
   'c1111111-0000-4000-8000-000000000004', 'd1111111-0000-4000-8000-000000000003',
   58.00, 88.00, 62.10, 0.20, 0.010, 48.00, 60.00, 65.20, 76.50,
   NOW(), 'system', '{"note":"Experimental test data, do not use."}'::jsonb,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('f1111111-0000-4000-8000-000000000005',
   'c1111111-0000-4000-8000-000000000005', 'd1111111-0000-4000-8000-000000000004',
   30.00, 92.00, 50.00, 0.00, 0.000, 35.00, 40.00, 55.00, 68.00,
   NOW(), 'system', '{"note":"Experimental test data, do not use."}'::jsonb,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. TACTICAL REPORTS  — 2 draft + 3 published (drives "Drafts to ship")
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO tactical_reports (
  id, player_id, analyst_id, month, year, title, title_ar, summary, summary_ar,
  tactical_strengths, tactical_weaknesses, recommendations, kpi_snapshot,
  matches_analyzed, status, created_at, updated_at
) VALUES
  ('a2111111-0000-4000-8000-000000000001',
   'c1111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   'Monthly tactical brief (Experimental)', 'الملخص التكتيكي الشهري (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   ARRAY['Press intensity (Experimental)','Build-up involvement (Experimental)'],
   ARRAY['Final-third decision making (Experimental)'],
   ARRAY['Add 1v1 finishing drills (Experimental)'],
   '{"note":"Experimental"}'::jsonb,
   3, 'draft', NOW(), NOW()),

  ('a2111111-0000-4000-8000-000000000002',
   'c1111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   'Striker xG report (Experimental)', 'تقرير xG للمهاجم (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   ARRAY['xG conversion (Experimental)','Off-ball runs (Experimental)'],
   ARRAY['Defensive contribution (Experimental)'],
   ARRAY['Pair with high-pressing CM (Experimental)'],
   '{"note":"Experimental"}'::jsonb,
   2, 'draft', NOW(), NOW()),

  ('a2111111-0000-4000-8000-000000000003',
   'c1111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001',
   EXTRACT(MONTH FROM CURRENT_DATE)::int - 1, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   'Winger progress report (Experimental)', 'تقرير تقدم الجناح (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   ARRAY['Dribble success (Experimental)'],
   ARRAY['Crossing accuracy (Experimental)'],
   ARRAY['Crossing reps in training (Experimental)'],
   '{"note":"Experimental"}'::jsonb,
   2, 'published', NOW(), NOW()),

  ('a2111111-0000-4000-8000-000000000004',
   'c1111111-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
   EXTRACT(MONTH FROM CURRENT_DATE)::int - 1, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   'CB defensive review (Experimental)', 'مراجعة دفاعية للقلب (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   ARRAY['Aerial duels (Experimental)','Tackling (Experimental)'],
   ARRAY['Build-up passing (Experimental)'],
   ARRAY['Short-pass drills (Experimental)'],
   '{"note":"Experimental"}'::jsonb,
   2, 'published', NOW(), NOW()),

  ('a2111111-0000-4000-8000-000000000005',
   'c1111111-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001',
   EXTRACT(MONTH FROM CURRENT_DATE)::int - 2, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   'GK distribution report (Experimental)', 'تقرير توزيع الحارس (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   ARRAY['Shot stopping (Experimental)'],
   ARRAY['Long distribution (Experimental)'],
   ARRAY['Distribution drills (Experimental)'],
   '{"note":"Experimental"}'::jsonb,
   1, 'published', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. VIDEO CLIPS  — five ready clips
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO video_clips (
  id, match_id, player_id, title, title_ar,
  storage_provider, external_url, duration_sec, status,
  uploaded_by, created_at, updated_at
) VALUES
  ('a3111111-0000-4000-8000-000000000001', 'd1111111-0000-4000-8000-000000000001',
   'c1111111-0000-4000-8000-000000000001',
   'Goal build-up — minute 23 (Experimental)', 'بناء الهدف — الدقيقة ٢٣ (تجريبي)',
   'external', 'https://example.com/experimental/clip-1.mp4', 32, 'ready',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a3111111-0000-4000-8000-000000000002', 'd1111111-0000-4000-8000-000000000001',
   'c1111111-0000-4000-8000-000000000002',
   'Striker off-ball run (Experimental)', 'تحرك المهاجم بدون كرة (تجريبي)',
   'external', 'https://example.com/experimental/clip-2.mp4', 18, 'ready',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a3111111-0000-4000-8000-000000000003', 'd1111111-0000-4000-8000-000000000002',
   'c1111111-0000-4000-8000-000000000003',
   'Wing 1v1 dribble (Experimental)', 'مراوغة في الجناح (تجريبي)',
   'external', 'https://example.com/experimental/clip-3.mp4', 22, 'ready',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  -- No tags on these last two so the orange tag-warning icon shows in the UI
  ('a3111111-0000-4000-8000-000000000004', 'd1111111-0000-4000-8000-000000000003',
   'c1111111-0000-4000-8000-000000000004',
   'Defensive header — set piece (Experimental)', 'ضربة رأس دفاعية — كرة ثابتة (تجريبي)',
   'external', 'https://example.com/experimental/clip-4.mp4', 14, 'ready',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a3111111-0000-4000-8000-000000000005', 'd1111111-0000-4000-8000-000000000004',
   'c1111111-0000-4000-8000-000000000005',
   'GK distribution sequence (Experimental)', 'سلسلة توزيع الحارس (تجريبي)',
   'external', 'https://example.com/experimental/clip-5.mp4', 26, 'ready',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 9. VIDEO TAGS  — six tags spread across the first three clips
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO video_tags (
  id, clip_id, tag_type, label, label_ar, timestamp_sec, player_id, notes,
  created_by, created_at, updated_at
) VALUES
  ('a4111111-0000-4000-8000-000000000001', 'a3111111-0000-4000-8000-000000000001',
   'goal', 'Final pass (Experimental)', 'التمريرة الأخيرة (تجريبي)', 28,
   'c1111111-0000-4000-8000-000000000001', 'Experimental test data, do not use.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a4111111-0000-4000-8000-000000000002', 'a3111111-0000-4000-8000-000000000001',
   'assist', 'Assist (Experimental)', 'صناعة الهدف (تجريبي)', 30,
   'c1111111-0000-4000-8000-000000000001', 'Experimental test data, do not use.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a4111111-0000-4000-8000-000000000003', 'a3111111-0000-4000-8000-000000000002',
   'pressing', 'Counter-press trigger (Experimental)', 'بداية الضغط (تجريبي)', 9,
   'c1111111-0000-4000-8000-000000000002', 'Experimental test data, do not use.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a4111111-0000-4000-8000-000000000004', 'a3111111-0000-4000-8000-000000000002',
   'transition', 'Transition moment (Experimental)', 'لحظة التحول (تجريبي)', 13,
   'c1111111-0000-4000-8000-000000000002', 'Experimental test data, do not use.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a4111111-0000-4000-8000-000000000005', 'a3111111-0000-4000-8000-000000000003',
   'custom', '1v1 dribble (Experimental)', 'مراوغة فردية (تجريبي)', 7,
   'c1111111-0000-4000-8000-000000000003', 'Experimental test data, do not use.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a4111111-0000-4000-8000-000000000006', 'a3111111-0000-4000-8000-000000000003',
   'defensive_action', 'Recovery sprint (Experimental)', 'سباق الاستعادة (تجريبي)', 19,
   'c1111111-0000-4000-8000-000000000003', 'Experimental test data, do not use.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 10. WATCHLISTS + SCOUT REPORT ATTRIBUTES  — drives /analyst/scouting
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO watchlists (
  id, prospect_name, prospect_name_ar, date_of_birth, nationality, position,
  current_club, current_league, status, source, scouted_by,
  video_clips, priority, technical_rating, physical_rating, mental_rating, potential_rating,
  notes, created_at, updated_at
) VALUES
  ('a5111111-0000-4000-8000-000000000001',
   'Mohammed Al-Shehri (Experimental)', 'محمد الشهري (تجريبي)',
   '2004-02-14', 'Saudi Arabia', 'CM', 'Al Shabab (Experimental)', 'SPL',
   'Active', 'Scout report (Experimental)', 'aaaaaaaa-0000-4000-8000-000000000001',
   2, 'High', 78, 75, 80, 85,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a5111111-0000-4000-8000-000000000002',
   'Abdullah Al-Ghamdi (Experimental)', 'عبدالله الغامدي (تجريبي)',
   '2003-09-01', 'Saudi Arabia', 'ST', 'Al Ahli (Experimental)', 'SPL',
   'Shortlisted', 'Scout report (Experimental)', 'aaaaaaaa-0000-4000-8000-000000000001',
   3, 'High', 82, 80, 75, 88,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a5111111-0000-4000-8000-000000000003',
   'Bandar Al-Subaie (Experimental)', 'بندر السبيعي (تجريبي)',
   '2005-12-20', 'Saudi Arabia', 'LW', 'Al Wehda (Experimental)', 'SPL',
   'Active', 'Scout report (Experimental)', 'aaaaaaaa-0000-4000-8000-000000000001',
   1, 'Medium', 80, 72, 70, 82,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a5111111-0000-4000-8000-000000000004',
   'Hassan Al-Najjar (Experimental)', 'حسن النجار (تجريبي)',
   '2002-04-08', 'Saudi Arabia', 'CB', 'Al Fateh (Experimental)', 'SPL',
   'Archived', 'Scout report (Experimental)', 'aaaaaaaa-0000-4000-8000-000000000001',
   0, 'Low', 70, 78, 75, 75,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a5111111-0000-4000-8000-000000000005',
   'Salem Al-Ghanem (Experimental)', 'سالم الغانم (تجريبي)',
   '2004-08-25', 'Saudi Arabia', 'GK', 'Al Taawoun (Experimental)', 'SPL',
   'Active', 'Scout report (Experimental)', 'aaaaaaaa-0000-4000-8000-000000000001',
   1, 'Medium', 65, 80, 78, 80,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO scout_report_attributes (
  id, watchlist_id, authored_by,
  pace, strength, stamina, ball_control, passing, shooting, defending,
  decision_making, leadership, work_rate, positioning, pressing_score, tactical_awareness,
  overall_score, recommendation, notes, notes_ar, created_at, updated_at
) VALUES
  ('a6111111-0000-4000-8000-000000000001', 'a5111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   78, 70, 82, 85, 88, 70, 65, 82, 75, 88, 80, 82, 80, 80.50, 'Sign',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a6111111-0000-4000-8000-000000000002', 'a5111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   85, 78, 80, 80, 72, 88, 40, 80, 70, 85, 78, 70, 75, 78.20, 'Sign',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a6111111-0000-4000-8000-000000000003', 'a5111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001',
   88, 65, 78, 86, 75, 78, 45, 75, 65, 82, 75, 78, 70, 75.10, 'Monitor',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a6111111-0000-4000-8000-000000000004', 'a5111111-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
   60, 86, 80, 65, 70, 45, 88, 78, 80, 80, 82, 75, 80, 72.40, 'Reject',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW()),

  ('a6111111-0000-4000-8000-000000000005', 'a5111111-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001',
   55, 80, 78, 65, 70, 40, 70, 78, 75, 75, 85, 60, 78, 70.00, 'Monitor',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 11. OFFERS  — drives /analyst/offers
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO offers (
  id, player_id, from_club_id, to_club_id, offer_type, status,
  transfer_fee, salary_offered, contract_years, agent_fee, fee_currency,
  conditions, submitted_at, deadline, phase, notes,
  created_by, created_at, updated_at
) VALUES
  ('a7111111-0000-4000-8000-000000000001',
   'c1111111-0000-4000-8000-000000000001',
   'b1111111-0000-4000-8000-000000000001', 'b1111111-0000-4000-8000-000000000002',
   'Transfer', 'New',
   3000000, 1200000, 3, 150000, 'SAR',
   '[]'::jsonb, NOW(), CURRENT_DATE + INTERVAL '30 days', 'ID',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a7111111-0000-4000-8000-000000000002',
   'c1111111-0000-4000-8000-000000000002',
   'b1111111-0000-4000-8000-000000000002', 'b1111111-0000-4000-8000-000000000003',
   'Transfer', 'Negotiation',
   5000000, 1800000, 4, 250000, 'SAR',
   '[]'::jsonb, NOW(), CURRENT_DATE + INTERVAL '14 days', 'Negotiate',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a7111111-0000-4000-8000-000000000003',
   'c1111111-0000-4000-8000-000000000003',
   'b1111111-0000-4000-8000-000000000003', 'b1111111-0000-4000-8000-000000000001',
   'Loan', 'Under Review',
   0, 800000, 1, 50000, 'SAR',
   '[]'::jsonb, NOW(), CURRENT_DATE + INTERVAL '21 days', 'Acquire',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a7111111-0000-4000-8000-000000000004',
   'c1111111-0000-4000-8000-000000000004',
   'b1111111-0000-4000-8000-000000000001', 'b1111111-0000-4000-8000-000000000003',
   'Transfer', 'Accepted',
   2500000, 1100000, 3, 120000, 'SAR',
   '[]'::jsonb, NOW() - INTERVAL '5 days', CURRENT_DATE + INTERVAL '7 days', 'Close',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a7111111-0000-4000-8000-000000000005',
   'c1111111-0000-4000-8000-000000000005',
   'b1111111-0000-4000-8000-000000000002', 'b1111111-0000-4000-8000-000000000001',
   'Transfer', 'Rejected',
   1000000, 500000, 2, 25000, 'SAR',
   '[]'::jsonb, NOW() - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days', 'ID',
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 12. CONTRACTS  — drives /analyst/contracts
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO contracts (
  id, player_id, club_id, category, contract_type, player_contract_type,
  status, title, start_date, end_date, salary_currency,
  signing_bonus, performance_bonus, commission_locked,
  exclusivity, representation_scope,
  expiry_alert_sent, outstanding_amount, outstanding_currency,
  has_outstanding, no_claims_declaration, notes,
  created_by, created_at, updated_at
) VALUES
  ('a8111111-0000-4000-8000-000000000001', 'c1111111-0000-4000-8000-000000000001',
   'b1111111-0000-4000-8000-000000000001', 'Club', 'Representation', 'Professional',
   'Active', 'Representation contract (Experimental)',
   CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '540 days', 'SAR',
   100000, 50000, false, 'Exclusive', 'Both',
   false, 0, 'SAR', false, false,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a8111111-0000-4000-8000-000000000002', 'c1111111-0000-4000-8000-000000000002',
   'b1111111-0000-4000-8000-000000000002', 'Club', 'Transfer', 'Professional',
   'Active', 'Transfer contract (Experimental)',
   CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '900 days', 'SAR',
   200000, 80000, false, 'Exclusive', 'Both',
   false, 0, 'SAR', false, false,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a8111111-0000-4000-8000-000000000003', 'c1111111-0000-4000-8000-000000000003',
   'b1111111-0000-4000-8000-000000000003', 'Club', 'Renewal', 'Professional',
   'Expiring Soon', 'Renewal — wing (Experimental)',
   CURRENT_DATE - INTERVAL '700 days', CURRENT_DATE + INTERVAL '60 days', 'SAR',
   50000, 25000, false, 'Exclusive', 'Local',
   false, 0, 'SAR', false, false,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a8111111-0000-4000-8000-000000000004', 'c1111111-0000-4000-8000-000000000004',
   'b1111111-0000-4000-8000-000000000001', 'Club', 'Representation', 'Professional',
   'Draft', 'Draft representation (Experimental)',
   CURRENT_DATE, CURRENT_DATE + INTERVAL '720 days', 'SAR',
   75000, 30000, false, 'Exclusive', 'Both',
   false, 0, 'SAR', false, false,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('a8111111-0000-4000-8000-000000000005', 'c1111111-0000-4000-8000-000000000005',
   'b1111111-0000-4000-8000-000000000002', 'Agency', 'CareerManagement', 'Youth',
   'Review', 'Career management — youth GK (Experimental)',
   CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '1095 days', 'SAR',
   10000, 5000, false, 'Exclusive', 'Local',
   false, 0, 'SAR', false, false,
   'Experimental test data, do not use. — بيانات اختبار تجريبية، لا تستخدم.',
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS  — for the experimental analyst user
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO notifications (
  id, user_id, type, title, title_ar, body, body_ar, link,
  source_type, source_id, is_read, is_dismissed, priority, created_at
) VALUES
  ('a9111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'match', 'New match to analyse (Experimental)', 'مباراة جديدة للتحليل (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   '/analyst/matches', 'match', 'd1111111-0000-4000-8000-000000000001',
   false, false, 'normal', NOW() - INTERVAL '1 hour'),

  ('a9111111-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   'task', 'Draft tactical report due (Experimental)', 'مسودة تقرير تكتيكي مستحقة (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   '/analyst/tactical', 'tactical_report', 'a2111111-0000-4000-8000-000000000001',
   false, false, 'high', NOW() - INTERVAL '3 hours'),

  ('a9111111-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001',
   'contract', 'Contract expiring soon (Experimental)', 'عقد على وشك الانتهاء (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   '/analyst/contracts', 'contract', 'a8111111-0000-4000-8000-000000000003',
   false, false, 'critical', NOW() - INTERVAL '6 hours'),

  ('a9111111-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
   'system', 'KPI engine completed run (Experimental)', 'محرك المؤشرات أنهى تشغيلاً (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   '/analyst/tactical', 'tactical_kpi', NULL,
   true, false, 'low', NOW() - INTERVAL '1 day'),

  ('a9111111-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001',
   'calendar', 'Tactical session today (Experimental)', 'جلسة تكتيكية اليوم (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   '/analyst/calendar', 'session', 'e1111111-0000-4000-8000-000000000001',
   false, false, 'normal', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────
-- 14. CALENDAR EVENTS  — drives /analyst/calendar
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO calendar_events (
  id, title, title_ar, description, description_ar,
  event_type, start_date, end_date, all_day,
  location, location_ar, timezone, is_auto_created, recurrence_exception,
  created_by, created_at, updated_at
) VALUES
  ('aa111111-0000-4000-8000-000000000001',
   'Pre-match tactical review (Experimental)', 'مراجعة تكتيكية قبل المباراة (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Meeting', CURRENT_DATE + INTERVAL '10 hours', CURRENT_DATE + INTERVAL '11 hours', false,
   'Office (Experimental)', 'المكتب (تجريبي)', 'Asia/Riyadh', false, false,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('aa111111-0000-4000-8000-000000000002',
   'Striker xG study (Experimental)', 'دراسة xG للمهاجم (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Training', CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours',
   CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours', false,
   'Video room (Experimental)', 'غرفة الفيديو (تجريبي)', 'Asia/Riyadh', false, false,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('aa111111-0000-4000-8000-000000000003',
   'Contract review window (Experimental)', 'نافذة مراجعة العقود (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'ContractDeadline', CURRENT_DATE + INTERVAL '3 days',
   CURRENT_DATE + INTERVAL '3 days' + INTERVAL '23 hours' + INTERVAL '59 minutes', true,
   NULL, NULL, 'Asia/Riyadh', false, false,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('aa111111-0000-4000-8000-000000000004',
   'Team scouting sync (Experimental)', 'اجتماع الكشافة (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Meeting', CURRENT_DATE + INTERVAL '5 days' + INTERVAL '9 hours',
   CURRENT_DATE + INTERVAL '5 days' + INTERVAL '10 hours', false,
   'Conference room (Experimental)', 'قاعة الاجتماعات (تجريبي)', 'Asia/Riyadh', false, false,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW()),

  ('aa111111-0000-4000-8000-000000000005',
   'KPI engine maintenance (Experimental)', 'صيانة محرك المؤشرات (تجريبي)',
   'Experimental test data, do not use.', 'بيانات اختبار تجريبية، لا تستخدم.',
   'Custom', CURRENT_DATE + INTERVAL '7 days' + INTERVAL '20 hours',
   CURRENT_DATE + INTERVAL '7 days' + INTERVAL '22 hours', false,
   NULL, NULL, 'Asia/Riyadh', false, false,
   'aaaaaaaa-0000-4000-8000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


COMMIT;


-- ============================================================================
--  CLEANUP — uncomment and run this block to remove all experimental data
-- ============================================================================
-- BEGIN;
--
-- DELETE FROM video_tags             WHERE id::text LIKE 'a4111111-%';
-- DELETE FROM video_clips            WHERE id::text LIKE 'a3111111-%';
-- DELETE FROM tactical_reports       WHERE id::text LIKE 'a2111111-%';
-- DELETE FROM tactical_kpi_scores    WHERE id::text LIKE 'f1111111-%';
-- DELETE FROM sessions               WHERE id::text LIKE 'e1111111-%';
-- DELETE FROM scout_report_attributes WHERE id::text LIKE 'a6111111-%';
-- DELETE FROM watchlists             WHERE id::text LIKE 'a5111111-%';
-- DELETE FROM offers                 WHERE id::text LIKE 'a7111111-%';
-- DELETE FROM contracts              WHERE id::text LIKE 'a8111111-%';
-- DELETE FROM notifications          WHERE id::text LIKE 'a9111111-%';
-- DELETE FROM calendar_events        WHERE id::text LIKE 'aa111111-%';
-- DELETE FROM matches                WHERE id::text LIKE 'd1111111-%';
-- DELETE FROM players                WHERE id::text LIKE 'c1111111-%';
-- DELETE FROM clubs                  WHERE id::text LIKE 'b1111111-%';
-- DELETE FROM users                  WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
--
-- COMMIT;
