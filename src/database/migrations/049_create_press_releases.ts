import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [guard] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((guard as unknown[]).length === 0) return;

  const [existing] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public.press_releases') AS tbl`,
  );
  if (!(existing as any[])[0]?.tbl) {
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
  }

  const sq = queryInterface.sequelize;
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "press_releases_status" ON "press_releases" ("status")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "press_releases_category" ON "press_releases" ("category")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "press_releases_player_id" ON "press_releases" ("player_id")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "press_releases_published_at" ON "press_releases" ("published_at")`,
  );
  await sq.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "press_releases_slug" ON "press_releases" ("slug")`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("press_releases");
}
