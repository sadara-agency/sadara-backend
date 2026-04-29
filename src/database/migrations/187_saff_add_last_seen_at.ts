import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "saff_standings", "last_seen_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });

  await addColumnIfMissing(queryInterface, "saff_fixtures", "last_seen_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "saff_standings", "last_seen_at");
  await removeColumnIfPresent(queryInterface, "saff_fixtures", "last_seen_at");
}
