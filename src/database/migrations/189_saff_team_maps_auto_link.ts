import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "saff_team_maps"))) return;

  const seq = queryInterface.sequelize;

  // pg_trgm is required for word_similarity() used by auto-link
  await seq.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");

  // auto_link_confidence — outcome of the fuzzy-match run:
  //   'high'   → similarity ≥ 0.85, club_id was set automatically
  //   'medium' → 0.6–0.85, suggested_club_id set, awaits human confirmation
  //   null     → not yet processed (old rows) or no match found
  await addColumnIfMissing(
    queryInterface,
    "saff_team_maps",
    "auto_link_confidence",
    {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: null,
    },
  );

  // suggested_club_id — best candidate for medium-confidence rows
  await addColumnIfMissing(
    queryInterface,
    "saff_team_maps",
    "suggested_club_id",
    {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: "clubs", key: "id" },
    },
  );

  // Index on suggested_club_id for the review-queue UI filter
  await seq.query(
    `CREATE INDEX IF NOT EXISTS idx_saff_team_maps_suggested_club
     ON saff_team_maps (suggested_club_id)
     WHERE suggested_club_id IS NOT NULL`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    "DROP INDEX IF EXISTS idx_saff_team_maps_suggested_club",
  );
  await removeColumnIfPresent(
    queryInterface,
    "saff_team_maps",
    "suggested_club_id",
  );
  await removeColumnIfPresent(
    queryInterface,
    "saff_team_maps",
    "auto_link_confidence",
  );
}
