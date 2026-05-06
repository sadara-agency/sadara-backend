import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "tickets", "referral_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    references: { model: "referrals", key: "id" },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "tickets", "referral_id");
}
