import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("positional_benchmarks", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    position: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    league: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "e.g. 2024-25",
    },
    stat: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "e.g. goals, passAccuracy, duelWinRate",
    },
    avg_value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    },
    p75_value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    },
    p90_value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    },
    sample_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "internal",
      comment: "internal | sportmonks | manual",
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "positional_benchmarks",
    ["position", "league", "season", "stat"],
    {
      name: "positional_benchmarks_unique_idx",
      unique: true,
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("positional_benchmarks");
}
