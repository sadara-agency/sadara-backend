import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface PackageConfigAttributes {
  id: string;
  package: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PackageConfigCreationAttributes extends Optional<
  PackageConfigAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class PackageConfig
  extends Model<PackageConfigAttributes, PackageConfigCreationAttributes>
  implements PackageConfigAttributes
{
  declare id: string;
  declare package: string;
  declare module: string;
  declare canCreate: boolean;
  declare canRead: boolean;
  declare canUpdate: boolean;
  declare canDelete: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PackageConfig.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    package: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    canCreate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canUpdate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "package_configs",
    underscored: true,
    timestamps: true,
  },
);

export default PackageConfig;
