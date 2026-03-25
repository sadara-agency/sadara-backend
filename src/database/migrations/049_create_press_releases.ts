import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("press_releases", {
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
    slug: {
      type: DataTypes.STRING(500),
      allowNull: true,
      unique: true,
    },
    category: {
      type: DataTypes.ENUM(
        "transfer",
        "injury",
        "achievement",
        "announcement",
        "general",
      ),
      allowNull: false,
      defaultValue: "general",
    },
    content_en: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    excerpt_en: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    excerpt_ar: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    cover_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "review",
        "approved",
        "published",
        "archived",
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
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

  await queryInterface.addIndex("press_releases", ["status"]);
  await queryInterface.addIndex("press_releases", ["category"]);
  await queryInterface.addIndex("press_releases", ["player_id"]);
  await queryInterface.addIndex("press_releases", ["published_at"]);
  await queryInterface.addIndex("press_releases", ["slug"], { unique: true });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("press_releases");
}
