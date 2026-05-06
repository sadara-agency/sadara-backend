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
  // Also guards agenda_goals since it depends on that table too.
  if (!(await tableExists(queryInterface, "users"))) return;
  if (!(await tableExists(queryInterface, "agenda_goals"))) return;

  await queryInterface.createTable("agenda_tasks", {
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
    goal_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "agenda_goals", key: "id" },
      onDelete: "SET NULL",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Open",
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "medium",
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    due_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "Asia/Riyadh",
    },
    rollover_policy: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "ask",
    },
    rollover_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    needs_rollover_decision: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    abandoned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    calendar_event_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "calendar_events", key: "id" },
      onDelete: "SET NULL",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
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
  await queryInterface.addIndex("agenda_tasks", ["user_id", "due_date"], {
    name: "idx_agenda_tasks_user_due",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex(
    "agenda_tasks",
    ["user_id", "status", "due_date"],
    { name: "idx_agenda_tasks_user_status_due" },
  );
  // migration-lint: disable-next-line
  await queryInterface.addIndex("agenda_tasks", ["goal_id"], {
    name: "idx_agenda_tasks_goal",
  });
  // migration-lint: disable-next-line
  await queryInterface.addIndex("agenda_tasks", ["calendar_event_id"], {
    name: "idx_agenda_tasks_calendar_event",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("agenda_tasks");
}
