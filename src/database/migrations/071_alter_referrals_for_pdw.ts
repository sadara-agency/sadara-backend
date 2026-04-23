import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

/**
 * Migration 071: Alter referrals table for Player Development Workflow
 *
 * 1. Expand referral_type enum with 7 new values (Performance kept as legacy)
 * 2. Add Waiting + Closed statuses, migrate Resolved→Closed, Escalated→InProgress
 * 3. Add referral_target and closure_notes columns
 * 4. Rename resolved_at → closed_at
 * 5. Add composite index for duplicate detection
 */

export async function up() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // ── 1. Expand referral_type enum ──
  // Discover the actual enum type name
  const [typeRow] = await sequelize.query<{ typname: string }>(
    `SELECT t.typname FROM pg_type t
     JOIN pg_attribute a ON a.atttypid = t.oid
     JOIN pg_class c ON a.attrelid = c.oid
     WHERE c.relname = 'referrals' AND a.attname = 'referral_type' AND t.typtype = 'e'`,
    { type: QueryTypes.SELECT },
  );

  if (typeRow) {
    const tn = typeRow.typname;
    await sequelize.query(
      `ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'Physical'`,
    );
    await sequelize.query(`ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'Skill'`);
    await sequelize.query(
      `ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'Tactical'`,
    );
    await sequelize.query(
      `ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'Nutrition'`,
    );
    await sequelize.query(
      `ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'Administrative'`,
    );
    await sequelize.query(
      `ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'SportDecision'`,
    );
    await sequelize.query(
      `ALTER TYPE "${tn}" ADD VALUE IF NOT EXISTS 'Goalkeeper'`,
    );
  }

  // ── 2. Expand status enum ──
  const [statusRow] = await sequelize.query<{ typname: string }>(
    `SELECT t.typname FROM pg_type t
     JOIN pg_attribute a ON a.atttypid = t.oid
     JOIN pg_class c ON a.attrelid = c.oid
     WHERE c.relname = 'referrals' AND a.attname = 'status' AND t.typtype = 'e'`,
    { type: QueryTypes.SELECT },
  );

  if (statusRow) {
    const sn = statusRow.typname;
    await sequelize.query(
      `ALTER TYPE "${sn}" ADD VALUE IF NOT EXISTS 'Waiting'`,
    );
    await sequelize.query(
      `ALTER TYPE "${sn}" ADD VALUE IF NOT EXISTS 'Closed'`,
    );
  }

  // Migrate existing data
  await sequelize.query(
    `UPDATE referrals SET status = 'Closed' WHERE status = 'Resolved'`,
  );
  await sequelize.query(
    `UPDATE referrals SET status = 'InProgress' WHERE status = 'Escalated'`,
  );

  // ── 3. Add new columns ──
  await sequelize.query(
    `ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_target VARCHAR(50)`,
  );
  await sequelize.query(
    `ALTER TABLE referrals ADD COLUMN IF NOT EXISTS closure_notes TEXT`,
  );

  // ── 4. Rename resolved_at → closed_at ──
  // On fresh DBs, model sync already creates closed_at (no resolved_at exists).
  // On existing DBs, resolved_at exists and needs renaming.
  const [resolvedCol] = await sequelize.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'referrals' AND column_name = 'resolved_at'`,
    { type: QueryTypes.SELECT },
  );
  const [closedCol] = await sequelize.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'referrals' AND column_name = 'closed_at'`,
    { type: QueryTypes.SELECT },
  );

  if (resolvedCol && !closedCol) {
    // Existing DB: rename the column
    await sequelize.query(
      `ALTER TABLE referrals RENAME COLUMN resolved_at TO closed_at`,
    );
  } else if (resolvedCol && closedCol) {
    // Both exist (model sync created closed_at, resolved_at from old migration):
    // copy data then drop old column
    await sequelize.query(
      `UPDATE referrals SET closed_at = resolved_at WHERE resolved_at IS NOT NULL AND closed_at IS NULL`,
    );
    await sequelize.query(`ALTER TABLE referrals DROP COLUMN resolved_at`);
  }
  // If only closed_at exists (fresh DB): nothing to do

  // ── 5. Add indexes ──
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_referrals_target ON referrals(referral_target);
    CREATE INDEX IF NOT EXISTS idx_referrals_player_type_status ON referrals(player_id, referral_type, status);
  `);
}

export async function down() {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Rename closed_at back to resolved_at
  const [closedCol] = await sequelize.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'referrals' AND column_name = 'closed_at'`,
    { type: QueryTypes.SELECT },
  );

  if (closedCol) {
    await sequelize.query(
      `ALTER TABLE referrals RENAME COLUMN closed_at TO resolved_at`,
    );
  }

  // Revert data migration
  await sequelize.query(
    `UPDATE referrals SET status = 'Resolved' WHERE status = 'Closed'`,
  );

  // Drop new columns
  await sequelize.query(
    `ALTER TABLE referrals DROP COLUMN IF EXISTS referral_target`,
  );
  await sequelize.query(
    `ALTER TABLE referrals DROP COLUMN IF EXISTS closure_notes`,
  );

  // Drop indexes
  await sequelize.query(`DROP INDEX IF EXISTS idx_referrals_target`);
  await sequelize.query(
    `DROP INDEX IF EXISTS idx_referrals_player_type_status`,
  );
}
