import { QueryInterface, DataTypes } from "sequelize";

/**
 * Creates the player_coach_assignments join table to support multi-specialty
 * coach scoping. Previously, all 8 coach roles (Coach, SkillCoach, etc.)
 * were scoped through the single players.coach_id column, meaning only the
 * primary coach could access a player's data. This table allows any specialist
 * to be explicitly assigned to any player, replacing the single-FK scope check.
 *
 * Backfills the existing players.coach_id assignments as specialty = 'Coach'.
 * The coach_id column on players is retained for backward compatibility (used
 * by the player profile UI) but is no longer authoritative for row-scope.
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.createTable("player_coach_assignments", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      field: "player_id",
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    coachUserId: {
      type: DataTypes.UUID,
      field: "coach_user_id",
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    specialty: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment:
        "Matches UserRole value: Coach, SkillCoach, FitnessCoach, NutritionSpecialist, etc.",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  });

  await queryInterface.addIndex("player_coach_assignments", ["player_id"], {
    name: "idx_pca_player_id",
  });
  await queryInterface.addIndex("player_coach_assignments", ["coach_user_id"], {
    name: "idx_pca_coach_user_id",
  });
  await queryInterface.addIndex(
    "player_coach_assignments",
    ["player_id", "coach_user_id", "specialty"],
    { name: "idx_pca_unique", unique: true },
  );

  // Backfill: carry over the existing primary coach assignments
  await queryInterface.sequelize.query(`
    INSERT INTO player_coach_assignments (id, player_id, coach_user_id, specialty, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      id,
      coach_id,
      'Coach',
      NOW(),
      NOW()
    FROM players
    WHERE coach_id IS NOT NULL
    ON CONFLICT (player_id, coach_user_id, specialty) DO NOTHING;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.dropTable("player_coach_assignments");
}
