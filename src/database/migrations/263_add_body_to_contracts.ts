// Adds editable body, freeze snapshot, and template FK columns to contracts for the editable-contracts feature.
import { QueryInterface, DataTypes, QueryTypes } from "sequelize";
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
  });
  // Add FK constraint separately — inline references on ALTER TABLE ADD COLUMN
  // generates invalid SQL in Sequelize; addConstraint issues a proper ALTER TABLE.
  // Guard against fresh-DB runs where contracts table may not yet exist.
  if (await tableExists(queryInterface, "contracts")) {
    const constraintExists = await queryInterface.sequelize.query<{
      exists: boolean;
    }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE table_name = 'contracts' AND constraint_name = 'contracts_template_id_fkey'
       ) AS exists`,
      { type: QueryTypes.SELECT },
    );
    if (!constraintExists[0]?.exists) {
      await queryInterface.addConstraint("contracts", {
        fields: ["template_id"],
        type: "foreign key",
        name: "contracts_template_id_fkey",
        references: { table: "contract_templates", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
  }
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
