import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Competition Types ──

export type CompetitionType = "league" | "cup" | "super_cup" | "friendly";
export type CompetitionGender = "men" | "women";
export type CompetitionFormat = "outdoor" | "futsal" | "beach" | "esports";
export type AgencyValue =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Scouting"
  | "Niche";

// ── Competition ──

interface CompetitionAttributes {
  id: string;
  name: string;
  nameAr: string | null;
  country: string;
  type: CompetitionType;
  tier: number;
  ageGroup: string | null;
  gender: CompetitionGender;
  format: CompetitionFormat;
  agencyValue: AgencyValue;
  sportmonksLeagueId: number | null;
  saffId: number | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CompetitionCreationAttributes extends Optional<
  CompetitionAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class Competition
  extends Model<CompetitionAttributes, CompetitionCreationAttributes>
  implements CompetitionAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare country: string;
  declare type: CompetitionType;
  declare tier: number;
  declare ageGroup: string | null;
  declare gender: CompetitionGender;
  declare format: CompetitionFormat;
  declare agencyValue: AgencyValue;
  declare sportmonksLeagueId: number | null;
  declare saffId: number | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Competition.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    nameAr: { type: DataTypes.STRING, field: "name_ar" },
    country: { type: DataTypes.STRING, defaultValue: "Saudi Arabia" },
    type: {
      type: DataTypes.ENUM("league", "cup", "super_cup", "friendly"),
      allowNull: false,
      defaultValue: "league",
    },
    tier: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    ageGroup: { type: DataTypes.STRING(20), field: "age_group" },
    gender: {
      type: DataTypes.ENUM("men", "women"),
      defaultValue: "men",
    },
    format: {
      type: DataTypes.ENUM("outdoor", "futsal", "beach", "esports"),
      defaultValue: "outdoor",
    },
    agencyValue: {
      type: DataTypes.ENUM(
        "Critical",
        "High",
        "Medium",
        "Low",
        "Scouting",
        "Niche",
      ),
      field: "agency_value",
      defaultValue: "Medium",
    },
    sportmonksLeagueId: {
      type: DataTypes.INTEGER,
      unique: true,
      field: "sportmonks_league_id",
    },
    saffId: {
      type: DataTypes.INTEGER,
      unique: true,
      field: "saff_id",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    sequelize,
    tableName: "competitions",
    underscored: true,
    timestamps: true,
  },
);

// ── ClubCompetition (junction) ──

interface ClubCompetitionAttributes {
  id: string;
  clubId: string;
  competitionId: string;
  season: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClubCompetitionCreationAttributes extends Optional<
  ClubCompetitionAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class ClubCompetition
  extends Model<ClubCompetitionAttributes, ClubCompetitionCreationAttributes>
  implements ClubCompetitionAttributes
{
  declare id: string;
  declare clubId: string;
  declare competitionId: string;
  declare season: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ClubCompetition.init(
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
    },
    competitionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "competition_id",
      references: { model: "competitions", key: "id" },
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "club_competitions",
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["club_id", "competition_id", "season"],
      },
    ],
  },
);
