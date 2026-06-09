import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "contract_templates", "body_json", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "contract_templates", "body_html", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "contract_templates", "is_default", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "contract_templates",
    "body_json",
  );
  await removeColumnIfPresent(
    queryInterface,
    "contract_templates",
    "body_html",
  );
  await removeColumnIfPresent(
    queryInterface,
    "contract_templates",
    "is_default",
  );
}
