import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard
  let columns: Record<string, unknown>;
  try {
    columns = (await queryInterface.describeTable("players")) as Record<
      string,
      unknown
    >;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      console.log("Migration 159: players missing — skipping (fresh DB guard)");
      return;
    }
    throw err;
  }

  if ("player_package" in columns) {
    await queryInterface.changeColumn("players", "player_package", {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: "A",
    });
  }

  console.log(
    "Migration 159: players.player_package resized to VARCHAR(5) — now accepts A+/A/B+/B/C+/C",
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  try {
    const columns = (await queryInterface.describeTable("players")) as Record<
      string,
      unknown
    >;
    if ("player_package" in columns) {
      await queryInterface.changeColumn("players", "player_package", {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: "A",
      });
    }
  } catch {
    // tolerate
  }
  console.log("Migration 159: rolled back");
}
