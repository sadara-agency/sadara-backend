import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("social_media_posts", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    content_en: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    post_type: {
      type: DataTypes.ENUM(
        "match_day",
        "transfer",
        "injury_update",
        "achievement",
        "general",
        "custom",
      ),
      allowNull: false,
      defaultValue: "general",
    },
    platforms: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM("draft", "scheduled", "published", "archived"),
      allowNull: false,
      defaultValue: "draft",
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    calendar_event_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    match_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onDelete: "SET NULL",
    },
    image_urls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    created_by: {
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

  await queryInterface.addIndex("social_media_posts", ["status"]);
  await queryInterface.addIndex("social_media_posts", ["post_type"]);
  await queryInterface.addIndex("social_media_posts", ["scheduled_at"]);
  await queryInterface.addIndex("social_media_posts", ["player_id"]);
  await queryInterface.addIndex("social_media_posts", ["created_by"]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("social_media_posts");
}
