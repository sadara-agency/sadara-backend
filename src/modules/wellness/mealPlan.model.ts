import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { WellnessFoodItem } from "./wellness.model";

// ── Enums ──

export type MealPlanStatus = "draft" | "active" | "completed" | "archived";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// ═══════════════════════════════════════
// MealPlan
// ═══════════════════════════════════════

export interface MealPlanAttributes {
  id: string;
  playerId: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  status: MealPlanStatus;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  notes: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MealPlanCreationAttributes extends Optional<
  MealPlanAttributes,
  | "id"
  | "titleAr"
  | "description"
  | "status"
  | "targetCalories"
  | "targetProteinG"
  | "targetCarbsG"
  | "targetFatG"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class MealPlan
  extends Model<MealPlanAttributes, MealPlanCreationAttributes>
  implements MealPlanAttributes
{
  declare id: string;
  declare playerId: string;
  declare title: string;
  declare titleAr: string | null;
  declare description: string | null;
  declare startDate: string;
  declare endDate: string;
  declare status: MealPlanStatus;
  declare targetCalories: number | null;
  declare targetProteinG: number | null;
  declare targetCarbsG: number | null;
  declare targetFatG: number | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Association accessors
  declare items?: MealPlanItem[];
}

MealPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    titleAr: {
      type: DataTypes.STRING(255),
      field: "title_ar",
    },
    description: {
      type: DataTypes.TEXT,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
    targetCalories: {
      type: DataTypes.INTEGER,
      field: "target_calories",
    },
    targetProteinG: {
      type: DataTypes.DECIMAL(6, 1),
      field: "target_protein_g",
    },
    targetCarbsG: {
      type: DataTypes.DECIMAL(6, 1),
      field: "target_carbs_g",
    },
    targetFatG: {
      type: DataTypes.DECIMAL(6, 1),
      field: "target_fat_g",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "meal_plans",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════
// MealPlanItem
// ═══════════════════════════════════════

export interface MealPlanItemAttributes {
  id: string;
  mealPlanId: string;
  dayOfWeek: number | null;
  mealType: MealType;
  foodItemId: string | null;
  customName: string | null;
  servings: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sortOrder: number;
  notes: string | null;
  createdAt?: Date;
}

interface MealPlanItemCreationAttributes extends Optional<
  MealPlanItemAttributes,
  | "id"
  | "dayOfWeek"
  | "foodItemId"
  | "customName"
  | "servings"
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "sortOrder"
  | "notes"
  | "createdAt"
> {}

export class MealPlanItem
  extends Model<MealPlanItemAttributes, MealPlanItemCreationAttributes>
  implements MealPlanItemAttributes
{
  declare id: string;
  declare mealPlanId: string;
  declare dayOfWeek: number | null;
  declare mealType: MealType;
  declare foodItemId: string | null;
  declare customName: string | null;
  declare servings: number;
  declare calories: number | null;
  declare proteinG: number | null;
  declare carbsG: number | null;
  declare fatG: number | null;
  declare sortOrder: number;
  declare notes: string | null;
  declare readonly createdAt: Date;
}

MealPlanItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mealPlanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "meal_plan_id",
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      field: "day_of_week",
    },
    mealType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "meal_type",
    },
    foodItemId: {
      type: DataTypes.UUID,
      field: "food_item_id",
    },
    customName: {
      type: DataTypes.STRING(500),
      field: "custom_name",
    },
    servings: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 1,
    },
    calories: {
      type: DataTypes.DECIMAL(8, 2),
    },
    proteinG: {
      type: DataTypes.DECIMAL(8, 2),
      field: "protein_g",
    },
    carbsG: {
      type: DataTypes.DECIMAL(8, 2),
      field: "carbs_g",
    },
    fatG: {
      type: DataTypes.DECIMAL(8, 2),
      field: "fat_g",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: "meal_plan_items",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── Associations ──

MealPlan.hasMany(MealPlanItem, {
  foreignKey: "mealPlanId",
  as: "items",
  onDelete: "CASCADE",
});
MealPlanItem.belongsTo(MealPlan, {
  foreignKey: "mealPlanId",
  as: "mealPlan",
});
MealPlanItem.belongsTo(WellnessFoodItem, {
  foreignKey: "foodItemId",
  as: "foodItem",
});
