import { QueryInterface, DataTypes, Sequelize } from "sequelize";

const TARGETS: Array<{ table: string; index: string }> = [
  { table: "players", index: "players_external_ref_idx" },
  { table: "referrals", index: "referrals_external_ref_idx" },
  { table: "sessions", index: "sessions_external_ref_idx" },
  { table: "player_journeys", index: "player_journeys_external_ref_idx" },
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  for (const { table, index } of TARGETS) {
    let columns: Record<string, unknown>;
    try {
      columns = (await queryInterface.describeTable(table)) as Record<
        string,
        unknown
      >;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("does not exist") ||
        msg.includes("No description found")
      ) {
        console.log(`Migration 162: ${table} missing — skipping`);
        continue;
      }
      throw err;
    }

    if (!("external_ref" in columns)) {
      await queryInterface.addColumn(table, "external_ref", {
        type: DataTypes.STRING(255),
        allowNull: true,
      });

      await seq.query(
        `CREATE INDEX IF NOT EXISTS ${index} ON ${table} (external_ref) WHERE external_ref IS NOT NULL`,
      );

      console.log(`Migration 162: ${table}.external_ref added`);
    } else {
      console.log(`Migration 162: ${table}.external_ref already exists — skip`);
    }
  }

  console.log("Migration 162: external_ref columns done");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  for (const { table, index } of TARGETS) {
    try {
      await seq.query(`DROP INDEX IF EXISTS ${index}`);
      await queryInterface.removeColumn(table, "external_ref");
    } catch {
      // tolerate
    }
  }
  console.log("Migration 162: rolled back");
}
