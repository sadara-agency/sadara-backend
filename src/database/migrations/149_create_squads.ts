// ═══════════════════════════════════════════════════════════════
// Migration 149: Squads table
//
// Phase 2 of the SAFF Club/Squad refactor. A `squad` is a specific
// competitive entity under a parent `club` — e.g. "Al Hilal U-17
// 1st Division" — that owns its own matches, contracts, and roster.
// One Club ⇒ many Squads (senior, U-23, U-21, U-19, U-17, U-15, ...
// each crossed with a division for league competitions; division
// is NULL for cup formats).
//
// Identity: (club_id, age_category, COALESCE(division, '')) is unique.
// We use a functional COALESCE index so two cup squads with division
// NULL collide as expected (PostgreSQL's default UNIQUE treats NULLs
// as distinct, which would let "Al Hilal Senior Cup" be inserted
// twice).
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: the parent `clubs` table is created by 000_baseline.
  // Skip cleanly if a partial CI run hasn't reached that point yet.
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  const [clubsRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'clubs'`,
  );
  if ((clubsRows as unknown[]).length === 0) return;

  // Idempotency — if a partial earlier run created the table, do not retry.
  const [tableRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'squads'`,
  );
  if ((tableRows as unknown[]).length > 0) {
    console.log("Migration 149: squads table already exists, skipping create");
    return;
  }

  await queryInterface.createTable("squads", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "clubs", key: "id" },
      onDelete: "CASCADE",
    },
    age_category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      // senior | u23 | u21 | u20 | u19 | u17 | u15 | u13
    },
    division: {
      type: DataTypes.STRING(40),
      allowNull: true,
      // premier | 1st-division | 2nd-division | 3rd-division | NULL (cups)
    },
    display_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    display_name_ar: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  // Functional unique — collapses NULL division into '' so cup squads
  // don't bypass the constraint.
  await seq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS squads_club_category_division_uniq
     ON squads (club_id, age_category, COALESCE(division, ''))`,
  );

  await seq.query(
    `CREATE INDEX IF NOT EXISTS squads_club_id_idx ON squads (club_id)`,
  );
  await seq.query(
    `CREATE INDEX IF NOT EXISTS squads_age_category_idx ON squads (age_category)`,
  );

  console.log("Migration 149: squads table created");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  await seq.query(`DROP INDEX IF EXISTS squads_age_category_idx`);
  await seq.query(`DROP INDEX IF EXISTS squads_club_id_idx`);
  await seq.query(`DROP INDEX IF EXISTS squads_club_category_division_uniq`);
  await queryInterface.dropTable("squads");
  console.log("Migration 149: rolled back");
}
