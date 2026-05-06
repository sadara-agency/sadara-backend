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

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: users is created by sequelize.sync() (--sync-first), not a migration.
  // On a bare CI DB this table won't exist yet — skip safely.
  if (!(await tableExists(queryInterface, "users"))) return;

  await queryInterface.createTable("agenda_goals", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    target_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    progress_mode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "task_count",
    },
    target_value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    current_value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    manual_percent: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

  // migration-lint: disable-next-line
  await queryInterface.addIndex("agenda_goals", ["user_id", "target_month"], {
    name: "idx_agenda_goals_user_month",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex("agenda_goals", ["user_id", "status"], {
    name: "idx_agenda_goals_user_status",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("agenda_goals");
}
