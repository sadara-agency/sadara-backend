import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface SeasonSyncAttributes {
  id: string;
  source: "saff" | "spl" | "sportmonks";
  competition: string;
  competitionId: string | null;
  season: string;
  dataType: string;
  status: "pending" | "running" | "completed" | "failed";
  lockedAt: Date | null;
  lockedBy: string | null;
  syncedAt: Date | null;
  recordCount: number;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SeasonSyncCreation extends Optional<
  SeasonSyncAttributes,
  | "id"
  | "competitionId"
  | "status"
  | "lockedAt"
  | "lockedBy"
  | "syncedAt"
  | "recordCount"
  | "errorMessage"
  | "metadata"
  | "createdAt"
  | "updatedAt"
> {}

export class SeasonSync
  extends Model<SeasonSyncAttributes, SeasonSyncCreation>
  implements SeasonSyncAttributes
{
  declare id: string;
  declare source: "saff" | "spl" | "sportmonks";
  declare competition: string;
  declare competitionId: string | null;
  declare season: string;
  declare dataType: string;
  declare status: "pending" | "running" | "completed" | "failed";
  declare lockedAt: Date | null;
  declare lockedBy: string | null;
  declare syncedAt: Date | null;
  declare recordCount: number;
  declare errorMessage: string | null;
  declare metadata: Record<string, unknown> | null;
}

SeasonSync.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    competition: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    competitionId: {
      type: DataTypes.UUID,
      field: "competition_id",
      references: { model: "competitions", key: "id" },
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    dataType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "data_type",
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
    },
    lockedAt: {
      type: DataTypes.DATE,
      field: "locked_at",
    },
    lockedBy: {
      type: DataTypes.UUID,
      field: "locked_by",
    },
    syncedAt: {
      type: DataTypes.DATE,
      field: "synced_at",
    },
    recordCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "record_count",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: "error_message",
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  },
  {
    sequelize,
    tableName: "season_syncs",
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: "season_syncs_source_competition_season_data_type_key",
        fields: ["source", "competition", "season", "data_type"],
      },
    ],
  },
);
