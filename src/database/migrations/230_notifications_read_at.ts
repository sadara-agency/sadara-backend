import { QueryInterface, DataTypes, QueryTypes } from "sequelize";
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
  await addColumnIfMissing(queryInterface, "notifications", "read_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "notifications", "updated_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  if (await tableExists(queryInterface, "notifications")) {
    await queryInterface.sequelize.query(
      `UPDATE notifications SET updated_at = created_at WHERE updated_at IS NULL;`,
      { type: QueryTypes.RAW },
    );
    // Backfill read_at for already-read rows so the column is meaningful.
    await queryInterface.sequelize.query(
      `UPDATE notifications SET read_at = created_at WHERE is_read = true AND read_at IS NULL;`,
      { type: QueryTypes.RAW },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "notifications", "read_at");
  await removeColumnIfPresent(queryInterface, "notifications", "updated_at");
}
