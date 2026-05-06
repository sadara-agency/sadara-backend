import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "referrals", "match_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    references: { model: "matches", key: "id" },
    onDelete: "SET NULL",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "referrals", "match_id");
}
