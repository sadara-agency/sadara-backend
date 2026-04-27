import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'sessions'`,
  );
  if (!(tables as unknown[]).length) return;

  const [cols] = await queryInterface.sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='sessions' AND column_name='outcome_tags'`,
  );
  if (!(cols as unknown[]).length) {
    await queryInterface.addColumn("sessions", "outcome_tags", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'sessions'`,
  );
  if (!(tables as unknown[]).length) return;

  await queryInterface.removeColumn("sessions", "outcome_tags");
}
