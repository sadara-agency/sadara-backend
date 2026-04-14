import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface PackageAttributes {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PackageCreationAttributes extends Optional<
  PackageAttributes,
  "id" | "nameAr" | "description" | "isActive" | "createdAt" | "updatedAt"
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
  },
  {
    sequelize,
    tableName: "packages",
    underscored: true,
    timestamps: true,
  },
);

export default Package;
