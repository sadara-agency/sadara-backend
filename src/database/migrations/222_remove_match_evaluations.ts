import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    `DROP VIEW IF EXISTS vw_player_performance_summary;`,
  );
  await queryInterface.sequelize.query(
    `DROP TABLE IF EXISTS match_player_evaluations CASCADE;`,
  );
  await queryInterface.sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'matchEvaluations';`,
  );
  await queryInterface.sequelize.query(
    `DELETE FROM role_field_permissions WHERE module = 'matchEvaluations';`,
  );
  await queryInterface.sequelize.query(
    `DELETE FROM approvals WHERE entity_type = 'matchEvaluation';`,
  );
}

export async function down(_: { context: QueryInterface }) {
  // No-op — feature is intentionally removed. Migrations 204 and 205 remain
  // in history as the historical source if anyone needs to revive it.
}
