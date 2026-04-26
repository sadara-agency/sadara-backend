import { QueryInterface, DataTypes, QueryTypes } from "sequelize";

async function sessionsTableExists(
  queryInterface: QueryInterface,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'sessions'
     ) AS exists`,
    { type: QueryTypes.SELECT },
  );
  return row?.exists === true;
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: 000_baseline assumes pre-existing tables. On fresh CI the
  // sessions table is created by a later migration in the chain — skip cleanly
  // here and let that migration include the new columns when it runs.
  if (!(await sessionsTableExists(queryInterface))) return;

  await queryInterface.addColumn("sessions", "match_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "matches", key: "id" },
    onDelete: "SET NULL",
  });

  await queryInterface.addColumn("sessions", "rating", {
    type: DataTypes.SMALLINT,
    allowNull: true,
  });

  await queryInterface.addColumn("sessions", "video_timestamps", {
    type: DataTypes.JSONB,
    allowNull: true,
  });

  await queryInterface.addIndex("sessions", ["match_id"], {
    name: "sessions_match_id_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await sessionsTableExists(queryInterface))) return;
  await queryInterface.removeIndex("sessions", "sessions_match_id_idx");
  await queryInterface.removeColumn("sessions", "video_timestamps");
  await queryInterface.removeColumn("sessions", "rating");
  await queryInterface.removeColumn("sessions", "match_id");
}
