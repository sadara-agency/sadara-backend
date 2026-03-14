import { sequelize } from "@config/database";

// ── Tournament seed (from saff.service.ts TOURNAMENT_SEED) ──

const TOURNAMENT_SEED = [
  {
    saffId: 333,
    name: "Roshn Saudi League",
    nameAr: "دوري روشن السعودي",
    category: "pro",
    tier: 1,
    agencyValue: "Critical",
  },
  {
    saffId: 342,
    name: "King Cup",
    nameAr: "كأس الملك",
    category: "pro",
    tier: 1,
    agencyValue: "High",
  },
  {
    saffId: 329,
    name: "Saudi Super Cup",
    nameAr: "كأس السوبر السعودي",
    category: "pro",
    tier: 1,
    agencyValue: "High",
  },
  {
    saffId: 334,
    name: "Saudi League 1st Division",
    nameAr: "دوري الدرجة الأولى",
    category: "pro",
    tier: 2,
    agencyValue: "High",
  },
  {
    saffId: 335,
    name: "Second Division League",
    nameAr: "دوري الدرجة الثانية",
    category: "pro",
    tier: 3,
    agencyValue: "Medium",
  },
  {
    saffId: 336,
    name: "Saudi League 3rd Division",
    nameAr: "دوري الدرجة الثالثة",
    category: "pro",
    tier: 4,
    agencyValue: "Medium",
  },
  {
    saffId: 366,
    name: "Saudi League 4th Division",
    nameAr: "دوري الدرجة الرابعة",
    category: "pro",
    tier: 5,
    agencyValue: "Low",
  },
  {
    saffId: 350,
    name: "Jawwy Elite League U-21",
    nameAr: "دوري جوي النخبة تحت 21",
    category: "youth",
    tier: 1,
    agencyValue: "Critical",
  },
  {
    saffId: 351,
    name: "Saudi U-18 Premier League",
    nameAr: "الدوري الممتاز تحت 18",
    category: "youth",
    tier: 1,
    agencyValue: "Critical",
  },
  {
    saffId: 352,
    name: "Saudi U-17 Premier League",
    nameAr: "الدوري الممتاز تحت 17",
    category: "youth",
    tier: 1,
    agencyValue: "High",
  },
  {
    saffId: 353,
    name: "Saudi U-16 Premier League",
    nameAr: "الدوري الممتاز تحت 16",
    category: "youth",
    tier: 1,
    agencyValue: "High",
  },
  {
    saffId: 354,
    name: "Saudi U-15 Premier League",
    nameAr: "الدوري الممتاز تحت 15",
    category: "youth",
    tier: 1,
    agencyValue: "Medium",
  },
  {
    saffId: 371,
    name: "Saudi U-21 League Div.1",
    nameAr: "دوري الأولى تحت 21",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Medium",
  },
  {
    saffId: 355,
    name: "Saudi U-18 League Div.1",
    nameAr: "دوري الأولى تحت 18",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Medium",
  },
  {
    saffId: 356,
    name: "Saudi U-17 League Div.1",
    nameAr: "دوري الأولى تحت 17",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Medium",
  },
  {
    saffId: 357,
    name: "Saudi U-16 League Div.1",
    nameAr: "دوري الأولى تحت 16",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Low",
  },
  {
    saffId: 358,
    name: "Saudi U-15 League Div.1",
    nameAr: "دوري الأولى تحت 15",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Low",
  },
  {
    saffId: 367,
    name: "Saudi U-18 League Div.2",
    nameAr: "دوري الثانية تحت 18",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
  },
  {
    saffId: 368,
    name: "Saudi U-17 League Div.2",
    nameAr: "دوري الثانية تحت 17",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
  },
  {
    saffId: 369,
    name: "Saudi U-16 League Div.2",
    nameAr: "دوري الثانية تحت 16",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
  },
  {
    saffId: 370,
    name: "Saudi U-15 League Div.2",
    nameAr: "دوري الثانية تحت 15",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
  },
  {
    saffId: 341,
    name: "Saudi U-14 Regional Tournament",
    nameAr: "بطولة المناطق تحت 14",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
  },
  {
    saffId: 331,
    name: "Saudi U-13 Regional Tournament",
    nameAr: "بطولة المناطق تحت 13",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
  },
  {
    saffId: 386,
    name: "League U14",
    nameAr: "دوري تحت 14",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
  },
  {
    saffId: 387,
    name: "League U13",
    nameAr: "دوري تحت 13",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
  },
  {
    saffId: 388,
    name: "League U12",
    nameAr: "دوري تحت 12",
    category: "grassroots",
    tier: 5,
    agencyValue: "Scouting",
  },
  {
    saffId: 389,
    name: "League U11",
    nameAr: "دوري تحت 11",
    category: "grassroots",
    tier: 5,
    agencyValue: "Scouting",
  },
  {
    saffId: 345,
    name: "Women's Premier League",
    nameAr: "الدوري النسائي الممتاز",
    category: "women",
    tier: 1,
    agencyValue: "High",
  },
  {
    saffId: 361,
    name: "SAFF Women's Cup",
    nameAr: "كأس الاتحاد النسائي",
    category: "women",
    tier: 1,
    agencyValue: "High",
  },
  {
    saffId: 322,
    name: "Saudi Women's Super Cup",
    nameAr: "كأس السوبر النسائي",
    category: "women",
    tier: 1,
    agencyValue: "Medium",
  },
  {
    saffId: 385,
    name: "Women's Premier Challenge Cup",
    nameAr: "كأس تحدي الدوري الممتاز",
    category: "women",
    tier: 2,
    agencyValue: "Medium",
  },
  {
    saffId: 346,
    name: "Women's 1st Div. League",
    nameAr: "الدوري النسائي الأولى",
    category: "women",
    tier: 2,
    agencyValue: "Medium",
  },
  {
    saffId: 372,
    name: "Women's 2nd Div. League",
    nameAr: "الدوري النسائي الثانية",
    category: "women",
    tier: 3,
    agencyValue: "Low",
  },
  {
    saffId: 347,
    name: "Women's Premier League U-17",
    nameAr: "الدوري النسائي تحت 17",
    category: "women",
    tier: 2,
    agencyValue: "Medium",
  },
  {
    saffId: 384,
    name: "Saudi Girls U-17 1st Div.",
    nameAr: "دوري الأولى للبنات تحت 17",
    category: "women",
    tier: 3,
    agencyValue: "Low",
  },
  {
    saffId: 374,
    name: "SAFF Girl's U-15 Tournament",
    nameAr: "بطولة الاتحاد للبنات تحت 15",
    category: "women",
    tier: 3,
    agencyValue: "Scouting",
  },
  {
    saffId: 299,
    name: "Women's Futsal Tournament",
    nameAr: "بطولة كرة الصالات النسائية",
    category: "women",
    tier: 2,
    agencyValue: "Low",
  },
  {
    saffId: 362,
    name: "Saudi Futsal League",
    nameAr: "دوري كرة الصالات",
    category: "futsal",
    tier: 1,
    agencyValue: "Medium",
  },
  {
    saffId: 314,
    name: "Saudi Futsal League 1st Div.",
    nameAr: "دوري الصالات الأولى",
    category: "futsal",
    tier: 2,
    agencyValue: "Low",
  },
  {
    saffId: 396,
    name: "SAFF Futsal Cup",
    nameAr: "كأس الاتحاد للصالات",
    category: "futsal",
    tier: 1,
    agencyValue: "Low",
  },
  {
    saffId: 394,
    name: "Saudi Super Futsal Cup",
    nameAr: "كأس السوبر للصالات",
    category: "futsal",
    tier: 1,
    agencyValue: "Low",
  },
  {
    saffId: 395,
    name: "Saudi Futsal League U-20",
    nameAr: "دوري الصالات تحت 20",
    category: "futsal",
    tier: 2,
    agencyValue: "Low",
  },
  {
    saffId: 380,
    name: "Saudi Beach Soccer Premier League",
    nameAr: "دوري كرة الشاطئ الممتاز",
    category: "beach",
    tier: 1,
    agencyValue: "Low",
  },
  {
    saffId: 318,
    name: "Beach Soccer 1st Div. League",
    nameAr: "دوري كرة الشاطئ الأولى",
    category: "beach",
    tier: 2,
    agencyValue: "Low",
  },
  {
    saffId: 174,
    name: "Kingdom eCup",
    nameAr: "كأس المملكة الإلكتروني",
    category: "esports",
    tier: 1,
    agencyValue: "Niche",
  },
];

// ── Derive structured fields from SAFF category ──

function deriveCompetitionFields(t: (typeof TOURNAMENT_SEED)[0]) {
  const name = t.name.toLowerCase();

  // type
  let type: string = "league";
  if (name.includes("cup") || name.includes("tournament")) type = "cup";
  else if (name.includes("super cup")) type = "super_cup";

  // gender
  const gender = t.category === "women" ? "women" : "men";

  // format
  let format: string = "outdoor";
  if (t.category === "futsal" || name.includes("futsal")) format = "futsal";
  else if (t.category === "beach" || name.includes("beach")) format = "beach";
  else if (t.category === "esports") format = "esports";

  // age_group: extract U-XX pattern from name
  let ageGroup: string | null = null;
  const ageMatch = name.match(/u-?(\d{2})/i);
  if (ageMatch) ageGroup = `U-${ageMatch[1]}`;

  return { type, gender, format, ageGroup };
}

export async function up() {
  // ── DDL (each statement auto-commits; all are idempotent) ──

  // 1. Create enum types
  await sequelize.query(
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_competitions_type') THEN
        CREATE TYPE "enum_competitions_type" AS ENUM ('league','cup','super_cup','friendly');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_competitions_gender') THEN
        CREATE TYPE "enum_competitions_gender" AS ENUM ('men','women');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_competitions_format') THEN
        CREATE TYPE "enum_competitions_format" AS ENUM ('outdoor','futsal','beach','esports');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_competitions_agency_value') THEN
        CREATE TYPE "enum_competitions_agency_value" AS ENUM ('Critical','High','Medium','Low','Scouting','Niche');
      END IF;
    END $$;`,
  );

  // 2. Create competitions table
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS competitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      country VARCHAR(255) DEFAULT 'Saudi Arabia',
      type enum_competitions_type NOT NULL DEFAULT 'league',
      tier INTEGER NOT NULL DEFAULT 1,
      age_group VARCHAR(20),
      gender enum_competitions_gender DEFAULT 'men',
      format enum_competitions_format DEFAULT 'outdoor',
      agency_value enum_competitions_agency_value DEFAULT 'Medium',
      sportmonks_league_id INTEGER UNIQUE,
      saff_id INTEGER UNIQUE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  );

  // 3. Create club_competitions junction table (guard against missing clubs table)
  const [clubsExists] = await sequelize.query(
    `SELECT to_regclass('public.clubs') AS tbl`,
  );
  if ((clubsExists[0] as any)?.tbl) {
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS club_competitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        season VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(club_id, competition_id, season)
      );`,
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_club_competitions_club ON club_competitions(club_id)`,
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_club_competitions_competition ON club_competitions(competition_id)`,
    );
  }

  // 4. Add competition_id to matches (if matches table exists)
  const [matchesExists] = await sequelize.query(
    `SELECT to_regclass('public.matches') AS tbl`,
  );
  if ((matchesExists[0] as any)?.tbl) {
    const [cols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'matches' AND column_name = 'competition_id'`,
    );
    if (!(cols as any[]).length) {
      await sequelize.query(
        `ALTER TABLE matches ADD COLUMN competition_id UUID REFERENCES competitions(id)`,
      );
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_matches_competition_id ON matches(competition_id)`,
      );
    }
  }

  // ── DML (seed data — all idempotent via ON CONFLICT) ──

  // 5. Seed competitions from TOURNAMENT_SEED
  for (const entry of TOURNAMENT_SEED) {
    const { type, gender, format, ageGroup } = deriveCompetitionFields(entry);
    await sequelize.query(
      `INSERT INTO competitions (id, name, name_ar, type, tier, age_group, gender, format, agency_value, saff_id)
       VALUES (gen_random_uuid(), :name, :nameAr, :type, :tier, :ageGroup, :gender, :format, :agencyValue, :saffId)
       ON CONFLICT (saff_id) DO UPDATE SET
         name = EXCLUDED.name,
         name_ar = EXCLUDED.name_ar,
         type = EXCLUDED.type,
         tier = EXCLUDED.tier,
         age_group = EXCLUDED.age_group,
         gender = EXCLUDED.gender,
         format = EXCLUDED.format,
         agency_value = EXCLUDED.agency_value`,
      {
        replacements: {
          name: entry.name,
          nameAr: entry.nameAr,
          type,
          tier: entry.tier,
          ageGroup,
          gender,
          format,
          agencyValue: entry.agencyValue,
          saffId: entry.saffId,
        },
      },
    );
  }

  // 6. Backfill matches.competition_id from competition name
  if ((matchesExists[0] as any)?.tbl) {
    await sequelize.query(
      `UPDATE matches m
       SET competition_id = c.id
       FROM competitions c
       WHERE m.competition = c.name
         AND m.competition_id IS NULL`,
    );
  }

  // 7. Populate club_competitions from SPL clubs (clubs with spl_team_id)
  if ((clubsExists[0] as any)?.tbl) {
    await sequelize.query(
      `INSERT INTO club_competitions (club_id, competition_id, season)
       SELECT cl.id, co.id, '2025-2026'
       FROM clubs cl
       CROSS JOIN competitions co
       WHERE cl.spl_team_id IS NOT NULL
         AND co.name = 'Roshn Saudi League'
       ON CONFLICT (club_id, competition_id, season) DO NOTHING`,
    );

    // 8. Populate club_competitions from saff_team_maps (if table exists)
    const [saffTableExists] = await sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'saff_team_maps'`,
    );
    if ((saffTableExists as any[]).length) {
      await sequelize.query(
        `INSERT INTO club_competitions (club_id, competition_id, season)
         SELECT stm.club_id, co.id, stm.season
         FROM saff_team_maps stm
         JOIN saff_tournaments st ON st.saff_id = (
           SELECT st2.saff_id FROM saff_tournaments st2
           LIMIT 1
         )
         JOIN competitions co ON co.saff_id = st.saff_id
         WHERE stm.club_id IS NOT NULL
         ON CONFLICT (club_id, competition_id, season) DO NOTHING`,
      );
    }
  }
}

export async function down() {
  await sequelize.query(
    `ALTER TABLE matches DROP COLUMN IF EXISTS competition_id`,
  );
  await sequelize.query(`DROP TABLE IF EXISTS club_competitions`);
  await sequelize.query(`DROP TABLE IF EXISTS competitions`);
  await sequelize.query(`DROP TYPE IF EXISTS enum_competitions_type`);
  await sequelize.query(`DROP TYPE IF EXISTS enum_competitions_gender`);
  await sequelize.query(`DROP TYPE IF EXISTS enum_competitions_format`);
  await sequelize.query(`DROP TYPE IF EXISTS enum_competitions_agency_value`);
}
