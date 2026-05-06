import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type HeatmapHalf = "first" | "second";
export type HeatmapCoordinateSystem = "normalized_0_100" | "meters";

export interface HeatmapAttributes {
  id: string;
  playerId: string;
  matchId: string | null;
  /** Flat array of [x1, y1, t1, x2, y2, t2, ...]. */
  positions: number[];
  sampleCount: number;
  durationSeconds: number | null;
  coordinateSystem: HeatmapCoordinateSystem;
  half: HeatmapHalf | null;
  source: string;
  /** 60×40 density grid, normalized 0–255. Stored row-major as number[][]. */
  precomputedGrid: number[][] | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HeatmapCreationAttributes extends Optional<
  HeatmapAttributes,
  | "id"
  | "matchId"
  | "durationSeconds"
  | "coordinateSystem"
  | "half"
  | "source"
  | "precomputedGrid"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class HeatmapMatchData
  extends Model<HeatmapAttributes, HeatmapCreationAttributes>
  implements HeatmapAttributes
{
  declare id: string;
  declare playerId: string;
  declare matchId: string | null;
  declare positions: number[];
  declare sampleCount: number;
  declare durationSeconds: number | null;
  declare coordinateSystem: HeatmapCoordinateSystem;
  declare half: HeatmapHalf | null;
  declare source: string;
  declare precomputedGrid: number[][] | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

HeatmapMatchData.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "match_id",
    },
    positions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    sampleCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sample_count",
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "duration_seconds",
    },
    coordinateSystem: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "normalized_0_100",
      field: "coordinate_system",
    },
    half: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "manual",
    },
    precomputedGrid: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "precomputed_grid",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "heatmap_match_data",
    underscored: true,
    timestamps: true,
  },
);

export default HeatmapMatchData;
