import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface PackageTracks {
  career?: { en?: string[]; ar?: string[] };
  performance?: { en?: string[]; ar?: string[] };
  brand?: { en?: string[]; ar?: string[] };
  wealth?: { en?: string[]; ar?: string[] };
}

interface PackageAttributes {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  isActive: boolean;
  taglineEn: string | null;
  taglineAr: string | null;
  feeMin: number | null;
  feeMax: number | null;
  commissionPct: number | null;
  tracks: PackageTracks | null;
  maxPlayers: number | null;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PackageCreationAttributes extends Optional<
  PackageAttributes,
  | "id"
  | "nameAr"
  | "description"
  | "isActive"
  | "taglineEn"
  | "taglineAr"
  | "feeMin"
  | "feeMax"
  | "commissionPct"
  | "tracks"
  | "maxPlayers"
  | "displayOrder"
  | "createdAt"
  | "updatedAt"
> {}

export class Package
  extends Model<PackageAttributes, PackageCreationAttributes>
  implements PackageAttributes
{
  declare id: string;
  declare code: string;
  declare name: string;
  declare nameAr: string | null;
  declare description: string | null;
  declare isActive: boolean;
  declare taglineEn: string | null;
  declare taglineAr: string | null;
  declare feeMin: number | null;
  declare feeMax: number | null;
  declare commissionPct: number | null;
  declare tracks: PackageTracks | null;
  declare maxPlayers: number | null;
  declare displayOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Package.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    taglineEn: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    taglineAr: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    feeMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    feeMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    commissionPct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 10.0,
    },
    tracks: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    maxPlayers: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    displayOrder: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "packages",
    underscored: true,
    timestamps: true,
  },
);

export default Package;
