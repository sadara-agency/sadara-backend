// ─────────────────────────────────────────────────────────────
// Migration 191 — saff_national_teams table
// Stores SAFF national team metadata + scraped squad JSONB.
// ─────────────────────────────────────────────────────────────

import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "saff_national_teams")) return;

  await queryInterface.createTable("saff_national_teams", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saff_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    name_en: { type: DataTypes.STRING(200), allowNull: false },
    name_ar: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: "",
    },
    age_group: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "senior",
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "men",
    },
    logo_url: { type: DataTypes.STRING(1000), allowNull: true },
    squad: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_saff_national_teams_gender_age
     ON saff_national_teams (gender, age_group)`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "saff_national_teams")) {
    await queryInterface.dropTable("saff_national_teams");
  }
}
