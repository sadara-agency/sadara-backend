// ─────────────────────────────────────────────────────────────
// Migration 190 — spl_gameweeks table
// Stores Pulselive gameweek metadata (number, dates) per season.
// ─────────────────────────────────────────────────────────────

import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "spl_gameweeks")) return;

  await queryInterface.createTable("spl_gameweeks", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    season_id: { type: DataTypes.INTEGER, allowNull: false },
    season_label: { type: DataTypes.STRING(20), allowNull: false },
    gameweek_number: { type: DataTypes.INTEGER, allowNull: false },
    pulselive_id: { type: DataTypes.INTEGER, allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_spl_gameweeks_season_gw
     ON spl_gameweeks (season_id, gameweek_number)`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "spl_gameweeks")) {
    await queryInterface.dropTable("spl_gameweeks");
  }
}
