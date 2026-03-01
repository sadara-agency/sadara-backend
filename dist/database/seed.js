"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const sequelize_1 = require("sequelize");
// Simple logger wrapper (no Winston dependency)
const logger = {
    info: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
};
// ── Models ──
const user_model_1 = require("../modules/Users/user.model");
const club_model_1 = require("../modules/clubs/club.model");
const player_model_1 = require("../modules/players/player.model");
const contract_model_1 = require("../modules/contracts/contract.model");
const offer_model_1 = require("../modules/offers/offer.model");
const match_model_1 = require("../modules/matches/match.model");
const matchPlayer_model_1 = require("../modules/matches/matchPlayer.model");
const playerMatchStats_model_1 = require("../modules/matches/playerMatchStats.model");
const task_model_1 = require("../modules/tasks/task.model");
const gate_model_1 = require("../modules/gates/gate.model");
const referral_model_1 = require("../modules/referrals/referral.model");
const finance_model_1 = require("../modules/finance/finance.model");
const document_model_1 = require("../modules/documents/document.model");
const scouting_model_1 = require("../modules/scouting/scouting.model");
// ── Fixed UUIDs for consistency ──
const IDS = {
    users: {
        admin: 'a0000001-0000-0000-0000-000000000001',
        agent: 'a0000001-0000-0000-0000-000000000002',
        analyst: 'a0000001-0000-0000-0000-000000000003',
        scout: 'a0000001-0000-0000-0000-000000000004',
        player: 'a0000001-0000-0000-0000-000000000005',
    },
    clubs: {
        alHilal: 'c0000001-0000-0000-0000-000000000001',
        alNassr: 'c0000001-0000-0000-0000-000000000002',
        alAhli: 'c0000001-0000-0000-0000-000000000003',
        alIttihad: 'c0000001-0000-0000-0000-000000000004',
        alShabab: 'c0000001-0000-0000-0000-000000000005',
        alFateh: 'c0000001-0000-0000-0000-000000000006',
        alTaawoun: 'c0000001-0000-0000-0000-000000000007',
        alRaed: 'c0000001-0000-0000-0000-000000000008',
    },
    players: Array.from({ length: 15 }, (_, i) => `p0000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    contracts: Array.from({ length: 12 }, (_, i) => `ct000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    matches: Array.from({ length: 8 }, (_, i) => `m0000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    offers: Array.from({ length: 5 }, (_, i) => `of000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    tasks: Array.from({ length: 8 }, (_, i) => `tk000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    invoices: Array.from({ length: 4 }, (_, i) => `iv000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    payments: Array.from({ length: 6 }, (_, i) => `py000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    documents: Array.from({ length: 5 }, (_, i) => `dc000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    gates: Array.from({ length: 4 }, (_, i) => `gt000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    referrals: Array.from({ length: 3 }, (_, i) => `rf000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    watchlists: Array.from({ length: 3 }, (_, i) => `wl000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    matchPlayers: Array.from({ length: 15 }, (_, i) => `mp000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
    matchStats: Array.from({ length: 15 }, (_, i) => `ms000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`),
};
// ══════════════════════════════════════════
// CREATE MISSING TABLES & VIEWS
// ══════════════════════════════════════════
async function createMissingTables() {
    await database_1.sequelize.query(`
    CREATE TABLE IF NOT EXISTS performances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      match_id UUID REFERENCES matches(id),
      match_date DATE,
      average_rating NUMERIC(3,1),
      goals INT DEFAULT 0,
      assists INT DEFAULT 0,
      key_passes INT DEFAULT 0,
      successful_dribbles INT DEFAULT 0,
      minutes INT DEFAULT 0,
      yellow_cards INT DEFAULT 0,
      red_cards INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    await database_1.sequelize.query(`
    CREATE TABLE IF NOT EXISTS risk_radars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      overall_risk VARCHAR(20) DEFAULT 'Low',
      injury_risk VARCHAR(20) DEFAULT 'Low',
      contract_risk VARCHAR(20) DEFAULT 'Low',
      performance_risk VARCHAR(20) DEFAULT 'Low',
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    // Create availability enum if not exists
    await database_1.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE match_player_availability AS ENUM ('starter', 'bench', 'injured', 'suspended', 'not_called');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
    // Drop old match_players if it has old schema (started BOOLEAN column)
    const oldCheck = await database_1.sequelize.query(`SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'match_players' AND column_name = 'started'`, { type: sequelize_1.QueryTypes.SELECT });
    if (oldCheck.length > 0) {
        await database_1.sequelize.query('DROP TABLE IF EXISTS match_players CASCADE');
        logger.info('   ↻ Dropped old match_players table (migrating to new schema)');
    }
    // New match_players table with availability enum
    await database_1.sequelize.query(`
    CREATE TABLE IF NOT EXISTS match_players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      availability match_player_availability NOT NULL DEFAULT 'starter',
      position_in_match VARCHAR(50),
      minutes_played INT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_match_player UNIQUE (match_id, player_id)
    );
  `);
    // player_match_stats table (detailed per-match performance)
    await database_1.sequelize.query(`
    CREATE TABLE IF NOT EXISTS player_match_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      minutes_played INT,
      goals INT DEFAULT 0,
      assists INT DEFAULT 0,
      shots_total INT,
      shots_on_target INT,
      passes_total INT,
      passes_completed INT,
      tackles_total INT,
      interceptions INT,
      duels_won INT,
      duels_total INT,
      dribbles_completed INT,
      dribbles_attempted INT,
      fouls_committed INT,
      fouls_drawn INT,
      yellow_cards INT DEFAULT 0,
      red_cards INT DEFAULT 0,
      rating NUMERIC(3,1),
      position_in_match VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_player_match_stats UNIQUE (player_id, match_id)
    );
  `);
    logger.info('✅ Missing tables ensured (performances, risk_radars, match_players, player_match_stats)');
}
async function createViews() {
    await database_1.sequelize.query(`
    CREATE OR REPLACE VIEW vw_dashboard_kpis AS
    SELECT
      (SELECT COUNT(*)::INT FROM players WHERE status = 'active') AS total_active_players,
      (SELECT COUNT(*)::INT FROM players WHERE status = 'active' AND player_type = 'Pro') AS total_pro_players,
      (SELECT COUNT(*)::INT FROM players WHERE status = 'active' AND player_type = 'Youth') AS total_youth_players,
      (SELECT COUNT(*)::INT FROM contracts WHERE status = 'Active') AS active_contracts,
      (SELECT COUNT(*)::INT FROM contracts WHERE status = 'Active'
        AND end_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_contracts,
      (SELECT COUNT(*)::INT FROM offers WHERE status IN ('New', 'Under Review', 'Negotiation')) AS open_offers,
      (SELECT COALESCE(SUM(market_value), 0)::NUMERIC FROM players WHERE status = 'active') AS total_market_value,
      (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments WHERE status = 'Paid') AS total_revenue,
      (SELECT COUNT(*)::INT FROM tasks WHERE status != 'Completed') AS open_tasks;
  `);
    await database_1.sequelize.query(`
    CREATE OR REPLACE VIEW vw_expiring_contracts AS
    SELECT
      c.id AS contract_id,
      p.first_name || ' ' || p.last_name AS player_name,
      (c.end_date::DATE - CURRENT_DATE) AS days_remaining
    FROM contracts c
    JOIN players p ON c.player_id = p.id
    WHERE c.status = 'Active'
      AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
    ORDER BY days_remaining ASC;
  `);
    await database_1.sequelize.query(`
    CREATE OR REPLACE VIEW vw_overdue_payments AS
    SELECT
      py.id AS payment_id,
      p.first_name || ' ' || p.last_name AS player_name,
      py.amount,
      (CURRENT_DATE - py.due_date::DATE) AS days_overdue
    FROM payments py
    LEFT JOIN players p ON py.player_id = p.id
    WHERE py.status = 'Overdue'
    ORDER BY days_overdue DESC;
  `);
    await database_1.sequelize.query(`
    CREATE OR REPLACE VIEW vw_injury_match_conflicts AS
    SELECT
      p.first_name || ' ' || p.last_name AS player_name,
      mp.availability AS status_in_match,
      m.id AS match_id,
      hc.name AS home_team,
      ac.name AS away_team,
      m.match_date
    FROM match_players mp
    JOIN players p ON mp.player_id = p.id
    JOIN matches m ON mp.match_id = m.id
    LEFT JOIN clubs hc ON m.home_club_id = hc.id
    LEFT JOIN clubs ac ON m.away_club_id = ac.id
    WHERE mp.availability = 'injured'
      AND m.status = 'upcoming';
  `);
    logger.info('✅ Dashboard views created/updated');
}
// ══════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════
async function seedUsers() {
    const hash = await bcryptjs_1.default.hash('Sadara2025!', env_1.env.bcrypt.saltRounds);
    await user_model_1.User.bulkCreate([
        {
            id: IDS.users.admin,
            email: 'admin@sadara.com',
            passwordHash: hash,
            fullName: 'Abdulaziz Al-Rashid',
            fullNameAr: 'عبدالعزيز الراشد',
            role: 'Admin',
            isActive: true,
        },
        {
            id: IDS.users.agent,
            email: 'agent@sadara.com',
            passwordHash: hash,
            fullName: 'Faisal Al-Dosari',
            fullNameAr: 'فيصل الدوسري',
            role: 'Agent',
            isActive: true,
        },
        {
            id: IDS.users.analyst,
            email: 'analyst@sadara.com',
            passwordHash: hash,
            fullName: 'Nora Al-Otaibi',
            fullNameAr: 'نورة العتيبي',
            role: 'Analyst',
            isActive: true,
        },
        {
            id: IDS.users.scout,
            email: 'scout@sadara.com',
            passwordHash: hash,
            fullName: 'Khalid Al-Ghamdi',
            fullNameAr: 'خالد الغامدي',
            role: 'Scout',
            isActive: true,
        },
        {
            id: IDS.users.player,
            email: 'salem@sadara.com',
            passwordHash: hash,
            fullName: 'Salem Al-Dawsari',
            fullNameAr: 'سالم الدوسري',
            role: 'Player',
            isActive: true,
            playerId: IDS.players[0],
        },
    ], { ignoreDuplicates: true });
    logger.info('✅ Users seeded (admin/agent/analyst/scout/player — password: Sadara2025!)');
    async function seedClubs() {
        const clubs = [
            { id: IDS.clubs.alHilal, name: 'Al Hilal', nameAr: 'الهلال', city: 'Riyadh', league: 'Saudi Pro League', primaryColor: '#003DA5', secondaryColor: '#FFFFFF', stadium: 'Kingdom Arena', stadiumCapacity: 60000, foundedYear: 1957 },
            { id: IDS.clubs.alNassr, name: 'Al Nassr', nameAr: 'النصر', city: 'Riyadh', league: 'Saudi Pro League', primaryColor: '#FFD700', secondaryColor: '#000080', stadium: 'Al Awwal Park', stadiumCapacity: 25000, foundedYear: 1955 },
            { id: IDS.clubs.alAhli, name: 'Al Ahli', nameAr: 'الأهلي', city: 'Jeddah', league: 'Saudi Pro League', primaryColor: '#006633', secondaryColor: '#FFFFFF', stadium: 'King Abdullah Sports City', stadiumCapacity: 62000, foundedYear: 1937 },
            { id: IDS.clubs.alIttihad, name: 'Al Ittihad', nameAr: 'الاتحاد', city: 'Jeddah', league: 'Saudi Pro League', primaryColor: '#FFD700', secondaryColor: '#000000', stadium: 'King Abdullah Sports City', stadiumCapacity: 62000, foundedYear: 1927 },
            { id: IDS.clubs.alShabab, name: 'Al Shabab', nameAr: 'الشباب', city: 'Riyadh', league: 'Saudi Pro League', primaryColor: '#FFFFFF', secondaryColor: '#006400', stadium: 'Al Shabab Stadium', stadiumCapacity: 25000, foundedYear: 1947 },
            { id: IDS.clubs.alFateh, name: 'Al Fateh', nameAr: 'الفتح', city: 'Al-Hasa', league: 'Saudi Pro League', primaryColor: '#005A2B', secondaryColor: '#FFFFFF', stadium: 'Prince Abdullah bin Jalawi', stadiumCapacity: 20000, foundedYear: 1946 },
            { id: IDS.clubs.alTaawoun, name: 'Al Taawoun', nameAr: 'التعاون', city: 'Buraidah', league: 'Saudi Pro League', primaryColor: '#FFA500', secondaryColor: '#FFFFFF', stadium: 'King Abdullah Sport City', stadiumCapacity: 25000, foundedYear: 1956 },
            { id: IDS.clubs.alRaed, name: 'Al Raed', nameAr: 'الرائد', city: 'Buraidah', league: 'Saudi Pro League', primaryColor: '#FF0000', secondaryColor: '#FFFFFF', stadium: 'King Abdullah Sport City', stadiumCapacity: 25000, foundedYear: 1954 },
        ].map(c => ({ ...c, type: 'Club', country: 'Saudi Arabia', isActive: true }));
        await club_model_1.Club.bulkCreate(clubs, { ignoreDuplicates: true });
        logger.info('✅ Clubs seeded (8 Saudi Pro League teams)');
    }
    async function seedPlayers() {
        const players = [
            { firstName: 'Salem', lastName: 'Al-Dawsari', firstNameAr: 'سالم', lastNameAr: 'الدوسري', dob: '1991-08-19', nationality: 'Saudi Arabia', position: 'LW', type: 'Pro', clubId: IDS.clubs.alHilal, value: 12000000, email: 'salem@sadara.com' },
            { firstName: 'Yasser', lastName: 'Al-Shahrani', firstNameAr: 'ياسر', lastNameAr: 'الشهراني', dob: '1992-05-25', nationality: 'Saudi Arabia', position: 'LB', type: 'Pro', clubId: IDS.clubs.alHilal, value: 8000000 },
            { firstName: 'Abdulrahman', lastName: 'Ghareeb', firstNameAr: 'عبدالرحمن', lastNameAr: 'غريب', dob: '1997-03-11', nationality: 'Saudi Arabia', position: 'RW', type: 'Pro', clubId: IDS.clubs.alAhli, value: 7000000 },
            { firstName: 'Firas', lastName: 'Al-Buraikan', firstNameAr: 'فراس', lastNameAr: 'البريكان', dob: '2000-05-14', nationality: 'Saudi Arabia', position: 'ST', type: 'Pro', clubId: IDS.clubs.alAhli, value: 9500000 },
            { firstName: 'Saud', lastName: 'Abdulhamid', firstNameAr: 'سعود', lastNameAr: 'عبدالحميد', dob: '1999-07-18', nationality: 'Saudi Arabia', position: 'RB', type: 'Pro', clubId: IDS.clubs.alHilal, value: 6500000 },
            { firstName: 'Abdullah', lastName: 'Al-Hamdan', firstNameAr: 'عبدالله', lastNameAr: 'الحمدان', dob: '1999-09-13', nationality: 'Saudi Arabia', position: 'ST', type: 'Pro', clubId: IDS.clubs.alIttihad, value: 5500000 },
            { firstName: 'Hassan', lastName: 'Kadesh', firstNameAr: 'حسن', lastNameAr: 'كادش', dob: '1992-10-30', nationality: 'Saudi Arabia', position: 'CM', type: 'Pro', clubId: IDS.clubs.alShabab, value: 3500000 },
            { firstName: 'Nawaf', lastName: 'Al-Abed', firstNameAr: 'نواف', lastNameAr: 'العابد', dob: '1990-01-26', nationality: 'Saudi Arabia', position: 'AM', type: 'Pro', clubId: IDS.clubs.alHilal, value: 4000000 },
            { firstName: 'Turki', lastName: 'Al-Ammar', firstNameAr: 'تركي', lastNameAr: 'العمار', dob: '1997-06-20', nationality: 'Saudi Arabia', position: 'CM', type: 'Pro', clubId: IDS.clubs.alNassr, value: 3000000 },
            { firstName: 'Mohammed', lastName: 'Kanno', firstNameAr: 'محمد', lastNameAr: 'كنو', dob: '1994-09-22', nationality: 'Saudi Arabia', position: 'CM', type: 'Pro', clubId: IDS.clubs.alHilal, value: 7500000 },
            // Youth players
            { firstName: 'Musab', lastName: 'Al-Juwayr', firstNameAr: 'مصعب', lastNameAr: 'الجويعر', dob: '2006-03-15', nationality: 'Saudi Arabia', position: 'RW', type: 'Youth', clubId: IDS.clubs.alNassr, value: 500000 },
            { firstName: 'Ali', lastName: 'Al-Hassan', firstNameAr: 'علي', lastNameAr: 'الحسن', dob: '2007-07-20', nationality: 'Saudi Arabia', position: 'CB', type: 'Youth', clubId: IDS.clubs.alAhli, value: 350000 },
            { firstName: 'Omar', lastName: 'Al-Ghamdi', firstNameAr: 'عمر', lastNameAr: 'الغامدي', dob: '2006-11-02', nationality: 'Saudi Arabia', position: 'GK', type: 'Youth', clubId: IDS.clubs.alIttihad, value: 250000 },
            { firstName: 'Rayan', lastName: 'Al-Mutairi', firstNameAr: 'ريان', lastNameAr: 'المطيري', dob: '2005-08-09', nationality: 'Saudi Arabia', position: 'ST', type: 'Youth', clubId: IDS.clubs.alShabab, value: 600000 },
            { firstName: 'Fahad', lastName: 'Al-Qahtani', firstNameAr: 'فهد', lastNameAr: 'القحطاني', dob: '2007-01-25', nationality: 'Saudi Arabia', position: 'LB', type: 'Youth', clubId: IDS.clubs.alFateh, value: 200000 },
        ];
        const records = players.map((p, i) => ({
            id: IDS.players[i],
            firstName: p.firstName,
            lastName: p.lastName,
            firstNameAr: p.firstNameAr,
            lastNameAr: p.lastNameAr,
            email: p.email ?? null,
            dateOfBirth: p.dob,
            nationality: p.nationality,
            playerType: p.type,
            position: p.position,
            currentClubId: p.clubId,
            agentId: IDS.users.agent,
            marketValue: p.value,
            marketValueCurrency: 'SAR',
            status: 'active',
            speed: 50 + Math.floor(Math.random() * 40),
            passing: 50 + Math.floor(Math.random() * 40),
            shooting: 50 + Math.floor(Math.random() * 40),
            defense: 50 + Math.floor(Math.random() * 40),
            fitness: 60 + Math.floor(Math.random() * 30),
            tactical: 50 + Math.floor(Math.random() * 40),
            createdBy: IDS.users.admin,
        }));
        await player_model_1.Player.bulkCreate(records, { ignoreDuplicates: true });
        logger.info('✅ Players seeded (10 Pro + 5 Youth)');
    }
    async function seedContracts() {
        const contracts = [
            { playerId: IDS.players[0], clubId: IDS.clubs.alHilal, type: 'Representation', start: '2024-01-01', end: '2027-06-30', salary: 2500000, commission: 10, status: 'Active' },
            { playerId: IDS.players[1], clubId: IDS.clubs.alHilal, type: 'Representation', start: '2024-06-01', end: '2026-05-31', salary: 1800000, commission: 8, status: 'Active' },
            { playerId: IDS.players[2], clubId: IDS.clubs.alAhli, type: 'CareerManagement', start: '2023-07-01', end: '2026-06-30', salary: 1500000, commission: 12, status: 'Active' },
            { playerId: IDS.players[3], clubId: IDS.clubs.alAhli, type: 'Representation', start: '2025-01-01', end: '2028-12-31', salary: 2200000, commission: 10, status: 'Active' },
            { playerId: IDS.players[4], clubId: IDS.clubs.alHilal, type: 'Representation', start: '2024-03-01', end: '2026-04-15', salary: 1400000, commission: 8, status: 'Expiring Soon' },
            { playerId: IDS.players[5], clubId: IDS.clubs.alIttihad, type: 'Representation', start: '2023-01-01', end: '2026-01-01', salary: 1200000, commission: 10, status: 'Expired' },
            { playerId: IDS.players[6], clubId: IDS.clubs.alShabab, type: 'CareerManagement', start: '2025-02-01', end: '2028-01-31', salary: 900000, commission: 15, status: 'Active' },
            { playerId: IDS.players[7], clubId: IDS.clubs.alHilal, type: 'Representation', start: '2024-07-01', end: '2026-06-30', salary: 1000000, commission: 8, status: 'Active' },
            { playerId: IDS.players[8], clubId: IDS.clubs.alNassr, type: 'Transfer', start: '2025-01-15', end: '2027-01-14', salary: 800000, commission: 10, status: 'Draft' },
            { playerId: IDS.players[9], clubId: IDS.clubs.alHilal, type: 'Representation', start: '2024-08-01', end: '2027-07-31', salary: 1700000, commission: 10, status: 'Active' },
            { playerId: IDS.players[10], clubId: IDS.clubs.alNassr, type: 'Representation', start: '2025-01-01', end: '2029-12-31', salary: 200000, commission: 15, status: 'Active' },
            { playerId: IDS.players[13], clubId: IDS.clubs.alShabab, type: 'CareerManagement', start: '2025-03-01', end: '2030-02-28', salary: 250000, commission: 15, status: 'Active' },
        ];
        const records = contracts.map((c, i) => ({
            id: IDS.contracts[i],
            playerId: c.playerId,
            clubId: c.clubId,
            category: 'Club',
            contractType: c.type,
            status: c.status,
            title: `${c.type} Agreement`,
            startDate: c.start,
            endDate: c.end,
            baseSalary: c.salary,
            salaryCurrency: 'SAR',
            commissionPct: c.commission,
            totalCommission: Math.round(c.salary * (c.commission / 100)),
            signingBonus: Math.round(c.salary * 0.05),
            performanceBonus: Math.round(c.salary * 0.1),
            exclusivity: 'Exclusive',
            representationScope: 'Both',
            createdBy: IDS.users.admin,
        }));
        await contract_model_1.Contract.bulkCreate(records, { ignoreDuplicates: true });
        logger.info('✅ Contracts seeded (12 contracts)');
    }
    async function seedMatches() {
        const clubIds = Object.values(IDS.clubs);
        const matches = [
            { home: IDS.clubs.alHilal, away: IDS.clubs.alNassr, date: '2026-03-05', comp: 'Saudi Pro League', status: 'upcoming' },
            { home: IDS.clubs.alAhli, away: IDS.clubs.alIttihad, date: '2026-03-08', comp: 'Saudi Pro League', status: 'upcoming' },
            { home: IDS.clubs.alShabab, away: IDS.clubs.alFateh, date: '2026-03-12', comp: 'Saudi Pro League', status: 'upcoming' },
            { home: IDS.clubs.alHilal, away: IDS.clubs.alAhli, date: '2026-02-20', comp: 'Saudi Pro League', status: 'completed', homeScore: 2, awayScore: 1 },
            { home: IDS.clubs.alNassr, away: IDS.clubs.alShabab, date: '2026-02-15', comp: 'Saudi Pro League', status: 'completed', homeScore: 3, awayScore: 0 },
            { home: IDS.clubs.alIttihad, away: IDS.clubs.alTaawoun, date: '2026-02-10', comp: 'Saudi Pro League', status: 'completed', homeScore: 1, awayScore: 1 },
            { home: IDS.clubs.alHilal, away: IDS.clubs.alIttihad, date: '2026-03-20', comp: "King's Cup", status: 'upcoming' },
            { home: IDS.clubs.alRaed, away: IDS.clubs.alFateh, date: '2026-03-22', comp: 'Saudi Pro League', status: 'upcoming' },
        ];
        const records = matches.map((m, i) => ({
            id: IDS.matches[i],
            homeClubId: m.home,
            awayClubId: m.away,
            matchDate: new Date(m.date),
            competition: m.comp,
            season: '2025-26',
            status: m.status,
            homeScore: m.homeScore ?? null,
            awayScore: m.awayScore ?? null,
            venue: 'TBD',
        }));
        await match_model_1.Match.bulkCreate(records, { ignoreDuplicates: true });
        logger.info('✅ Matches seeded (8 matches)');
    }
    async function seedOffers() {
        const offers = [
            { playerId: IDS.players[0], from: IDS.clubs.alNassr, to: IDS.clubs.alHilal, fee: 15000000, status: 'Under Review', type: 'Transfer' },
            { playerId: IDS.players[3], from: IDS.clubs.alIttihad, to: IDS.clubs.alAhli, fee: 12000000, status: 'Negotiation', type: 'Transfer' },
            { playerId: IDS.players[6], from: IDS.clubs.alHilal, to: IDS.clubs.alShabab, fee: 4000000, status: 'New', type: 'Transfer' },
            { playerId: IDS.players[8], from: IDS.clubs.alAhli, to: IDS.clubs.alNassr, fee: 0, status: 'New', type: 'Loan' },
            { playerId: IDS.players[4], from: IDS.clubs.alNassr, to: IDS.clubs.alHilal, fee: 8000000, status: 'Closed', type: 'Transfer' },
        ];
        const records = offers.map((o, i) => ({
            id: IDS.offers[i],
            playerId: o.playerId,
            fromClubId: o.from,
            toClubId: o.to,
            offerType: o.type,
            status: o.status,
            transferFee: o.fee,
            salaryOffered: Math.round(o.fee * 0.15),
            contractYears: 3,
            feeCurrency: 'SAR',
            deadline: '2026-04-30',
            createdBy: IDS.users.agent,
        }));
        await offer_model_1.Offer.bulkCreate(records, { ignoreDuplicates: true });
        logger.info('✅ Offers seeded (5 offers)');
    }
    async function seedTasks() {
        const tasks = [
            { title: 'Renew Salem Al-Dawsari contract', titleAr: 'تجديد عقد سالم الدوسري', type: 'Contract', priority: 'critical', status: 'Open', player: IDS.players[0], due: '2026-03-15' },
            { title: 'Medical checkup for Yasser Al-Shahrani', titleAr: 'فحص طبي ياسر الشهراني', type: 'Health', priority: 'high', status: 'InProgress', player: IDS.players[1], due: '2026-03-10' },
            { title: 'Scouting report: Al Ahli midfield', titleAr: 'تقرير استكشاف: وسط الأهلي', type: 'Report', priority: 'medium', status: 'Open', player: null, due: '2026-03-20' },
            { title: 'Follow up on Al Nassr offer', titleAr: 'متابعة عرض النصر', type: 'Offer', priority: 'high', status: 'Open', player: IDS.players[0], due: '2026-03-05' },
            { title: 'Prepare Firas Al-Buraikan highlight reel', titleAr: 'إعداد فيديو فراس البريكان', type: 'General', priority: 'medium', status: 'Completed', player: IDS.players[3], due: '2026-02-28' },
            { title: 'Match preparation: Al Hilal vs Al Nassr', titleAr: 'تحضير مباراة: الهلال ضد النصر', type: 'Match', priority: 'high', status: 'Open', player: null, due: '2026-03-04' },
            { title: 'Commission payment follow-up', titleAr: 'متابعة دفع العمولة', type: 'General', priority: 'medium', status: 'Open', player: null, due: '2026-03-25' },
            { title: 'Youth player evaluation: Musab', titleAr: 'تقييم لاعب شاب: مصعب', type: 'Report', priority: 'low', status: 'Open', player: IDS.players[10], due: '2026-04-01' },
        ];
        const records = tasks.map((t, i) => ({
            id: IDS.tasks[i],
            title: t.title,
            titleAr: t.titleAr,
            type: t.type,
            priority: t.priority,
            status: t.status,
            playerId: t.player,
            assignedTo: IDS.users.agent,
            assignedBy: IDS.users.admin,
            dueDate: t.due,
        }));
        await task_model_1.Task.bulkCreate(records, { ignoreDuplicates: true });
        logger.info('✅ Tasks seeded (8 tasks)');
    }
    async function seedFinance() {
        // Invoices
        const invoices = [
            { playerId: IDS.players[0], clubId: IDS.clubs.alHilal, amount: 250000, status: 'Paid', issue: '2025-12-01', due: '2026-01-01', paid: '2025-12-28' },
            { playerId: IDS.players[2], clubId: IDS.clubs.alAhli, amount: 180000, status: 'Expected', issue: '2026-02-01', due: '2026-03-01', paid: null },
            { playerId: IDS.players[3], clubId: IDS.clubs.alAhli, amount: 220000, status: 'Overdue', issue: '2025-11-01', due: '2025-12-01', paid: null },
            { playerId: IDS.players[9], clubId: IDS.clubs.alHilal, amount: 170000, status: 'Paid', issue: '2026-01-15', due: '2026-02-15', paid: '2026-02-10' },
        ];
        await finance_model_1.Invoice.bulkCreate(invoices.map((inv, i) => ({
            id: IDS.invoices[i],
            invoiceNumber: `INV-2026-${String(i + 1).padStart(4, '0')}`,
            playerId: inv.playerId,
            clubId: inv.clubId,
            amount: inv.amount,
            taxAmount: Math.round(inv.amount * 0.15),
            totalAmount: Math.round(inv.amount * 1.15),
            currency: 'SAR',
            status: inv.status,
            issueDate: inv.issue,
            dueDate: inv.due,
            paidDate: inv.paid,
            description: 'Commission payment',
            createdBy: IDS.users.admin,
        })), { ignoreDuplicates: true });
        // Payments (for revenue chart)
        const payments = [
            { playerId: IDS.players[0], amount: 250000, type: 'Commission', status: 'Paid', due: '2026-01-01', paid: '2025-12-28' },
            { playerId: IDS.players[0], amount: 50000, type: 'Bonus', status: 'Paid', due: '2025-12-15', paid: '2025-12-15' },
            { playerId: IDS.players[9], amount: 170000, type: 'Commission', status: 'Paid', due: '2026-02-15', paid: '2026-02-10' },
            { playerId: IDS.players[2], amount: 180000, type: 'Commission', status: 'Expected', due: '2026-03-01', paid: null },
            { playerId: IDS.players[3], amount: 220000, type: 'Commission', status: 'Overdue', due: '2025-12-01', paid: null },
            { playerId: IDS.players[6], amount: 135000, type: 'Commission', status: 'Paid', due: '2026-01-15', paid: '2026-01-14' },
        ];
        await finance_model_1.Payment.bulkCreate(payments.map((p, i) => ({
            id: IDS.payments[i],
            invoiceId: i < 4 ? IDS.invoices[i] : null,
            playerId: p.playerId,
            amount: p.amount,
            currency: 'SAR',
            paymentType: p.type,
            status: p.status,
            dueDate: p.due,
            paidDate: p.paid,
        })), { ignoreDuplicates: true });
        // Valuations
        const valuations = IDS.players.slice(0, 10).map((pid, i) => ({
            playerId: pid,
            value: [12000000, 8000000, 7000000, 9500000, 6500000, 5500000, 3500000, 4000000, 3000000, 7500000][i],
            currency: 'SAR',
            source: 'Internal Assessment',
            trend: ['up', 'stable', 'up', 'up', 'stable', 'down', 'stable', 'down', 'up', 'stable'][i],
            valuedAt: '2026-02-01',
        }));
        await finance_model_1.Valuation.bulkCreate(valuations, { ignoreDuplicates: true });
        logger.info('✅ Finance seeded (4 invoices, 6 payments, 10 valuations)');
    }
    async function seedDocuments() {
        const docs = [
            { playerId: IDS.players[0], name: 'Salem Al-Dawsari - Passport', type: 'Passport', status: 'Valid', expiry: '2029-05-15' },
            { playerId: IDS.players[0], name: 'Salem Al-Dawsari - Representation Contract', type: 'Contract', status: 'Active', expiry: '2027-06-30' },
            { playerId: IDS.players[3], name: 'Firas Al-Buraikan - Medical Report', type: 'Medical', status: 'Active', expiry: '2026-06-30' },
            { playerId: IDS.players[1], name: 'Yasser Al-Shahrani - National ID', type: 'ID', status: 'Valid', expiry: '2030-01-01' },
            { playerId: IDS.players[10], name: 'Musab Al-Juwayr - Youth Academy Agreement', type: 'Agreement', status: 'Pending', expiry: '2029-12-31' },
        ];
        await document_model_1.Document.bulkCreate(docs.map((d, i) => ({
            id: IDS.documents[i],
            playerId: d.playerId,
            name: d.name,
            type: d.type,
            status: d.status,
            fileUrl: `/uploads/docs/${d.type.toLowerCase()}-${i + 1}.pdf`,
            fileSize: 1024000 + Math.floor(Math.random() * 5000000),
            mimeType: 'application/pdf',
            expiryDate: d.expiry,
            uploadedBy: IDS.users.admin,
        })), { ignoreDuplicates: true });
        logger.info('✅ Documents seeded (5 documents)');
    }
    async function seedGates() {
        const gates = [
            { playerId: IDS.players[0], gateNumber: '0', status: 'Passed' },
            { playerId: IDS.players[0], gateNumber: '1', status: 'Passed' },
            { playerId: IDS.players[0], gateNumber: '2', status: 'InProgress' },
            { playerId: IDS.players[10], gateNumber: '0', status: 'Completed' },
        ];
        await gate_model_1.Gate.bulkCreate(gates.map((g, i) => ({
            id: IDS.gates[i],
            playerId: g.playerId,
            gateNumber: g.gateNumber,
            status: g.status,
            approvedBy: g.status === 'Passed' ? IDS.users.admin : null,
            approvedAt: g.status === 'Passed' ? new Date('2026-01-15') : null,
        })), { ignoreDuplicates: true });
        await gate_model_1.GateChecklist.bulkCreate([
            // Salem Gate 0 — all done
            { gateId: IDS.gates[0], item: 'Collect player identification documents (ID / Passport)', isCompleted: true, isMandatory: true, sortOrder: 1 },
            { gateId: IDS.gates[0], item: 'Obtain signed representation agreement', isCompleted: true, isMandatory: true, sortOrder: 2 },
            { gateId: IDS.gates[0], item: 'Complete medical examination', isCompleted: true, isMandatory: true, sortOrder: 3 },
            { gateId: IDS.gates[0], item: 'Upload player photo & profile data', isCompleted: true, isMandatory: false, sortOrder: 4 },
            // Salem Gate 1 — all done
            { gateId: IDS.gates[1], item: 'Complete initial performance assessment', isCompleted: true, isMandatory: true, sortOrder: 1 },
            { gateId: IDS.gates[1], item: 'Create Individual Development Plan (IDP)', isCompleted: true, isMandatory: true, sortOrder: 2 },
            { gateId: IDS.gates[1], item: 'Set short-term performance goals', isCompleted: true, isMandatory: true, sortOrder: 3 },
            { gateId: IDS.gates[1], item: 'Record baseline statistics', isCompleted: true, isMandatory: false, sortOrder: 4 },
            // Salem Gate 2 — in progress (2 of 4 done)
            { gateId: IDS.gates[2], item: 'Mid-season performance review', isCompleted: true, isMandatory: true, sortOrder: 1 },
            { gateId: IDS.gates[2], item: 'Update market valuation', isCompleted: true, isMandatory: true, sortOrder: 2 },
            { gateId: IDS.gates[2], item: 'Review IDP progress & adjust goals', isCompleted: false, isMandatory: true, sortOrder: 3 },
            { gateId: IDS.gates[2], item: 'Stakeholder feedback report', isCompleted: false, isMandatory: false, sortOrder: 4 },
            // Youth gate 0
            { gateId: IDS.gates[3], item: 'Identity verification', isCompleted: true, isMandatory: true, sortOrder: 1 },
            { gateId: IDS.gates[3], item: 'Medical clearance', isCompleted: true, isMandatory: true, sortOrder: 2 },
        ], { ignoreDuplicates: true });
        logger.info('✅ Gates seeded (4 gates + 14 checklist items)');
    }
    async function seedReferrals() {
        const referrals = [
            { playerId: IDS.players[1], type: 'Medical', status: 'Open', priority: 'High', desc: 'Recurring knee pain after training' },
            { playerId: IDS.players[6], type: 'Performance', status: 'InProgress', priority: 'Medium', desc: 'Declining match performance over 3 games' },
            { playerId: IDS.players[3], type: 'Mental', status: 'Resolved', priority: 'Low', desc: 'Post-match anxiety, resolved with counseling' },
        ];
        await referral_model_1.Referral.bulkCreate(referrals.map((r, i) => ({
            id: IDS.referrals[i],
            referralType: r.type,
            playerId: r.playerId,
            triggerDesc: r.desc,
            status: r.status,
            priority: r.priority,
            assignedTo: IDS.users.analyst,
            createdBy: IDS.users.agent,
        })), { ignoreDuplicates: true });
        logger.info('✅ Referrals seeded (3 referrals)');
    }
    async function seedScouting() {
        const prospects = [
            { name: 'Ahmed Al-Zahrani', nameAr: 'أحمد الزهراني', dob: '2005-04-12', pos: 'CM', club: 'Al Batin', priority: 'High', tech: 78, phys: 82, mental: 75, potential: 85 },
            { name: 'Saad Al-Otaibi', nameAr: 'سعد العتيبي', dob: '2006-09-05', pos: 'ST', club: 'Al Wehda', priority: 'Medium', tech: 72, phys: 80, mental: 70, potential: 80 },
            { name: 'Majed Al-Harbi', nameAr: 'ماجد الحربي', dob: '2005-01-22', pos: 'LB', club: 'Al Khaleej', priority: 'High', tech: 70, phys: 85, mental: 72, potential: 82 },
        ];
        await scouting_model_1.Watchlist.bulkCreate(prospects.map((p, i) => ({
            id: IDS.watchlists[i],
            prospectName: p.name,
            prospectNameAr: p.nameAr,
            dateOfBirth: p.dob,
            nationality: 'Saudi Arabia',
            position: p.pos,
            currentClub: p.club,
            currentLeague: 'Saudi First Division',
            status: 'Active',
            source: 'Scout Network',
            scoutedBy: IDS.users.scout,
            priority: p.priority,
            technicalRating: p.tech,
            physicalRating: p.phys,
            mentalRating: p.mental,
            potentialRating: p.potential,
        })), { ignoreDuplicates: true });
        logger.info('✅ Scouting seeded (3 watchlist prospects)');
    }
    async function seedPerformances() {
        // Seed performances for completed matches (legacy performances table)
        const completedMatchIds = [IDS.matches[3], IDS.matches[4], IDS.matches[5]];
        const playerIds = IDS.players.slice(0, 10);
        const rows = [];
        for (const matchId of completedMatchIds) {
            for (let i = 0; i < 4; i++) {
                const pid = playerIds[Math.floor(Math.random() * playerIds.length)];
                rows.push({
                    player_id: pid,
                    match_id: matchId,
                    average_rating: (6 + Math.random() * 3).toFixed(1),
                    goals: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0,
                    assists: Math.random() > 0.6 ? 1 : 0,
                    key_passes: Math.floor(Math.random() * 5),
                    successful_dribbles: Math.floor(Math.random() * 4),
                    minutes: 60 + Math.floor(Math.random() * 30),
                });
            }
        }
        for (const row of rows) {
            await database_1.sequelize.query(`INSERT INTO performances (player_id, match_id, average_rating, goals, assists, key_passes, successful_dribbles, minutes)
       VALUES (:player_id, :match_id, :average_rating, :goals, :assists, :key_passes, :successful_dribbles, :minutes)
       ON CONFLICT DO NOTHING`, { replacements: row, type: sequelize_1.QueryTypes.INSERT });
        }
        logger.info('✅ Performances seeded');
    }
    async function seedMatchPlayers() {
        // ── Match Players: Assign players to completed + upcoming matches ──
        const availabilities = ['starter', 'starter', 'starter', 'starter', 'bench', 'bench', 'injured'];
        const matchPlayerRecords = [];
        let mpIdx = 0;
        // Completed matches — Al Hilal vs Al Ahli (match 3), Al Nassr vs Al Shabab (match 4), Al Ittihad vs Al Taawoun (match 5)
        const matchPlayerAssignments = [
            // Match 3 (Al Hilal vs Al Ahli): Hilal players + Ahli players
            { matchId: IDS.matches[3], players: [IDS.players[0], IDS.players[1], IDS.players[4], IDS.players[7], IDS.players[9], IDS.players[2], IDS.players[3]] },
            // Match 4 (Al Nassr vs Al Shabab): Nassr + Shabab players
            { matchId: IDS.matches[4], players: [IDS.players[8], IDS.players[6], IDS.players[13]] },
            // Match 5 (Al Ittihad vs Al Taawoun): Ittihad players
            { matchId: IDS.matches[5], players: [IDS.players[5]] },
            // Upcoming match 0 (Al Hilal vs Al Nassr): Both sides
            { matchId: IDS.matches[0], players: [IDS.players[0], IDS.players[1], IDS.players[4], IDS.players[9], IDS.players[8]] },
            // Upcoming match 1 (Al Ahli vs Al Ittihad)
            { matchId: IDS.matches[1], players: [IDS.players[2], IDS.players[3], IDS.players[5]] },
        ];
        for (const assignment of matchPlayerAssignments) {
            for (let i = 0; i < assignment.players.length; i++) {
                const avail = availabilities[i % availabilities.length];
                matchPlayerRecords.push({
                    id: IDS.matchPlayers[mpIdx++],
                    matchId: assignment.matchId,
                    playerId: assignment.players[i],
                    availability: avail,
                    positionInMatch: null,
                    minutesPlayed: avail === 'starter' ? 60 + Math.floor(Math.random() * 30) : (avail === 'bench' ? Math.floor(Math.random() * 30) : null),
                    notes: avail === 'injured' ? 'Hamstring strain' : null,
                });
            }
        }
        await matchPlayer_model_1.MatchPlayer.bulkCreate(matchPlayerRecords, { ignoreDuplicates: true });
        logger.info(`✅ Match players seeded (${matchPlayerRecords.length} assignments)`);
    }
    async function seedMatchStats() {
        // ── Player Match Stats: Detailed stats for completed matches only ──
        const completedMatchIds = [IDS.matches[3], IDS.matches[4], IDS.matches[5]];
        const statsRecords = [];
        let msIdx = 0;
        // Get the match player assignments for completed matches
        const completedPlayers = [
            // Match 3: Hilal + Ahli starters
            { matchId: IDS.matches[3], players: [IDS.players[0], IDS.players[1], IDS.players[4], IDS.players[9], IDS.players[2], IDS.players[3]] },
            // Match 4: Nassr + Shabab
            { matchId: IDS.matches[4], players: [IDS.players[8], IDS.players[6]] },
            // Match 5: Ittihad
            { matchId: IDS.matches[5], players: [IDS.players[5]] },
        ];
        for (const group of completedPlayers) {
            for (const pid of group.players) {
                const isScorer = Math.random() > 0.65;
                const mins = 60 + Math.floor(Math.random() * 30);
                statsRecords.push({
                    id: IDS.matchStats[msIdx++],
                    playerId: pid,
                    matchId: group.matchId,
                    minutesPlayed: mins,
                    goals: isScorer ? Math.floor(Math.random() * 2) + 1 : 0,
                    assists: Math.random() > 0.55 ? 1 : 0,
                    shotsTotal: Math.floor(Math.random() * 5) + 1,
                    shotsOnTarget: Math.floor(Math.random() * 3),
                    passesTotal: 20 + Math.floor(Math.random() * 40),
                    passesCompleted: 15 + Math.floor(Math.random() * 30),
                    tacklesTotal: Math.floor(Math.random() * 5),
                    interceptions: Math.floor(Math.random() * 4),
                    duelsWon: Math.floor(Math.random() * 6),
                    duelsTotal: 3 + Math.floor(Math.random() * 8),
                    dribblesCompleted: Math.floor(Math.random() * 4),
                    dribblesAttempted: 1 + Math.floor(Math.random() * 5),
                    foulsCommitted: Math.floor(Math.random() * 3),
                    foulsDrawn: Math.floor(Math.random() * 3),
                    yellowCards: Math.random() > 0.8 ? 1 : 0,
                    redCards: 0,
                    rating: Number((6 + Math.random() * 3).toFixed(1)),
                    positionInMatch: null,
                });
            }
        }
        await playerMatchStats_model_1.PlayerMatchStats.bulkCreate(statsRecords, { ignoreDuplicates: true });
        logger.info(`✅ Player match stats seeded (${statsRecords.length} stat rows)`);
    }
    // ══════════════════════════════════════════
    // MAIN SEED FUNCTION
    // ══════════════════════════════════════════
    export async function seedDatabase() {
        if (env_1.env.nodeEnv !== 'development') {
            logger.info('⏭️  Skipping seed — not in development mode');
            return;
        }
        try {
            // Check if already seeded
            const existingAdmin = await user_model_1.User.findOne({ where: { email: 'admin@sadara.com' } });
            if (existingAdmin) {
                logger.info('⏭️  Database already seeded (admin user exists)');
                return;
            }
            logger.info('🌱 Seeding development database...');
            // Sync all Sequelize models (creates tables that don't exist)
            await database_1.sequelize.sync({ alter: false });
            // Create tables not managed by Sequelize
            await createMissingTables();
            // Seed in order (respecting foreign keys)
            await seedUsers();
            await seedClubs();
            await seedPlayers();
            await seedContracts();
            await seedMatches();
            await seedOffers();
            await seedTasks();
            await seedFinance();
            await seedDocuments();
            await seedGates();
            await seedReferrals();
            await seedScouting();
            await seedPerformances();
            await seedMatchPlayers();
            await seedMatchStats();
            // Create views AFTER data exists
            await createViews();
            logger.info('🎉 Development seed complete!');
            logger.info('   📧 admin@sadara.com / Sadara2025!');
            logger.info('   📧 agent@sadara.com / Sadara2025!');
            logger.info('   📧 analyst@sadara.com / Sadara2025!');
            logger.info('   📧 scout@sadara.com / Sadara2025!');
        }
        catch (err) {
            logger.error('❌ Seed failed:', { error: err.message, stack: err.stack });
        }
    }
}
//# sourceMappingURL=seed.js.map