import { QueryInterface, DataTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Skip entirely on fresh-DB runs where the parent table hasn't been created yet.
  // The sessions table will be created by this migration whenever it runs on an
  // established DB; on a fresh DB the FK is enforced at the model level instead.
  if (!(await tableExists(queryInterface, "development_programs"))) return;

  await queryInterface.createTable("program_day_sessions", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "development_programs", key: "id" },
      onDelete: "CASCADE",
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    label_ar: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estimated_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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

  await addColumnIfMissing(
    queryInterface,
    "program_exercises",
    "day_session_id",
    {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "program_day_sessions", key: "id" },
      onDelete: "SET NULL",
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "program_exercises",
    "day_session_id",
  );

  if (await tableExists(queryInterface, "program_day_sessions")) {
    await queryInterface.dropTable("program_day_sessions");
  }
}
