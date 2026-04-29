// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.teamSeasonStats.model.ts
//
// Persists Pulselive team-aggregate stats (196 metrics) per
// (club, comp_season). Created by migration 185.
// ─────────────────────────────────────────────────────────────

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface TeamSeasonStatsAttributes {
  id: string;
  clubId: string;
  pulseLiveTeamId: number;
  compSeasonId: number;
  seasonLabel: string;
  stats: Record<string, number>;
  providerSource: string;
  lastSyncedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TeamSeasonStatsCreationAttributes extends Optional<
  TeamSeasonStatsAttributes,
  "id" | "providerSource" | "lastSyncedAt" | "createdAt" | "updatedAt"
> {}

export class TeamSeasonStats
  extends Model<TeamSeasonStatsAttributes, TeamSeasonStatsCreationAttributes>
  implements TeamSeasonStatsAttributes
{
  declare id: string;
  declare clubId: string;
  declare pulseLiveTeamId: number;
  declare compSeasonId: number;
  declare seasonLabel: string;
  declare stats: Record<string, number>;
  declare providerSource: string;
  declare lastSyncedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TeamSeasonStats.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clubId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "club_id",
      references: { model: "clubs", key: "id" },
      onDelete: "CASCADE",
    },
    pulseLiveTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pulse_live_team_id",
    },
    compSeasonId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "comp_season_id",
    },
    seasonLabel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "season_label",
    },
    stats: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    providerSource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "pulselive",
      field: "provider_source",
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "last_synced_at",
    },
  },
  {
    sequelize,
    tableName: "team_season_stats",
    underscored: true,
    timestamps: true,
  },
);

export default TeamSeasonStats;
