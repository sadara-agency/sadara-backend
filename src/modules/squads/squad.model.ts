// ─────────────────────────────────────────────────────────────
// src/modules/squads/squad.model.ts
//
// Sequelize model for `squads`. A Squad is a competitive entity
// under a parent Club: e.g. "Al Hilal U-17 1st Division". Owns
// matches (home_squad_id / away_squad_id), match_players, and
// contracts via the squad_id columns added in Migration 150.
//
// Identity is enforced by the COALESCE-based unique index on
// (club_id, age_category, COALESCE(division, '')) created in
// Migration 149 — Sequelize's UNIQUE constraint can't express that,
// so it lives at the DB layer only.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export const SQUAD_AGE_CATEGORIES = [
  "senior",
  "u23",
  "u21",
  "u20",
  "u19",
  "u17",
  "u15",
  "u13",
] as const;

export type SquadAgeCategory = (typeof SQUAD_AGE_CATEGORIES)[number];

export interface SquadAttributes {
  id: string;
  clubId: string;
  ageCategory: SquadAgeCategory;
  division: string | null;
  displayName: string;
  displayNameAr: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SquadCreationAttributes extends Optional<
  SquadAttributes,
  "id" | "division" | "isActive" | "createdAt" | "updatedAt"
> {}

export class Squad
  extends Model<SquadAttributes, SquadCreationAttributes>
  implements SquadAttributes
{
  declare id: string;
  declare clubId: string;
  declare ageCategory: SquadAgeCategory;
  declare division: string | null;
  declare displayName: string;
  declare displayNameAr: string;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Squad.init(
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
    ageCategory: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "age_category",
    },
    division: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    displayName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "display_name",
    },
    displayNameAr: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "display_name_ar",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    sequelize,
    tableName: "squads",
    underscored: true,
    timestamps: true,
  },
);

export default Squad;
