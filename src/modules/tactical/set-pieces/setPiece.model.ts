import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Match } from "@modules/matches/match.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

export type SetPieceType = "corner" | "free_kick" | "penalty" | "throw_in";
export type SetPieceSide = "attacking" | "defending";
export type SetPieceOutcome =
  | "goal"
  | "shot_on_target"
  | "shot_off_target"
  | "cleared"
  | "penalty_won"
  | "penalty_missed"
  | "other";

interface SetPieceAttributes {
  id: string;
  matchId: string;
  type: SetPieceType;
  side: SetPieceSide;
  minute: number | null;
  takerId: string | null;
  outcome: SetPieceOutcome | null;
  deliveryType: string | null;
  targetZone: string | null;
  scorerId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SetPieceCreationAttributes extends Optional<
  SetPieceAttributes,
  | "id"
  | "minute"
  | "takerId"
  | "outcome"
  | "deliveryType"
  | "targetZone"
  | "scorerId"
  | "notes"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class SetPiece
  extends Model<SetPieceAttributes, SetPieceCreationAttributes>
  implements SetPieceAttributes
{
  declare id: string;
  declare matchId: string;
  declare type: SetPieceType;
  declare side: SetPieceSide;
  declare minute: number | null;
  declare takerId: string | null;
  declare outcome: SetPieceOutcome | null;
  declare deliveryType: string | null;
  declare targetZone: string | null;
  declare scorerId: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare match?: Match;
  declare taker?: Player;
  declare scorer?: Player;
  declare creator?: User;
}

SetPiece.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: { type: DataTypes.UUID, allowNull: false, field: "match_id" },
    type: { type: DataTypes.STRING(30), allowNull: false },
    side: { type: DataTypes.STRING(20), allowNull: false },
    minute: { type: DataTypes.INTEGER },
    takerId: { type: DataTypes.UUID, field: "taker_id" },
    outcome: { type: DataTypes.STRING(30) },
    deliveryType: { type: DataTypes.STRING(30), field: "delivery_type" },
    targetZone: { type: DataTypes.STRING(30), field: "target_zone" },
    scorerId: { type: DataTypes.UUID, field: "scorer_id" },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "set_piece_events",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
SetPiece.belongsTo(Match, { foreignKey: "matchId", as: "match" });
Match.hasMany(SetPiece, { foreignKey: "matchId", as: "setPieces" });

SetPiece.belongsTo(Player, { foreignKey: "takerId", as: "taker" });
SetPiece.belongsTo(Player, { foreignKey: "scorerId", as: "scorer" });

SetPiece.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
