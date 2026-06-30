import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

// Requirement reversal: keep "Amateur", drop "Youth". Player/contract types are
// now Pro/Amateur (player_type) and Professional/Amateur (player_contract_type).
// Columns are already VARCHAR(50) (migration 265), so no type change is needed —
// only backfill any existing Youth rows to Amateur before the value disappears
// from the app.

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (await tableExists(queryInterface, "players")) {
    await queryInterface.sequelize.query(
      `UPDATE players SET player_type = 'Amateur' WHERE player_type = 'Youth'`,
    );
  }
  if (await tableExists(queryInterface, "contracts")) {
    await queryInterface.sequelize.query(
      `UPDATE contracts SET player_contract_type = 'Amateur' WHERE player_contract_type = 'Youth'`,
    );
  }
}

export async function down(): Promise<void> {
  // Irreversible: original Youth/Amateur split is not recoverable after merge.
}
