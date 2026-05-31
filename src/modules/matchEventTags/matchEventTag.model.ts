import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";

export type MatchEventTagType =
  | "goal"
  | "assist"
  | "shot"
  | "shot_on_target"
  | "pass"
  | "pass_incomplete"
  | "key_pass"
  | "tackle"
  | "interception"
  | "foul"
  | "yellow"
  | "red"
  | "dribble"
  | "dribble_failed"
  | "duel_won"
  | "duel_lost"
  | "save";

interface MatchEventTagAttributes {
  id: string;
  matchId: string;
  playerId: string;
  tagType: MatchEventTagType;
  timestampSec: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchEventTagCreation extends Optional<
  MatchEventTagAttributes,
  "id" | "timestampSec" | "notes" | "createdBy" | "createdAt" | "updatedAt"
> {}

export class MatchEventTag
  extends Model<MatchEventTagAttributes, MatchEventTagCreation>
  implements MatchEventTagAttributes
{
  declare id: string;
  declare matchId: string;
  declare playerId: string;
  declare tagType: MatchEventTagType;
  declare timestampSec: number | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare player?: Player;
  declare match?: Match;
}

MatchEventTag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: { type: DataTypes.UUID, allowNull: false, field: "match_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    tagType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: "tag_type",
    },
    timestampSec: { type: DataTypes.INTEGER, field: "timestamp_sec" },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "match_event_tags",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
MatchEventTag.belongsTo(Player, { foreignKey: "playerId", as: "player" });
MatchEventTag.belongsTo(Match, { foreignKey: "matchId", as: "match" });
