import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("media_kit_generations", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    template_type: {
      type: DataTypes.ENUM("player_profile", "squad_roster"),
      allowNull: false,
    },
    language: {
      type: DataTypes.ENUM("en", "ar", "both"),
      allowNull: false,
      defaultValue: "both",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "clubs", key: "id" },
      onDelete: "SET NULL",
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    generated_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
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

  await queryInterface.addIndex("media_kit_generations", ["player_id"]);
  await queryInterface.addIndex("media_kit_generations", ["club_id"]);
  await queryInterface.addIndex("media_kit_generations", ["generated_by"]);
  await queryInterface.addIndex("media_kit_generations", ["template_type"]);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("media_kit_generations");
}
