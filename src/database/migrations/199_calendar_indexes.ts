import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // sessions (responsible_id, session_date) — for scope-filtered session queries
  if (await tableExists(queryInterface, "sessions")) {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_responsible_date
        ON sessions (responsible_id, session_date)
    `);

    // sessions (player_id, session_date) — for assigned-player scope
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_player_date
        ON sessions (player_id, session_date)
    `);
  }

  // tasks (assigned_to, due_date) and (assigned_by, due_date) — for task scope
  if (await tableExists(queryInterface, "tasks")) {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_to_due_date
        ON tasks (assigned_to, due_date)
        WHERE due_date IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_by_due_date
        ON tasks (assigned_by, due_date)
        WHERE due_date IS NOT NULL
    `);
  }

  // referrals (assigned_to, due_date) and (created_by, due_date) — already likely partial
  if (await tableExists(queryInterface, "referrals")) {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_assigned_to_due_date
        ON referrals (assigned_to, due_date)
        WHERE due_date IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_created_by_due_date
        ON referrals (created_by, due_date)
        WHERE due_date IS NOT NULL
    `);
  }

  // contracts (end_date, status, player_id) — for contract deadline queries
  if (await tableExists(queryInterface, "contracts")) {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_end_date_status
        ON contracts (end_date, status)
        WHERE end_date IS NOT NULL
    `);
  }

  // player_coach_assignments (coach_user_id, status) — used by buildCalendarScope
  if (await tableExists(queryInterface, "player_coach_assignments")) {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pca_coach_status
        ON player_coach_assignments (coach_user_id, status)
    `);
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_sessions_responsible_date`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_sessions_player_date`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_tasks_assigned_to_due_date`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_tasks_assigned_by_due_date`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_referrals_assigned_to_due_date`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_referrals_created_by_due_date`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_contracts_end_date_status`,
  );
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_pca_coach_status`,
  );
}
