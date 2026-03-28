// ─────────────────────────────────────────────────────────────
// SPL Intelligence Models
//
// Three models powering the scouting intelligence engine:
// - SplCompetition: multi-league registry
// - SplInsight: auto-discovered scouting intelligence
// - SplTrackedPlayer: manual player monitoring per user
// ─────────────────────────────────────────────────────────────

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ══════════════════════════════════════════
// SPL COMPETITION
// ══════════════════════════════════════════

export interface SplCompetitionAttributes {
  id: string;
  pulseliveCompId: number;
  pulseliveSeasonId: number;
  name: string;
  nameAr?: string | null;
  tier?: string | null;
  isActive: boolean;
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SplCompetitionCreation extends Optional<
  SplCompetitionAttributes,
  | "id"
  | "nameAr"
  | "tier"
  | "isActive"
  | "lastSyncedAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SplCompetition
  extends Model<SplCompetitionAttributes, SplCompetitionCreation>
  implements SplCompetitionAttributes
{
  declare id: string;
  declare pulseliveCompId: number;
  declare pulseliveSeasonId: number;
  declare name: string;
  declare nameAr: string | null;
  declare tier: string | null;
  declare isActive: boolean;
  declare lastSyncedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SplCompetition.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    pulseliveCompId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "pulselive_comp_id",
    },
    pulseliveSeasonId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pulselive_season_id",
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), field: "name_ar" },
    tier: { type: DataTypes.STRING(50), defaultValue: "premier" },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    lastSyncedAt: { type: DataTypes.DATE, field: "last_synced_at" },
  },
  {
    sequelize,
    tableName: "spl_competitions",
    underscored: true,
    timestamps: true,
  },
);

// ══════════════════════════════════════════
// SPL INSIGHT
// ══════════════════════════════════════════

export type InsightType =
  | "rising_star"
  | "form_surge"
  | "hidden_gem"
  | "defensive_rock"
  | "available_soon";

export interface SplInsightAttributes {
  id: string;
  competitionId?: string | null;
  insightType: InsightType;
  pulselivePlayerId: number;
  playerName: string;
  teamName?: string | null;
  position?: string | null;
  nationality?: string | null;
  age?: number | null;
  headline: string;
  headlineAr?: string | null;
  details: Record<string, unknown>;
  score: number;
  watchlistId?: string | null;
  isDismissed: boolean;
  detectedAt: Date;
  expiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SplInsightCreation extends Optional<
  SplInsightAttributes,
  | "id"
  | "competitionId"
  | "teamName"
  | "position"
  | "nationality"
  | "age"
  | "headlineAr"
  | "score"
  | "watchlistId"
  | "isDismissed"
  | "detectedAt"
  | "expiresAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SplInsight
  extends Model<SplInsightAttributes, SplInsightCreation>
  implements SplInsightAttributes
{
  declare id: string;
  declare competitionId: string | null;
  declare insightType: InsightType;
  declare pulselivePlayerId: number;
  declare playerName: string;
  declare teamName: string | null;
  declare position: string | null;
  declare nationality: string | null;
  declare age: number | null;
  declare headline: string;
  declare headlineAr: string | null;
  declare details: Record<string, unknown>;
  declare score: number;
  declare watchlistId: string | null;
  declare isDismissed: boolean;
  declare detectedAt: Date;
  declare expiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SplInsight.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    competitionId: {
      type: DataTypes.UUID,
      field: "competition_id",
      references: { model: "spl_competitions", key: "id" },
    },
    insightType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "insight_type",
    },
    pulselivePlayerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pulselive_player_id",
    },
    playerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "player_name",
    },
    teamName: { type: DataTypes.STRING(255), field: "team_name" },
    position: { type: DataTypes.STRING(50) },
    nationality: { type: DataTypes.STRING(100) },
    age: { type: DataTypes.INTEGER },
    headline: { type: DataTypes.STRING(500), allowNull: false },
    headlineAr: { type: DataTypes.STRING(500), field: "headline_ar" },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    watchlistId: {
      type: DataTypes.UUID,
      field: "watchlist_id",
      references: { model: "watchlists", key: "id" },
    },
    isDismissed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_dismissed",
    },
    detectedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "detected_at",
    },
    expiresAt: { type: DataTypes.DATE, field: "expires_at" },
  },
  {
    sequelize,
    tableName: "spl_insights",
    underscored: true,
    timestamps: true,
  },
);

// ══════════════════════════════════════════
// SPL TRACKED PLAYER
// ══════════════════════════════════════════

export interface SplTrackedPlayerAttributes {
  id: string;
  userId: string;
  competitionId?: string | null;
  pulselivePlayerId: number;
  playerName: string;
  teamName?: string | null;
  position?: string | null;
  nationality?: string | null;
  lastStatsSnapshot?: Record<string, unknown> | null;
  previousStatsSnapshot?: Record<string, unknown> | null;
  alertConfig: Record<string, unknown>;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SplTrackedPlayerCreation extends Optional<
  SplTrackedPlayerAttributes,
  | "id"
  | "competitionId"
  | "teamName"
  | "position"
  | "nationality"
  | "lastStatsSnapshot"
  | "previousStatsSnapshot"
  | "alertConfig"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class SplTrackedPlayer
  extends Model<SplTrackedPlayerAttributes, SplTrackedPlayerCreation>
  implements SplTrackedPlayerAttributes
{
  declare id: string;
  declare userId: string;
  declare competitionId: string | null;
  declare pulselivePlayerId: number;
  declare playerName: string;
  declare teamName: string | null;
  declare position: string | null;
  declare nationality: string | null;
  declare lastStatsSnapshot: Record<string, unknown> | null;
  declare previousStatsSnapshot: Record<string, unknown> | null;
  declare alertConfig: Record<string, unknown>;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SplTrackedPlayer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: { model: "users", key: "id" },
    },
    competitionId: {
      type: DataTypes.UUID,
      field: "competition_id",
      references: { model: "spl_competitions", key: "id" },
    },
    pulselivePlayerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pulselive_player_id",
    },
    playerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "player_name",
    },
    teamName: { type: DataTypes.STRING(255), field: "team_name" },
    position: { type: DataTypes.STRING(50) },
    nationality: { type: DataTypes.STRING(100) },
    lastStatsSnapshot: {
      type: DataTypes.JSONB,
      field: "last_stats_snapshot",
    },
    previousStatsSnapshot: {
      type: DataTypes.JSONB,
      field: "previous_stats_snapshot",
    },
    alertConfig: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: "alert_config",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "spl_tracked_players",
    underscored: true,
    timestamps: true,
  },
);
