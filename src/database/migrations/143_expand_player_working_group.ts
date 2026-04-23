import { QueryInterface } from "sequelize";

/**
 * Expands player_coach_assignments into the Working Group feature.
 *
 * Before: unique index on (player_id, coach_user_id, specialty) — the same
 * person could be assigned multiple times to one player under different
 * specialties, but two different people could not share the same specialty.
 *
 * After: unique index on (player_id, coach_user_id) — each person appears
 * at most once per player's working group, but multiple people can share
 * the same role label (e.g. two Analysts assigned to one player).
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_coach_assignments' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await queryInterface.removeIndex(
    "player_coach_assignments",
    "idx_pca_unique",
  );
  await queryInterface.addIndex(
    "player_coach_assignments",
    ["player_id", "coach_user_id"],
    { name: "idx_pca_unique_person", unique: true },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_coach_assignments' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await queryInterface.removeIndex(
    "player_coach_assignments",
    "idx_pca_unique_person",
  );
  await queryInterface.addIndex(
    "player_coach_assignments",
    ["player_id", "coach_user_id", "specialty"],
    { name: "idx_pca_unique", unique: true },
  );
}
