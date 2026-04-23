import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [guard] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
  );
  if ((guard as unknown[]).length === 0) return;

  const [existing] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public.media_contacts') AS tbl`,
  );
  if (!(existing as any[])[0]?.tbl) {
    await queryInterface.createTable("media_contacts", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      name_ar: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      outlet: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      outlet_ar: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
    `CREATE INDEX IF NOT EXISTS "media_contacts_outlet" ON "media_contacts" ("outlet")`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS "media_contacts_email" ON "media_contacts" ("email")`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("media_contacts");
}
