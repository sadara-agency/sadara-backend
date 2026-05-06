import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type GoalProgressMode =
  | "task_count"
  | "manual_percent"
  | "numeric_target";
export type GoalStatus = "active" | "completed" | "archived";

interface AgendaGoalAttributes {
  id: string;
  userId: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  targetMonth: string;
  progressMode: GoalProgressMode;
  targetValue: number | null;
  currentValue: number;
  manualPercent: number | null;
  color: string | null;
  status: GoalStatus;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AgendaGoalCreationAttributes extends Optional<
  AgendaGoalAttributes,
  | "id"
  | "titleAr"
  | "description"
  | "targetValue"
  | "currentValue"
  | "manualPercent"
  | "color"
  | "status"
  | "sortOrder"
  | "progressMode"
  | "createdAt"
  | "updatedAt"
> {}

class AgendaGoal
  extends Model<AgendaGoalAttributes, AgendaGoalCreationAttributes>
  implements AgendaGoalAttributes
{
  public id!: string;
  public userId!: string;
  public title!: string;
  public titleAr!: string | null;
  public description!: string | null;
  public targetMonth!: string;
  public progressMode!: GoalProgressMode;
  public targetValue!: number | null;
  public currentValue!: number;
  public manualPercent!: number | null;
  public color!: string | null;
  public status!: GoalStatus;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AgendaGoal.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    titleAr: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetMonth: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    progressMode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "task_count",
    },
    targetValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    currentValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    manualPercent: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "agenda_goals",
    underscored: true,
    timestamps: true,
  },
);

export default AgendaGoal;
