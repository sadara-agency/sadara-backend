import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Guard: don't run if match_players doesn't exist yet (fresh-DB CI)
  const mpExists = await tableExists(queryInterface, "match_players");
  if (!mpExists) return;

  await queryInterface.createTable("match_player_evaluations", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    match_player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "match_players", key: "id" },
      onDelete: "CASCADE",
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    analyst_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    overall_rating: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    fitness_scores: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    technical_scores: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    tactical_scores: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    contribution_scores: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    highlights: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mistakes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    weaknesses: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    needs_referral: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    referral_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "referrals", key: "id" },
      onDelete: "SET NULL",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Draft",
    },
    approval_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "approval_requests", key: "id" },
      onDelete: "SET NULL",
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    revision_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Indexes for common query patterns
  await queryInterface.addIndex("match_player_evaluations", ["player_id"], {
    name: "idx_mpe_player_id",
  });
  await queryInterface.addIndex("match_player_evaluations", ["match_id"], {
    name: "idx_mpe_match_id",
  });
  await queryInterface.addIndex("match_player_evaluations", ["analyst_id"], {
    name: "idx_mpe_analyst_id",
  });
  await queryInterface.addIndex("match_player_evaluations", ["status"], {
    name: "idx_mpe_status",
  });

  // Performance summary view — recomputed live from approved evaluations
  // avg_item() macro: average of all 5 fitness ratings (rating field of each JSONB item)
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW vw_player_performance_summary AS
    WITH approved AS (
      SELECT
        player_id,
        overall_rating,
        -- Fitness: average of 5 items
        ROUND((
          (fitness_scores->'strength'->>'rating')::numeric +
          (fitness_scores->'speed'->>'rating')::numeric +
          (fitness_scores->'agility'->>'rating')::numeric +
          (fitness_scores->'flexibility'->>'rating')::numeric +
          (fitness_scores->'endurance'->>'rating')::numeric
        ) / 5.0, 2) AS fitness_score,
        -- Technical: average of 14 items
        ROUND((
          (technical_scores->'dribbling'->>'rating')::numeric +
          (technical_scores->'passing'->>'rating')::numeric +
          (technical_scores->'insideKick'->>'rating')::numeric +
          (technical_scores->'outsideKick'->>'rating')::numeric +
          (technical_scores->'trappingAndReceiving'->>'rating')::numeric +
          (technical_scores->'heading'->>'rating')::numeric +
          (technical_scores->'chestControl'->>'rating')::numeric +
          (technical_scores->'thighControl'->>'rating')::numeric +
          (technical_scores->'ballAbsorption'->>'rating')::numeric +
          (technical_scores->'technicalAssimilation'->>'rating')::numeric +
          (technical_scores->'concentration'->>'rating')::numeric +
          (technical_scores->'quickThinking'->>'rating')::numeric +
          (technical_scores->'technicalCoordination'->>'rating')::numeric +
          (technical_scores->'reactionSpeed'->>'rating')::numeric
        ) / 14.0, 2) AS technical_score,
        -- Tactical: average of 6 items
        ROUND((
          (tactical_scores->'attacking'->>'rating')::numeric +
          (tactical_scores->'defending'->>'rating')::numeric +
          (tactical_scores->'positioning'->>'rating')::numeric +
          (tactical_scores->'movement'->>'rating')::numeric +
          (tactical_scores->'tactics'->>'rating')::numeric +
          (tactical_scores->'tacticalAssimilation'->>'rating')::numeric
        ) / 6.0, 2) AS tactical_score,
        -- Offensive (from contribution)
        ROUND((
          (contribution_scores->'offensivePerformance'->>'rating')::numeric +
          (contribution_scores->'successfulDribbles'->>'rating')::numeric +
          (contribution_scores->'keyPasses'->>'rating')::numeric +
          (contribution_scores->'shots'->>'rating')::numeric +
          (contribution_scores->'crosses'->>'rating')::numeric
        ) / 5.0, 2) AS offensive_score,
        -- Defensive (from contribution)
        ROUND((
          (contribution_scores->'defensivePerformance'->>'rating')::numeric +
          (contribution_scores->'tackles'->>'rating')::numeric +
          (contribution_scores->'ballRecovery'->>'rating')::numeric
        ) / 3.0, 2) AS defensive_score,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at DESC) AS rn
      FROM match_player_evaluations
      WHERE status = 'Approved'
    ),
    per_player AS (
      SELECT
        player_id,
        COUNT(*) AS total_evaluations,
        ROUND(AVG(overall_rating), 2) AS avg_overall_rating,
        ROUND(AVG(fitness_score), 2) AS avg_fitness_score,
        ROUND(AVG(technical_score), 2) AS avg_technical_score,
        ROUND(AVG(tactical_score), 2) AS avg_tactical_score,
        ROUND(AVG(offensive_score), 2) AS avg_offensive_score,
        ROUND(AVG(defensive_score), 2) AS avg_defensive_score,
        -- Last 5 average
        ROUND(AVG(overall_rating) FILTER (WHERE rn <= 5), 2) AS last5_avg_rating
      FROM approved
      GROUP BY player_id
    ),
    trend_calc AS (
      -- Compare last 3 vs previous 3 to determine trend
      SELECT
        player_id,
        ROUND(AVG(overall_rating) FILTER (WHERE rn <= 3), 2) AS last3_avg,
        ROUND(AVG(overall_rating) FILTER (WHERE rn BETWEEN 4 AND 6), 2) AS prev3_avg,
        -- Consecutive decline alert: last 3 all lower than their predecessor
        bool_and(
          overall_rating < LAG(overall_rating) OVER (PARTITION BY player_id ORDER BY created_at DESC)
        ) FILTER (WHERE rn <= 3) AS has_consecutive_decline
      FROM approved
      GROUP BY player_id
    )
    SELECT
      p.player_id,
      p.total_evaluations,
      p.avg_overall_rating,
      p.avg_fitness_score,
      p.avg_technical_score,
      p.avg_tactical_score,
      p.avg_offensive_score,
      p.avg_defensive_score,
      p.last5_avg_rating,
      CASE
        WHEN t.last3_avg IS NULL OR t.prev3_avg IS NULL THEN 'stable'
        WHEN t.last3_avg > t.prev3_avg + 0.3 THEN 'improving'
        WHEN t.last3_avg < t.prev3_avg - 0.3 THEN 'declining'
        ELSE 'stable'
      END AS performance_trend,
      COALESCE(t.has_consecutive_decline, false) AS decline_alert
    FROM per_player p
    LEFT JOIN trend_calc t ON t.player_id = p.player_id;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.sequelize.query(
    `DROP VIEW IF EXISTS vw_player_performance_summary`,
  );
  await queryInterface.dropTable("match_player_evaluations", { cascade: true });
}
