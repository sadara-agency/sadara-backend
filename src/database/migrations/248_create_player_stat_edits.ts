import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Guard: skip on fresh-DB CI runs where parent tables don't exist yet
  if (!(await tableExists(queryInterface, "players"))) return;

  await queryInterface.createTable("player_stat_edits", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    season: { type: DataTypes.STRING(10), allowNull: false },
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onDelete: "SET NULL",
    },
    analyst_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    field_name: { type: DataTypes.STRING(50), allowNull: false },
    before_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    after_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    delta: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    justification: { type: DataTypes.TEXT, allowNull: false },
    is_correction: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ip_address: { type: DataTypes.STRING(64), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("player_stat_edits", {
    name: "idx_player_stat_edits_lookup",
    fields: ["player_id", "season", { name: "created_at", order: "DESC" }],
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("player_stat_edits");
}
