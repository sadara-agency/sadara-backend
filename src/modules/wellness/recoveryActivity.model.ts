import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface RecoveryActivityAttributes {
  id: string;
  playerId: string;
  activityDate: string; // DATE as YYYY-MM-DD

  saunaMinutes?: number | null;
  poolMinutes?: number | null;
  walkMinutes?: number | null;
  coldTubMinutes?: number | null;
  steps?: number | null;

  notes?: string | null;
  recordedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RecoveryActivityCreation extends Optional<
  RecoveryActivityAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class RecoveryActivity
  extends Model<RecoveryActivityAttributes, RecoveryActivityCreation>
  implements RecoveryActivityAttributes
{
  declare id: string;
  declare playerId: string;
  declare activityDate: string;

  declare saunaMinutes: number | null;
  declare poolMinutes: number | null;
  declare walkMinutes: number | null;
  declare coldTubMinutes: number | null;
  declare steps: number | null;

  declare notes: string | null;
  declare recordedBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

RecoveryActivity.init(
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
    activityDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "activity_date",
    },

    saunaMinutes: {
      type: DataTypes.INTEGER,
      field: "sauna_minutes",
      validate: { min: 0 },
    },
    poolMinutes: {
      type: DataTypes.INTEGER,
      field: "pool_minutes",
      validate: { min: 0 },
    },
    walkMinutes: {
      type: DataTypes.INTEGER,
      field: "walk_minutes",
      validate: { min: 0 },
    },
    coldTubMinutes: {
      type: DataTypes.INTEGER,
      field: "cold_tub_minutes",
      validate: { min: 0 },
    },
    steps: {
      type: DataTypes.INTEGER,
      field: "steps",
      validate: { min: 0 },
    },

    notes: { type: DataTypes.TEXT },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "recorded_by",
    },
  },
  {
    sequelize,
    tableName: "recovery_activities",
    underscored: true,
    timestamps: true,
  },
);

export default RecoveryActivity;
