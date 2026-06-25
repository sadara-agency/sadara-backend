import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("performances", {
    id: {
      type: `UUID DEFAULT gen_random_uuid()` as unknown as DataTypes.DataType,
      primaryKey: true,
      allowNull: false,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    average_rating: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    },
    goals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    assists: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    key_passes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    successful_dribbles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 90,
    },
    created_at: {
      type: `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` as unknown as DataTypes.DataType,
      allowNull: false,
    },
    updated_at: {
      type: `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` as unknown as DataTypes.DataType,
      allowNull: false,
    },
  });

  await queryInterface.addIndex("performances", ["player_id"]);
  await queryInterface.addIndex("performances", ["match_id"]);
  await queryInterface.addIndex("performances", ["player_id", "match_id"], {
    name: "performances_player_match_unique",
    unique: true,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("performances");
}
