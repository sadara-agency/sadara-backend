import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  let columns: Record<string, unknown>;
  try {
    columns = (await queryInterface.describeTable("referrals")) as Record<
      string,
      unknown
    >;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      console.log(
        "Migration 160: referrals missing — skipping (fresh DB guard)",
      );
      return;
    }
    throw err;
  }

  if (!("receiving_party" in columns)) {
    await queryInterface.addColumn("referrals", "receiving_party", {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
  }

  console.log("Migration 160: referrals.receiving_party column added");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  try {
    await queryInterface.removeColumn("referrals", "receiving_party");
  } catch {
    // tolerate
  }
  console.log("Migration 160: rolled back");
}
