// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.model.ts
// Sequelize model for the clubs table.
//
// FIXED: Changed `public` to `declare` on all properties
// to avoid shadowing Sequelize ORM getters. This is the same
// fix applied to Player and other models.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface ClubAttributes {
  id: string;
  name: string;
  nameAr?: string | null;
  type: "Club" | "Sponsor";
  country?: string | null;
  city?: string | null;
  league?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  foundedYear?: number | null;
  stadium?: string | null;
  stadiumCapacity?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  notes?: string | null;
  code?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  squadType?: string | null;
  splTeamId?: number | null;
  espnTeamId?: number | null;
  sportmonksTeamId?: number | null;
  saffTeamId?: number | null;
}

interface ClubCreationAttributes extends Optional<
  ClubAttributes,
  "id" | "type" | "code" | "createdAt" | "updatedAt"
> {}

export class Club
  extends Model<ClubAttributes, ClubCreationAttributes>
  implements ClubAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare type: "Club" | "Sponsor";
  declare country: string | null;
  declare city: string | null;
  declare league: string | null;
  declare logoUrl: string | null;
  declare website: string | null;
  declare foundedYear: number | null;
  declare stadium: string | null;
  declare stadiumCapacity: number | null;
  declare primaryColor: string | null;
  declare secondaryColor: string | null;
  declare notes: string | null;
  declare code: string | null;
  declare isActive: boolean;
  declare squadType: string | null;
  declare splTeamId: number | null;
  declare espnTeamId: number | null;
  declare sportmonksTeamId: number | null;
  declare saffTeamId: number | null;
}

Club.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING,
      field: "name_ar",
    },
    type: {
      type: DataTypes.ENUM("Club", "Sponsor"),
      defaultValue: "Club",
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    league: {
      type: DataTypes.STRING,
    },
    logoUrl: {
      type: DataTypes.STRING,
      field: "logo_url",
    },
    website: {
      type: DataTypes.STRING,
    },
    foundedYear: {
      type: DataTypes.INTEGER,
      field: "founded_year",
    },
    stadium: {
      type: DataTypes.STRING,
    },
    stadiumCapacity: {
      type: DataTypes.INTEGER,
      field: "stadium_capacity",
    },
    primaryColor: {
      type: DataTypes.STRING,
      field: "primary_color",
    },
    secondaryColor: {
      type: DataTypes.STRING,
      field: "secondary_color",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    code: {
      type: DataTypes.STRING(10),
      unique: true,
    },
    squadType: {
      type: DataTypes.STRING(20),
      field: "squad_type",
      defaultValue: "Senior",
    },
    splTeamId: {
      type: DataTypes.INTEGER,
      field: "spl_team_id",
    },
    espnTeamId: {
      type: DataTypes.INTEGER,
      field: "espn_team_id",
    },
    sportmonksTeamId: {
      type: DataTypes.INTEGER,
      field: "sportmonks_team_id",
      unique: true,
    },
    saffTeamId: {
      type: DataTypes.INTEGER,
      field: "saff_team_id",
      unique: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    sequelize,
    tableName: "clubs",
    underscored: true,
    timestamps: true,
  },
);
