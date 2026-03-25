import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──

export interface DashboardWidgetConfigAttributes {
  id: string;
  role: string;
  widgetKey: string;
  position: number;
  size: string;
  enabled: boolean;
}

interface DashboardWidgetConfigCreation extends Optional<
  DashboardWidgetConfigAttributes,
  "id" | "size"
> {}

// ── Model ──

export class DashboardWidgetConfig
  extends Model<DashboardWidgetConfigAttributes, DashboardWidgetConfigCreation>
  implements DashboardWidgetConfigAttributes
{
  declare id: string;
  declare role: string;
  declare widgetKey: string;
  declare position: number;
  declare size: string;
  declare enabled: boolean;
}

DashboardWidgetConfig.init(
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
    widgetKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "widget_key",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    size: {
      type: DataTypes.STRING(20),
      defaultValue: "normal",
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "dashboard_widget_configs",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["role", "widget_key"] }],
  },
);
