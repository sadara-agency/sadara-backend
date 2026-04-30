import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("designs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "draft",
    },
    format: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "square_1080",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "clubs", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    asset_url: { type: DataTypes.STRING(500), allowNull: true },
    asset_width: { type: DataTypes.INTEGER, allowNull: true },
    asset_height: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSONB, allowNull: true },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    published_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  if (await tableExists(queryInterface, "designs")) {
    await queryInterface.addIndex("designs", ["status"], {
      name: "idx_designs_status",
    });
    await queryInterface.addIndex("designs", ["type"], {
      name: "idx_designs_type",
    });
    await queryInterface.addIndex("designs", ["player_id"], {
      name: "idx_designs_player_id",
    });
    await queryInterface.addIndex("designs", ["match_id"], {
      name: "idx_designs_match_id",
    });
    await queryInterface.addIndex("designs", ["created_by"], {
      name: "idx_designs_created_by",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("designs");
}
