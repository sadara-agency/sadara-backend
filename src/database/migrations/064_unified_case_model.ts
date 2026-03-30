import { sequelize } from "@config/database";

/**
 * Migration 064: Unified Case Model
 *
 * Backfills a Medical referral (case) for every injury that doesn't have one.
 * Adds a unique index on referrals.injury_id to enforce one case per injury.
 *
 * This is the foundation for the unified Player Care workflow where:
 * - The referral table acts as the "case" (workflow wrapper)
 * - The injury table acts as "medical detail" attached to Medical cases
 */

export async function up() {
  // 1. Backfill: create a Medical referral for every injury without one
  await sequelize.query(`
    INSERT INTO referrals (
      id, referral_type, player_id, injury_id,
      trigger_desc, is_auto_generated, status, priority,
      created_by, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      'Medical',
      i.player_id,
      i.id,
      'Auto-migrated: ' || i.injury_type || ' — ' || i.body_part,
      true,
      (CASE
        WHEN i.status = 'Recovered' THEN 'Resolved'
        WHEN i.status = 'Chronic'   THEN 'InProgress'
        ELSE 'Open'
      END)::"enum_referrals_status",
      (CASE
        WHEN i.severity = 'Critical' THEN 'Critical'
        WHEN i.severity = 'Severe'   THEN 'High'
        WHEN i.severity = 'Moderate' THEN 'Medium'
        ELSE 'Low'
      END)::"enum_referrals_priority",
      i.created_by,
      i.created_at,
      i.updated_at
    FROM injuries i
    WHERE NOT EXISTS (
      SELECT 1 FROM referrals r WHERE r.injury_id = i.id
    )
  `);

  // 2. Set resolved_at for migrated recovered injuries
  await sequelize.query(`
    UPDATE referrals r
    SET resolved_at = i.actual_return_date::timestamp
    FROM injuries i
    WHERE r.injury_id = i.id
      AND r.status = 'Resolved'
      AND r.resolved_at IS NULL
      AND i.actual_return_date IS NOT NULL
  `);

  // 3. Enforce one case per injury (unique partial index)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_injury_id_unique
    ON referrals(injury_id)
    WHERE injury_id IS NOT NULL
  `);
}

export async function down() {
  // Remove the unique index
  await sequelize.query(`DROP INDEX IF EXISTS idx_referrals_injury_id_unique`);

  // Remove auto-migrated referrals
  await sequelize.query(`
    DELETE FROM referrals
    WHERE is_auto_generated = true
      AND trigger_desc LIKE 'Auto-migrated:%'
  `);
}
