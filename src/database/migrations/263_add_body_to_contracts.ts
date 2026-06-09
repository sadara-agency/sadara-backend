// Adds editable body, freeze snapshot, and template FK columns to contracts for the editable-contracts feature.
import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "contracts", "body_json", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "contracts", "body_html", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "contracts", "body_html_snapshot", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "contracts", "body_frozen_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "contracts", "template_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    references: { model: "contract_templates", key: "id" },
    onDelete: "SET NULL",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "contracts", "template_id");
  await removeColumnIfPresent(queryInterface, "contracts", "body_frozen_at");
  await removeColumnIfPresent(
    queryInterface,
    "contracts",
    "body_html_snapshot",
  );
  await removeColumnIfPresent(queryInterface, "contracts", "body_html");
  await removeColumnIfPresent(queryInterface, "contracts", "body_json");
}
