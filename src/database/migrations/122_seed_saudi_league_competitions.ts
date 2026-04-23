import { QueryInterface } from "sequelize";

/**
 * Migration 122
 *
 * Idempotent upsert of the 19 Saudi league competitions the client tracks.
 * Keyed on LOWER(name) to survive casing drift from manual inserts.
 * saffId and saffplusSlug start null — scrapers discover and write them on first run.
 */

interface CompetitionSeed {
  name: string;
  nameAr: string;
  type: string;
  tier: number | null;
  ageGroup: string | null;
  agencyValue: string;
}

const COMPETITIONS: CompetitionSeed[] = [
  // Senior Men — Critical/High
  {
    name: "King's Cup",
    nameAr: "كأس خادم الحرمين الشريفين",
    type: "cup",
    tier: null,
    ageGroup: null,
    agencyValue: "Critical",
  },
  {
    name: "Roshn Saudi League",
    nameAr: "دوري روشن السعودي",
    type: "league",
    tier: 1,
    ageGroup: null,
    agencyValue: "Critical",
  },
  {
    name: "Saudi Super Cup",
    nameAr: "كأس السوبر السعودي",
    type: "super_cup",
    tier: null,
    ageGroup: null,
    agencyValue: "High",
  },
  {
    name: "Yelo First Division",
    nameAr: "دوري يلو للدرجة الأولى",
    type: "league",
    tier: 2,
    ageGroup: null,
    agencyValue: "High",
  },
  {
    name: "Second Division",
    nameAr: "دوري الدرجة الثانية",
    type: "league",
    tier: 3,
    ageGroup: null,
    agencyValue: "Medium",
  },
  {
    name: "Third Division",
    nameAr: "الدوري السعودي لأندية الدرجة الثالثة",
    type: "league",
    tier: 4,
    ageGroup: null,
    agencyValue: "Low",
  },
  // Elite
  {
    name: "Jawwy Elite U21",
    nameAr: "دوري جوّي للنخبة تحت 21",
    type: "league",
    tier: null,
    ageGroup: "U21",
    agencyValue: "High",
  },
  // Saudi Premier Youth
  {
    name: "Saudi Premier U18",
    nameAr: "الدوري السعودي الممتاز تحت18",
    type: "league",
    tier: null,
    ageGroup: "U18",
    agencyValue: "Scouting",
  },
  {
    name: "Saudi Premier U17",
    nameAr: "الدوري السعودي الممتاز تحت17",
    type: "league",
    tier: null,
    ageGroup: "U17",
    agencyValue: "Scouting",
  },
  {
    name: "Saudi Premier U16",
    nameAr: "الدوري السعودي الممتاز تحت16",
    type: "league",
    tier: null,
    ageGroup: "U16",
    agencyValue: "Scouting",
  },
  {
    name: "Saudi Premier U15",
    nameAr: "الدوري السعودي الممتاز تحت15",
    type: "league",
    tier: null,
    ageGroup: "U15",
    agencyValue: "Scouting",
  },
  // First Division Youth
  {
    name: "First Division U18",
    nameAr: "دوري الدرجة الأولى تحت 18",
    type: "league",
    tier: null,
    ageGroup: "U18",
    agencyValue: "Scouting",
  },
  {
    name: "First Division U17",
    nameAr: "دوري الدرجة الأولى تحت 17",
    type: "league",
    tier: null,
    ageGroup: "U17",
    agencyValue: "Scouting",
  },
  {
    name: "First Division U16",
    nameAr: "دوري الدرجة الأولى تحت 16",
    type: "league",
    tier: null,
    ageGroup: "U16",
    agencyValue: "Scouting",
  },
  {
    name: "First Division U15",
    nameAr: "دوري الدرجة الأولى تحت 15",
    type: "league",
    tier: null,
    ageGroup: "U15",
    agencyValue: "Scouting",
  },
  // Braem (Grassroots Youth)
  {
    name: "Braem U14",
    nameAr: "دوري البراعم تحت14",
    type: "league",
    tier: null,
    ageGroup: "U14",
    agencyValue: "Niche",
  },
  {
    name: "Braem U13",
    nameAr: "دوري البراعم تحت13",
    type: "league",
    tier: null,
    ageGroup: "U13",
    agencyValue: "Niche",
  },
  {
    name: "Braem U12",
    nameAr: "دوري البراعم تحت12",
    type: "league",
    tier: null,
    ageGroup: "U12",
    agencyValue: "Niche",
  },
  {
    name: "Braem U11",
    nameAr: "دوري البراعم تحت11",
    type: "league",
    tier: null,
    ageGroup: "U11",
    agencyValue: "Niche",
  },
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  const now = new Date();

  for (const comp of COMPETITIONS) {
    // Check if already exists (case-insensitive on name to handle manual inserts)
    const [existing] = (await queryInterface.sequelize.query(
      `SELECT id FROM competitions WHERE LOWER(name) = LOWER(:name) LIMIT 1`,
      { replacements: { name: comp.name } },
    )) as [Array<{ id: string }>, unknown];

    if (existing.length > 0) {
      // Update fields that may have been manually set incorrectly
      await queryInterface.sequelize.query(
        `UPDATE competitions
         SET name_ar = :nameAr,
             type = :type,
             tier = :tier,
             age_group = :ageGroup,
             agency_value = :agencyValue,
             country = 'Saudi Arabia',
             gender = 'men',
             format = 'outdoor',
             is_active = true,
             updated_at = :now
         WHERE id = :id`,
        {
          replacements: {
            nameAr: comp.nameAr,
            type: comp.type,
            tier: comp.tier ?? 1,
            ageGroup: comp.ageGroup,
            agencyValue: comp.agencyValue,
            now,
            id: existing[0].id,
          },
        },
      );
    } else {
      await queryInterface.sequelize.query(
        `INSERT INTO competitions
           (id, name, name_ar, country, type, tier, age_group, gender, format,
            agency_value, is_active, saff_id, sportmonks_league_id, saffplus_slug,
            created_at, updated_at)
         VALUES
           (gen_random_uuid(), :name, :nameAr, 'Saudi Arabia', :type, :tier, :ageGroup, 'men', 'outdoor',
            :agencyValue, true, NULL, NULL, NULL,
            :now, :now)`,
        {
          replacements: {
            name: comp.name,
            nameAr: comp.nameAr,
            type: comp.type,
            tier: comp.tier ?? 1,
            ageGroup: comp.ageGroup,
            agencyValue: comp.agencyValue,
            now,
          },
        },
      );
    }
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  const names = COMPETITIONS.map((c) => c.name);
  await queryInterface.sequelize.query(
    `DELETE FROM competitions WHERE name IN (:names) AND country = 'Saudi Arabia'`,
    { replacements: { names } },
  );
}
