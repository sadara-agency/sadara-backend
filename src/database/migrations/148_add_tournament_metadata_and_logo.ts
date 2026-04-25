// ═══════════════════════════════════════════════════════════════
// Migration 148: SAFF tournament metadata + logo
//
// Adds five columns to `saff_tournaments` so each tournament carries
// its squad context (age_category, division, competition_type),
// scraped championship logo (logo_url), and an explicit support flag
// (is_supported = false for women's / futsal / beach which are out of
// scope for the wizard's apply step). The new columns drive the squad
// resolution logic in Phase 3 of the SAFF Club/Squad refactor.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: saff_tournaments is created by 000_baseline. On a clean
  // CI database, this migration runs before later migrations have built
  // the SAFF tables. Skip cleanly if the parent table doesn't exist yet.
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  const [tableRows] = await seq.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saff_tournaments'`,
  );
  if ((tableRows as unknown[]).length === 0) return;

  // Inspect existing columns so the migration is idempotent if a partial
  // earlier run left some columns behind.
  const [colRows] = await seq.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'saff_tournaments'`,
  );
  const existing = new Set(
    (colRows as { column_name: string }[]).map((r) => r.column_name),
  );

  if (!existing.has("age_category")) {
    await queryInterface.addColumn("saff_tournaments", "age_category", {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "senior",
    });
  }

  if (!existing.has("division")) {
    await queryInterface.addColumn("saff_tournaments", "division", {
      type: DataTypes.STRING(40),
      allowNull: true,
    });
  }

  if (!existing.has("competition_type")) {
    await queryInterface.addColumn("saff_tournaments", "competition_type", {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "league",
    });
  }

  if (!existing.has("logo_url")) {
    await queryInterface.addColumn("saff_tournaments", "logo_url", {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
  }

  if (!existing.has("is_supported")) {
    await queryInterface.addColumn("saff_tournaments", "is_supported", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  }

  // Index on (is_supported, age_category) so the wizard list query can
  // filter unsupported tournaments cheaply.
  await seq.query(
    `CREATE INDEX IF NOT EXISTS idx_saff_tournaments_support_category
     ON saff_tournaments (is_supported, age_category)`,
  );

  console.log("Migration 148: saff_tournaments metadata + logo columns added");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;
  await seq.query(`DROP INDEX IF EXISTS idx_saff_tournaments_support_category`);
  for (const col of [
    "is_supported",
    "logo_url",
    "competition_type",
    "division",
    "age_category",
  ]) {
    try {
      await queryInterface.removeColumn("saff_tournaments", col);
    } catch {
      // tolerate already-removed columns
    }
  }
  console.log("Migration 148: rolled back");
}
