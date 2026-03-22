// ═══════════════════════════════════════════════════════════════
// Migration 039: Add indexes for row-level scoping subqueries
//
// These indexes support the row-scope WHERE clauses that filter
// by coach_id, analyst_id, agent_id, and created_by on players,
// plus created_by on contracts and offers.
//
// All indexes use IF NOT EXISTS for idempotency.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_players_coach_id
   ON players (coach_id)`,

  `CREATE INDEX IF NOT EXISTS idx_players_analyst_id
   ON players (analyst_id)`,

  `CREATE INDEX IF NOT EXISTS idx_players_agent_id
   ON players (agent_id)`,

  `CREATE INDEX IF NOT EXISTS idx_players_created_by
   ON players (created_by)`,

  `CREATE INDEX IF NOT EXISTS idx_contracts_created_by
   ON contracts (created_by)`,

  `CREATE INDEX IF NOT EXISTS idx_offers_created_by
   ON offers (created_by)`,
];

export async function up() {
  const tx = await sequelize.transaction();
  try {
    for (const sql of INDEXES) {
      await sequelize.query(sql, { transaction: tx });
    }
    await tx.commit();
    console.log("Migration 039: Row-scope indexes created");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down() {
  const tx = await sequelize.transaction();
  try {
    await sequelize.query(
      `DROP INDEX IF EXISTS idx_players_coach_id;
       DROP INDEX IF EXISTS idx_players_analyst_id;
       DROP INDEX IF EXISTS idx_players_agent_id;
       DROP INDEX IF EXISTS idx_players_created_by;
       DROP INDEX IF EXISTS idx_contracts_created_by;
       DROP INDEX IF EXISTS idx_offers_created_by;`,
      { transaction: tx },
    );
    await tx.commit();
    console.log("Migration 039: Row-scope indexes dropped");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
