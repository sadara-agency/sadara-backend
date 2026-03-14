import { sequelize } from "@config/database";

/**
 * Migration: Hybrid Player Attributes
 *
 * Replaces the 6 flat skill columns (speed, passing, shooting, defense, fitness, tactical)
 * with 5 universal physical columns + 1 JSONB column for position-specific technical attributes.
 */

// Position group mapping for data migration
const POSITION_GROUP_MAP: Record<string, string> = {
  Goalkeeper: "GK",
  "Center Back": "DEF",
  "Right Back": "DEF",
  "Left Back": "DEF",
  "Defensive Mid": "CDM",
  Midfielder: "CAM_WING",
  "Attacking Mid": "CAM_WING",
  "Right Winger": "CAM_WING",
  "Left Winger": "CAM_WING",
  Striker: "ST",
};

// Default technical attribute keys per group
const TECHNICAL_KEYS: Record<string, string[]> = {
  GK: [
    "reflexes",
    "positioning",
    "handling",
    "distribution",
    "aerial_command",
    "one_on_one",
  ],
  DEF: [
    "marking",
    "tackling",
    "heading",
    "interceptions",
    "crossing",
    "build_up_play",
  ],
  CDM: [
    "ball_recovery",
    "pressing",
    "passing_range",
    "positional_discipline",
    "shielding",
    "through_balls",
  ],
  CAM_WING: [
    "dribbling",
    "vision",
    "key_passing",
    "long_shots",
    "ball_control",
    "creativity",
  ],
  ST: [
    "finishing",
    "off_the_ball",
    "heading",
    "hold_up_play",
    "composure",
    "penalty_taking",
  ],
};

// Best-effort mapping from old columns to new technical keys per group
// Keys: old column → new technical attribute
const OLD_TO_NEW_MAP: Record<string, Record<string, string>> = {
  GK: {
    tactical: "positioning",
    fitness: "handling",
    passing: "distribution",
  },
  DEF: {
    defense: "tackling",
    passing: "build_up_play",
    tactical: "marking",
    shooting: "heading",
  },
  CDM: {
    defense: "ball_recovery",
    passing: "passing_range",
    tactical: "positional_discipline",
    shooting: "through_balls",
  },
  CAM_WING: {
    shooting: "long_shots",
    passing: "key_passing",
    tactical: "vision",
    defense: "ball_control",
  },
  ST: {
    shooting: "finishing",
    tactical: "composure",
    defense: "hold_up_play",
    passing: "off_the_ball",
  },
};

export async function up() {
  // 1. Add new physical attribute columns
  await sequelize.query(
    `ALTER TABLE players
       ADD COLUMN IF NOT EXISTS pace INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN IF NOT EXISTS stamina INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN IF NOT EXISTS strength INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN IF NOT EXISTS agility INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN IF NOT EXISTS jumping INTEGER NOT NULL DEFAULT 0,
       ADD COLUMN IF NOT EXISTS technical_attributes JSONB;`,
  );

  // Check if old columns exist (sync-created tables won't have them)
  const [oldCols] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'players' AND column_name = 'speed'`,
  );
  const hasOldColumns = (oldCols as any[]).length > 0;

  if (hasOldColumns) {
    // 2. Migrate old physical data: speed → pace, fitness → stamina
    await sequelize.query(
      `UPDATE players SET
         pace = COALESCE(speed, 0),
         stamina = COALESCE(fitness, 0);`,
    );

    // 3. Migrate technical attributes based on position group
    const [players] = await sequelize.query(
      `SELECT id, position, speed, passing, shooting, defense, fitness, tactical
       FROM players
       WHERE position IS NOT NULL`,
    );

    for (const player of players as any[]) {
      const group = POSITION_GROUP_MAP[player.position];
      if (!group) continue;

      const keys = TECHNICAL_KEYS[group];
      const mapping = OLD_TO_NEW_MAP[group] || {};

      const attributes: Record<string, number> = {};
      for (const key of keys) {
        attributes[key] = 0;
      }

      for (const [oldCol, newKey] of Object.entries(mapping)) {
        if (player[oldCol] != null && attributes[newKey] !== undefined) {
          attributes[newKey] = Number(player[oldCol]) || 0;
        }
      }

      const jsonValue = JSON.stringify({ group, attributes });

      await sequelize.query(
        `UPDATE players SET technical_attributes = :jsonValue::jsonb WHERE id = :id`,
        { replacements: { jsonValue, id: player.id } },
      );
    }

    // 4. Drop old columns
    await sequelize.query(
      `ALTER TABLE players
         DROP COLUMN IF EXISTS speed,
         DROP COLUMN IF EXISTS passing,
         DROP COLUMN IF EXISTS shooting,
         DROP COLUMN IF EXISTS defense,
         DROP COLUMN IF EXISTS fitness,
         DROP COLUMN IF EXISTS tactical;`,
    );
  }
}

export async function down() {
  // 1. Re-add old columns
  await sequelize.query(
    `ALTER TABLE players
       ADD COLUMN IF NOT EXISTS speed INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS passing INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS shooting INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS fitness INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS tactical INTEGER DEFAULT 0;`,
  );

  // Check if new columns exist before reverse-migrating
  const [newCols] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'players' AND column_name = 'pace'`,
  );

  if ((newCols as any[]).length > 0) {
    // 2. Reverse-migrate: pace → speed, stamina → fitness
    await sequelize.query(
      `UPDATE players SET
         speed = COALESCE(pace, 0),
         fitness = COALESCE(stamina, 0);`,
    );

    // 3. Reverse-migrate technical attributes back to flat columns
    await sequelize.query(
      `UPDATE players SET
         passing = COALESCE((technical_attributes->'attributes'->>'key_passing')::int,
                            (technical_attributes->'attributes'->>'passing_range')::int,
                            (technical_attributes->'attributes'->>'distribution')::int,
                            (technical_attributes->'attributes'->>'build_up_play')::int,
                            (technical_attributes->'attributes'->>'off_the_ball')::int, 0),
         shooting = COALESCE((technical_attributes->'attributes'->>'finishing')::int,
                             (technical_attributes->'attributes'->>'long_shots')::int,
                             (technical_attributes->'attributes'->>'heading')::int,
                             (technical_attributes->'attributes'->>'through_balls')::int, 0),
         defense = COALESCE((technical_attributes->'attributes'->>'tackling')::int,
                            (technical_attributes->'attributes'->>'ball_recovery')::int,
                            (technical_attributes->'attributes'->>'ball_control')::int,
                            (technical_attributes->'attributes'->>'hold_up_play')::int, 0),
         tactical = COALESCE((technical_attributes->'attributes'->>'positioning')::int,
                             (technical_attributes->'attributes'->>'marking')::int,
                             (technical_attributes->'attributes'->>'positional_discipline')::int,
                             (technical_attributes->'attributes'->>'vision')::int,
                             (technical_attributes->'attributes'->>'composure')::int, 0)
       WHERE technical_attributes IS NOT NULL;`,
    );
  }

  // 4. Drop new columns
  await sequelize.query(
    `ALTER TABLE players
       DROP COLUMN IF EXISTS pace,
       DROP COLUMN IF EXISTS stamina,
       DROP COLUMN IF EXISTS strength,
       DROP COLUMN IF EXISTS agility,
       DROP COLUMN IF EXISTS jumping,
       DROP COLUMN IF EXISTS technical_attributes;`,
  );
}
