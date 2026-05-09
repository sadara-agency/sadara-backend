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
      comment: "0=Sunday … 6=Saturday; null when using freeform label only",
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
