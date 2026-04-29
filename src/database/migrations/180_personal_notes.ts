import { QueryInterface, DataTypes, QueryTypes } from "sequelize";

async function tableExists(
  queryInterface: QueryInterface,
  table: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [table] },
  );
  return row?.exists === true;
}

async function indexExists(
  queryInterface: QueryInterface,
  indexName: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [indexName] },
  );
  return row?.exists === true;
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: 000_baseline creates users via sync(); on a blank DB
  // users won't exist yet when this migration runs, so skip safely.
  if (!(await tableExists(queryInterface, "users"))) return;

  await queryInterface.createTable("personal_notes", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: "",
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bodyHtml: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "body_html",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_pinned",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  });

  if (!(await indexExists(queryInterface, "idx_personal_notes_user_id"))) {
    await queryInterface.addIndex("personal_notes", ["user_id"], {
      name: "idx_personal_notes_user_id",
    });
  }

  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_personal_notes_tags ON personal_notes USING GIN(tags)`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "personal_notes"))) return;
  await queryInterface.dropTable("personal_notes");
}
