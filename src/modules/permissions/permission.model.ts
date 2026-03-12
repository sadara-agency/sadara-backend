import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──

export interface RolePermissionAttributes {
  id: string;
  role: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface RolePermissionCreationAttributes extends Optional<
  RolePermissionAttributes,
  "id"
> {}

// ── Model ──

export class RolePermission
  extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>
  implements RolePermissionAttributes
{
  declare id: string;
  declare role: string;
  declare module: string;
  declare canCreate: boolean;
  declare canRead: boolean;
  declare canUpdate: boolean;
  declare canDelete: boolean;
}

RolePermission.init(
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
    canCreate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "can_create",
    },
    canRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "can_read",
    },
    canUpdate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "can_update",
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "can_delete",
    },
  },
  {
    sequelize,
    tableName: "role_permissions",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["role", "module"] }],
  },
);
