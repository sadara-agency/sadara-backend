import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;
  const [rows] = await sq.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'watchlists' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await sq.query(`
    CREATE TABLE IF NOT EXISTS scoring_cards (
      id                  UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      watchlist_id        UUID          NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
      window_id           UUID          NOT NULL REFERENCES transfer_windows(id) ON DELETE CASCADE,
      performance_score   INTEGER,
      contract_fit_score  INTEGER,
      commercial_score    INTEGER,
      cultural_fit_score  INTEGER,
      criteria_scores     JSONB,
      notes               TEXT,
      weighted_total      DECIMAL(5,2),
      is_shortlisted      BOOLEAN       NOT NULL DEFAULT false,
      scored_by           UUID,
      scored_at           TIMESTAMPTZ,
      created_at          TIMESTAMPTZ   NOT NULL,
      updated_at          TIMESTAMPTZ   NOT NULL,
      CONSTRAINT scoring_cards_watchlist_window_unique UNIQUE (watchlist_id, window_id)
    );
  `);

  await sq.query(
    `CREATE INDEX IF NOT EXISTS scoring_cards_window_id ON scoring_cards (window_id);`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS scoring_cards_is_shortlisted ON scoring_cards (is_shortlisted);`,
  );
  await sq.query(
    `CREATE INDEX IF NOT EXISTS scoring_cards_weighted_total ON scoring_cards (weighted_total);`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("scoring_cards");
}
