import { QueryInterface, QueryTypes } from "sequelize";

/**
 * Migration 193
 *
 * Set pulse_live_comp_id for the two competitions served by the PulseLive API:
 *   Roshn Saudi League  → comp ID 72  (season ID 859)
 *   Yelo First Division → comp ID 219 (season ID 863)
 *
 * These IDs were verified against:
 *   GET https://api.saudi-pro-league.pulselive.com/football/competitions
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const tableRows = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'competitions'
       AND column_name = 'pulse_live_comp_id'
       AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  if (tableRows.length === 0) return;

  const mappings: { name: string; pulseLiveCompId: number }[] = [
    { name: "Roshn Saudi League", pulseLiveCompId: 72 },
    { name: "Yelo First Division", pulseLiveCompId: 219 },
  ];

  for (const { name, pulseLiveCompId } of mappings) {
    await queryInterface.sequelize.query(
      `UPDATE competitions
       SET pulse_live_comp_id = :pulseLiveCompId,
           updated_at = NOW()
       WHERE LOWER(name) = LOWER(:name)
         AND pulse_live_comp_id IS NULL`,
      { replacements: { pulseLiveCompId, name } },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(
    `UPDATE competitions
     SET pulse_live_comp_id = NULL
     WHERE name IN ('Roshn Saudi League', 'Yelo First Division')`,
  );
}
