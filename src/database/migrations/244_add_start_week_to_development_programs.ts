import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

// Adds a start_week offset to development_programs so multiple programs can be
// scheduled within one training cycle — overlapping week ranges render as
// concurrent lanes, back-to-back ranges as sequential phases. Nullable: legacy
// programs (and squad-wide templates) stay unscheduled until a coach sets it.

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(
    queryInterface,
    "development_programs",
    "start_week",
    {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
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
    "development_programs",
    "start_week",
  );
}
