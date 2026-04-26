import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Fresh-DB guard: skip if referrals table doesn't exist yet
  try {
    await queryInterface.describeTable("referrals");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("No description found")
    ) {
      console.log(
        "Migration 161: referrals missing — skipping (fresh DB guard)",
      );
      return;
    }
    throw err;
  }

  const tables = await queryInterface.showAllTables();
  if (!tables.includes("case_assignees")) {
    await queryInterface.createTable("case_assignees", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      referral_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "referrals", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "support",
        comment: "primary | support | observer",
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex("case_assignees", ["referral_id"], {
      name: "case_assignees_referral_idx",
    });
    await queryInterface.addIndex(
      "case_assignees",
      ["referral_id", "user_id"],
      {
        name: "case_assignees_unique_idx",
        unique: true,
      },
    );
  }

  console.log("Migration 161: case_assignees table created");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  try {
    await queryInterface.dropTable("case_assignees");
  } catch {
    // tolerate
  }
  console.log("Migration 161: rolled back");
}
