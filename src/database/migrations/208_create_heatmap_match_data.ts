import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: parent tables (players, matches) must exist.
  const playersExists = await tableExists(queryInterface, "players");
  const matchesExists = await tableExists(queryInterface, "matches");
  if (!playersExists || !matchesExists) return;

  await queryInterface.createTable("heatmap_match_data", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    // Flat array [x1,y1,t1, x2,y2,t2, ...] — ~3x smaller than object form.
    positions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    sample_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    coordinate_system: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "normalized_0_100",
    },
    half: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "manual",
    },
    // 60×40 density grid, normalized 0–255. Recomputed on insert.
    precomputed_grid: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex("heatmap_match_data", ["player_id"], {
    name: "idx_heatmap_player_id",
  });
  await queryInterface.addIndex("heatmap_match_data", ["match_id"], {
    name: "idx_heatmap_match_id",
  });
  await queryInterface.addIndex(
    "heatmap_match_data",
    ["player_id", "match_id"],
    { name: "idx_heatmap_player_match" },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("heatmap_match_data", { cascade: true });
}
