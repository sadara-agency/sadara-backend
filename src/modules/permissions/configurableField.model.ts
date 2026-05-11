import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──

export interface ConfigurableFieldAttributes {
  id: string;
  module: string;
  field: string;
  label: string;
  sortOrder: number;
}

interface ConfigurableFieldCreationAttributes extends Optional<
  ConfigurableFieldAttributes,
  "id" | "sortOrder"
> {}

// ── Model ──

export class ConfigurableField
  extends Model<
    ConfigurableFieldAttributes,
    ConfigurableFieldCreationAttributes
  >
  implements ConfigurableFieldAttributes
{
  declare id: string;
  declare module: string;
  declare field: string;
  declare label: string;
  declare sortOrder: number;
}

ConfigurableField.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    module: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    field: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "configurable_fields",
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ["module", "field"] },
      { fields: ["module"] },
    ],
  },
);
