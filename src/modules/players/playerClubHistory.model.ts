import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

interface PlayerClubHistoryAttributes {
  id: string;
  playerId: string;
  clubId: string;
  startDate: string;
  endDate: string | null;
  position: string | null;
  jerseyNumber: number | null;
  contractId: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerClubHistoryCreation extends Optional<
  PlayerClubHistoryAttributes,
  | "id"
  | "endDate"
  | "position"
  | "jerseyNumber"
  | "contractId"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class PlayerClubHistory
  extends Model<PlayerClubHistoryAttributes, PlayerClubHistoryCreation>
  implements PlayerClubHistoryAttributes
{
  declare id: string;
  declare playerId: string;
  declare clubId: string;
  declare startDate: string;
  declare endDate: string | null;
  declare position: string | null;
  declare jerseyNumber: number | null;
  declare contractId: string | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

PlayerClubHistory.init(
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
    clubId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "club_id",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "end_date",
    },
    position: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    jerseyNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "jersey_number",
    },
    contractId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "contract_id",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "player_club_history",
    underscored: true,
    timestamps: true,
  },
);
