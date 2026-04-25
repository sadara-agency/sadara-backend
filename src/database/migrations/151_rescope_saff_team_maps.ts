import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: saff_team_maps may not exist on a blank test database.
  const [tables] = await queryInterface.sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saff_team_maps'
  `);
  if ((tables as unknown[]).length === 0) return;

  // 1. Add tournament_id — nullable FK to saff_tournaments.
  //    Existing rows keep NULL (legacy general mapping).
  await queryInterface.addColumn("saff_team_maps", "tournament_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "saff_tournaments", key: "id" },
    onDelete: "SET NULL",
  });

  // 2. Add squad_id — nullable FK to squads (backfilled by Phase 3 apply).
  await queryInterface.addColumn("saff_team_maps", "squad_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "squads", key: "id" },
    onDelete: "SET NULL",
  });

  // 3. Drop the old UNIQUE (saff_team_id, season) constraint.
  //    PostgreSQL generates this name automatically from the index definition.
  await queryInterface.sequelize.query(`
    ALTER TABLE saff_team_maps
    DROP CONSTRAINT IF EXISTS saff_team_maps_saff_team_id_season_key
  `);

  // 4. Partial unique index for legacy rows (tournament_id IS NULL).
  //    Preserves the old one-row-per-team-per-season guarantee for general mappings.
  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS saff_team_maps_team_season_null_uniq
    ON saff_team_maps (saff_team_id, season)
    WHERE tournament_id IS NULL
  `);

  // 5. Partial unique index for tournament-specific rows.
  //    Allows the same SAFF team id to map to different squads per tournament.
  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS saff_team_maps_team_season_tournament_uniq
    ON saff_team_maps (saff_team_id, season, tournament_id)
    WHERE tournament_id IS NOT NULL
  `);

  // 6. Index on squad_id for FK lookups.
  await queryInterface.addIndex("saff_team_maps", ["squad_id"], {
    name: "idx_saff_team_maps_squad_id",
  });

  // 7. Index on tournament_id for FK lookups.
  await queryInterface.addIndex("saff_team_maps", ["tournament_id"], {
    name: "idx_saff_team_maps_tournament_id",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [tables] = await queryInterface.sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saff_team_maps'
  `);
  if ((tables as unknown[]).length === 0) return;

  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS saff_team_maps_team_season_null_uniq`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS saff_team_maps_team_season_tournament_uniq`,
  );

  try {
    await queryInterface.removeIndex(
      "saff_team_maps",
      "idx_saff_team_maps_squad_id",
    );
  } catch {
    /* index may not exist */
  }
  try {
    await queryInterface.removeIndex(
      "saff_team_maps",
      "idx_saff_team_maps_tournament_id",
    );
  } catch {
    /* index may not exist */
  }

  // Restore the original single-tier unique constraint.
  // Note: this will fail if tournament-specific rows created duplicate keys.
  await queryInterface.sequelize.query(`
    ALTER TABLE saff_team_maps
    ADD CONSTRAINT saff_team_maps_saff_team_id_season_key
    UNIQUE (saff_team_id, season)
  `);

  await queryInterface.removeColumn("saff_team_maps", "tournament_id");
  await queryInterface.removeColumn("saff_team_maps", "squad_id");
}
