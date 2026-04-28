import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Social-corner additions to scout_report_attributes (1–10 ratings)
  await addColumnIfMissing(
    queryInterface,
    "scout_report_attributes",
    "team_fit",
    {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  );
  await addColumnIfMissing(
    queryInterface,
    "scout_report_attributes",
    "communication",
    { type: DataTypes.INTEGER, allowNull: true },
  );
  await addColumnIfMissing(
    queryInterface,
    "scout_report_attributes",
    "coachability",
    { type: DataTypes.INTEGER, allowNull: true },
  );
  await addColumnIfMissing(
    queryInterface,
    "scout_report_attributes",
    "off_field_conduct",
    { type: DataTypes.INTEGER, allowNull: true },
  );

  // Psychological-depth additions
  await addColumnIfMissing(
    queryInterface,
    "scout_report_attributes",
    "composure",
    { type: DataTypes.INTEGER, allowNull: true },
  );
  await addColumnIfMissing(
    queryInterface,
    "scout_report_attributes",
    "resilience",
    { type: DataTypes.INTEGER, allowNull: true },
  );

  // Closed-taxonomy position template on watchlists (validated at app layer)
  await addColumnIfMissing(queryInterface, "watchlists", "position_template", {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "watchlists",
    "position_template",
  );
  await removeColumnIfPresent(
    queryInterface,
    "scout_report_attributes",
    "resilience",
  );
  await removeColumnIfPresent(
    queryInterface,
    "scout_report_attributes",
    "composure",
  );
  await removeColumnIfPresent(
    queryInterface,
    "scout_report_attributes",
    "off_field_conduct",
  );
  await removeColumnIfPresent(
    queryInterface,
    "scout_report_attributes",
    "coachability",
  );
  await removeColumnIfPresent(
    queryInterface,
    "scout_report_attributes",
    "communication",
  );
  await removeColumnIfPresent(
    queryInterface,
    "scout_report_attributes",
    "team_fit",
  );
}
