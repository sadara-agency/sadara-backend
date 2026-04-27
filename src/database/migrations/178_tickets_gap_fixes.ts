import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fix 2: make player_id nullable (tickets can be agency-level, not player-specific)
  await queryInterface.sequelize.query(
    `ALTER TABLE tickets ALTER COLUMN player_id DROP NOT NULL`,
  );

  // Fix 3: add additional_assignees UUID array for multi-responsible support
  await addColumnIfMissing(queryInterface, "tickets", "additional_assignees", {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "tickets",
    "additional_assignees",
  );

  // Restore NOT NULL — only safe if no existing rows have null player_id
  await queryInterface.sequelize.query(
    `ALTER TABLE tickets ALTER COLUMN player_id SET NOT NULL`,
  );
}
