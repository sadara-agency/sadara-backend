import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type TodoPriority = "low" | "medium" | "high" | "critical";

interface PersonalTodoAttributes {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  isDone: boolean;
  priority: TodoPriority;
  dueDate: string | null;
  completedAt: Date | null;
  sortOrder: number;
  tags: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PersonalTodoCreationAttributes extends Optional<
  PersonalTodoAttributes,
  | "id"
  | "notes"
  | "isDone"
  | "priority"
  | "dueDate"
  | "completedAt"
  | "sortOrder"
  | "tags"
  | "createdAt"
  | "updatedAt"
> {}

export class PersonalTodo
  extends Model<PersonalTodoAttributes, PersonalTodoCreationAttributes>
  implements PersonalTodoAttributes
{
  declare id: string;
  declare userId: string;
  declare title: string;
  declare notes: string | null;
  declare isDone: boolean;
  declare priority: TodoPriority;
  declare dueDate: string | null;
  declare completedAt: Date | null;
  declare sortOrder: number;
  declare tags: string[] | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PersonalTodo.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isDone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_done",
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "medium",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: "personal_todos",
    underscored: true,
    timestamps: true,
  },
);

export default PersonalTodo;
