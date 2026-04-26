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

async function columnExists(
  queryInterface: QueryInterface,
  table: string,
  column: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [table, column] },
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
  // Fresh-DB guard: 000_baseline assumes pre-existing tables. On fresh CI the
  // sessions table is built from the Sequelize model via sync(), which already
  // includes these columns — so each addColumn must be idempotent.
  if (!(await tableExists(queryInterface, "sessions"))) return;

  if (!(await columnExists(queryInterface, "sessions", "match_id"))) {
    await queryInterface.addColumn("sessions", "match_id", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "matches", key: "id" },
      onDelete: "SET NULL",
    });
  }

  if (!(await columnExists(queryInterface, "sessions", "rating"))) {
    await queryInterface.addColumn("sessions", "rating", {
      type: DataTypes.SMALLINT,
      allowNull: true,
    });
  }

  if (!(await columnExists(queryInterface, "sessions", "video_timestamps"))) {
    await queryInterface.addColumn("sessions", "video_timestamps", {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  }

  if (!(await indexExists(queryInterface, "sessions_match_id_idx"))) {
    await queryInterface.addIndex("sessions", ["match_id"], {
      name: "sessions_match_id_idx",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "sessions"))) return;

  if (await indexExists(queryInterface, "sessions_match_id_idx")) {
    await queryInterface.removeIndex("sessions", "sessions_match_id_idx");
  }
  if (await columnExists(queryInterface, "sessions", "video_timestamps")) {
    await queryInterface.removeColumn("sessions", "video_timestamps");
  }
  if (await columnExists(queryInterface, "sessions", "rating")) {
    await queryInterface.removeColumn("sessions", "rating");
  }
  if (await columnExists(queryInterface, "sessions", "match_id")) {
    await queryInterface.removeColumn("sessions", "match_id");
  }
}
