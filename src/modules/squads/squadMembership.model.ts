// ─────────────────────────────────────────────────────────────
// src/modules/squads/squadMembership.model.ts
//
// Historical roster membership: one row per (squad, player, season).
// Populated by the SAFF+ roster scraper (Phase 2). `players.current_club_id`
// answers "where is this player now?"; this table answers "who was
// on Al-Hilal U18 in 2024-25?", which is what scouts ask.
//
// Phase 2 only writes; Phase 2b (frontend) reads via the squads API.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface SquadMembershipAttributes {
  id: string;
  squadId: string;
  playerId: string;
  season: string;
  jerseyNumber: number | null;
  position: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  externalMembershipId: string | null;
  providerSource: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SquadMembershipCreationAttributes extends Optional<
  SquadMembershipAttributes,
  | "id"
  | "jerseyNumber"
  | "position"
  | "joinedAt"
  | "leftAt"
  | "externalMembershipId"
  | "providerSource"
  | "createdAt"
  | "updatedAt"
> {}

export class SquadMembership
  extends Model<SquadMembershipAttributes, SquadMembershipCreationAttributes>
  implements SquadMembershipAttributes
{
  declare id: string;
  declare squadId: string;
  declare playerId: string;
  declare season: string;
  declare jerseyNumber: number | null;
  declare position: string | null;
  declare joinedAt: string | null;
  declare leftAt: string | null;
  declare externalMembershipId: string | null;
  declare providerSource: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Convenience getter for "is this player active in this squad now?"
  get isActive(): boolean {
    return this.leftAt === null;
  }
}

SquadMembership.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    squadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "squad_id",
      references: { model: "squads", key: "id" },
      onDelete: "CASCADE",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    jerseyNumber: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: "jersey_number",
    },
    position: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    joinedAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "joined_at",
    },
    leftAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "left_at",
    },
    externalMembershipId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "external_membership_id",
    },
    providerSource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "saffplus",
      field: "provider_source",
    },
  },
  {
    sequelize,
    tableName: "squad_memberships",
    underscored: true,
    timestamps: true,
  },
);

export default SquadMembership;
