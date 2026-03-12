import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──

export interface RoleFieldPermissionAttributes {
  id: string;
  role: string;
  module: string;
  field: string;
  hidden: boolean;
}

interface RoleFieldPermissionCreationAttributes extends Optional<
  RoleFieldPermissionAttributes,
  "id"
> {}

// ── Model ──

export class RoleFieldPermission
  extends Model<
    RoleFieldPermissionAttributes,
    RoleFieldPermissionCreationAttributes
  >
  implements RoleFieldPermissionAttributes
{
  declare id: string;
  declare role: string;
  declare module: string;
  declare field: string;
  declare hidden: boolean;
}

RoleFieldPermission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    field: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    hidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "role_field_permissions",
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ["role", "module", "field"] },
      { fields: ["role"] },
      { fields: ["module"] },
      { fields: ["role", "module"] },
    ],
  },
);
