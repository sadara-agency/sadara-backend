// ─────────────────────────────────────────────────────────────
// src/modules/matches/matchEvent.model.ts
//
// One row per in-match incident — goal, card, sub, VAR, period
// marker. Created by the SAFF+ event-timeline scraper (Phase 3 of
// the comprehensive integration); the schema lands in Phase 1 so the
// rest of the codebase can reference it.
//
// Uniqueness is enforced at the DB layer by the partial unique index
// on (match_id, provider_source, external_event_id) — see
// migration 153. Sequelize cannot express that condition.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export const MATCH_EVENT_TYPES = [
  "goal",
  "own_goal",
  "penalty_goal",
  "penalty_miss",
  "yellow",
  "second_yellow",
  "red",
  "sub_in",
  "sub_out",
  "assist",
  "var_review",
  "var_overturn",
  "injury",
  "kickoff",
  "halftime",
  "fulltime",
] as const;

export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];
export type MatchEventTeamSide = "home" | "away";

export interface MatchEventAttributes {
  id: string;
  matchId: string;
  minute: number;
  stoppageMinute: number | null;
  type: MatchEventType;
  teamSide: MatchEventTeamSide;
  playerId: string | null;
  relatedPlayerId: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  externalEventId: string | null;
  providerSource: string;
  rawPayload: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchEventCreationAttributes extends Optional<
  MatchEventAttributes,
  | "id"
  | "stoppageMinute"
  | "playerId"
  | "relatedPlayerId"
  | "descriptionAr"
  | "descriptionEn"
  | "externalEventId"
  | "providerSource"
  | "rawPayload"
  | "createdAt"
  | "updatedAt"
> {}

export class MatchEvent
  extends Model<MatchEventAttributes, MatchEventCreationAttributes>
  implements MatchEventAttributes
{
  declare id: string;
  declare matchId: string;
  declare minute: number;
  declare stoppageMinute: number | null;
  declare type: MatchEventType;
  declare teamSide: MatchEventTeamSide;
  declare playerId: string | null;
  declare relatedPlayerId: string | null;
  declare descriptionAr: string | null;
  declare descriptionEn: string | null;
  declare externalEventId: string | null;
  declare providerSource: string;
  declare rawPayload: Record<string, unknown> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MatchEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "match_id",
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    minute: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    stoppageMinute: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: "stoppage_minute",
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    teamSide: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: "team_side",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "player_id",
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    relatedPlayerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "related_player_id",
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    descriptionAr: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description_ar",
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description_en",
    },
    externalEventId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "external_event_id",
    },
    providerSource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "saffplus",
      field: "provider_source",
    },
    rawPayload: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "raw_payload",
    },
  },
  {
    sequelize,
    tableName: "match_events",
    underscored: true,
    timestamps: true,
  },
);

export default MatchEvent;
