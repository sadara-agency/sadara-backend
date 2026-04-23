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
    `SELECT to_regclass('public.media_kit_generations') AS tbl`,
  );
  if (!(existing as any[])[0]?.tbl) {
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
  }

  const sq = queryInterface.sequelize;
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "media_kit_generations_player_id" ON "media_kit_generations" ("player_id")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "media_kit_generations_club_id" ON "media_kit_generations" ("club_id")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "media_kit_generations_generated_by" ON "media_kit_generations" ("generated_by")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "media_kit_generations_template_type" ON "media_kit_generations" ("template_type")`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("media_kit_generations");
}
