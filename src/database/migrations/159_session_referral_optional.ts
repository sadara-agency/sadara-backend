// ═══════════════════════════════════════════════════════════════
// Migration 159: sessions.referral_id is now optional
//
// Sessions can be created standalone (no triggering referral / ticket).
// Drops the NOT NULL constraint on sessions.referral_id so the FK
// column can hold NULL. The FK reference itself is preserved so
// non-null values still cascade-delete with their referral.
// ═══════════════════════════════════════════════════════════════

import { QueryInterface, Sequelize } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Fresh-DB guard — sessions table is created in migration 070.
  let columns: Record<string, unknown>;
  try {
    columns = (await queryInterface.describeTable("sessions")) as Record<
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
        "Migration 159: sessions missing — skipping (fresh DB guard)",
      );
      return;
    }
    throw err;
  }

  if (!("referral_id" in columns)) {
    console.log("Migration 159: sessions.referral_id missing — skipping");
    return;
  }

  await seq.query(
    `ALTER TABLE sessions ALTER COLUMN referral_id DROP NOT NULL`,
  );

  console.log("Migration 159: sessions.referral_id is now nullable");
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const seq = (queryInterface as unknown as { sequelize: Sequelize }).sequelize;

  // Re-applying NOT NULL will fail loudly if any standalone sessions
  // (referral_id IS NULL) exist — that is the correct signal to the
  // operator to either delete or backfill those rows before rollback.
  await seq.query(`ALTER TABLE sessions ALTER COLUMN referral_id SET NOT NULL`);

  console.log("Migration 159: rolled back — sessions.referral_id is NOT NULL");
}
