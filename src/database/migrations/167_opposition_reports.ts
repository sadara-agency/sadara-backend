import { QueryInterface, DataTypes } from "sequelize";

async function tableExists(
  queryInterface: QueryInterface,
  tableName: string,
): Promise<boolean> {
  const tables = await queryInterface.showAllTables();
  return (tables as string[]).includes(tableName);
}

async function indexExists(
  queryInterface: QueryInterface,
  tableName: string,
  indexName: string,
): Promise<boolean> {
  const indexes = await queryInterface.showIndex(tableName);
  return (indexes as { name: string }[]).some((i) => i.name === indexName);
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "opposition_reports")) return;

  await queryInterface.createTable("opposition_reports", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    opponent_name: { type: DataTypes.STRING(120), allowNull: false },
    opponent_name_ar: { type: DataTypes.STRING(120), allowNull: true },
    match_id: { type: DataTypes.UUID, allowNull: true },
    match_date: { type: DataTypes.DATEONLY, allowNull: true },
    formation: { type: DataTypes.STRING(20), allowNull: true },
    pressing_intensity: { type: DataTypes.STRING(20), allowNull: true },
    defensive_shape: { type: DataTypes.STRING(30), allowNull: true },
    key_threats: { type: DataTypes.JSONB, allowNull: true },
    set_piece_tendencies: { type: DataTypes.JSONB, allowNull: true },
    analyst_notes: { type: DataTypes.TEXT, allowNull: true },
    analyst_notes_ar: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
    analyst_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  if (
    !(await indexExists(
      queryInterface,
      "opposition_reports",
      "idx_opp_reports_analyst",
    ))
  ) {
    await queryInterface.addIndex("opposition_reports", ["analyst_id"], {
      name: "idx_opp_reports_analyst",
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "opposition_reports",
      "idx_opp_reports_status",
    ))
  ) {
    await queryInterface.addIndex("opposition_reports", ["status"], {
      name: "idx_opp_reports_status",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("opposition_reports");
}
