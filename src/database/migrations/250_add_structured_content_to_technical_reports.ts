import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "technical_reports", "report_type", {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  await addColumnIfMissing(
    queryInterface,
    "technical_reports",
    "match_context",
    {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  );

  await addColumnIfMissing(
    queryInterface,
    "technical_reports",
    "overall_score",
    {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
    },
  );

  await addColumnIfMissing(queryInterface, "technical_reports", "verdict", {
    type: DataTypes.STRING(30),
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, "technical_reports", "readiness", {
    type: DataTypes.SMALLINT,
    allowNull: true,
  });

  await addColumnIfMissing(queryInterface, "technical_reports", "potential", {
    type: DataTypes.SMALLINT,
    allowNull: true,
  });

  await addColumnIfMissing(
    queryInterface,
    "technical_reports",
    "structured_content",
    {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "technical_reports",
    "structured_content",
  );
  await removeColumnIfPresent(queryInterface, "technical_reports", "potential");
  await removeColumnIfPresent(queryInterface, "technical_reports", "readiness");
  await removeColumnIfPresent(queryInterface, "technical_reports", "verdict");
  await removeColumnIfPresent(
    queryInterface,
    "technical_reports",
    "overall_score",
  );
  await removeColumnIfPresent(
    queryInterface,
    "technical_reports",
    "match_context",
  );
  await removeColumnIfPresent(
    queryInterface,
    "technical_reports",
    "report_type",
  );
}
