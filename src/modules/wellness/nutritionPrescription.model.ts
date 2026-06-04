import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { FoodItem } from "./foodItem.model";

export type TriggeringReason = "manual" | "scan" | "injury";

// ─── NutritionPrescription ────────────────────────────────────────────────────

export interface NutritionPrescriptionAttributes {
  id: string;
  playerId: string;
  versionNumber: number;
  issuedBy: string;
  triggeringReason: TriggeringReason;
  triggeringScanId: string | null;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  hydrationTargetMl: number | null;
  preTrainingGuidance: string | null;
  postTrainingGuidance: string | null;
  notes: string | null;
  supersededAt: Date | null;
  supersededBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NutritionPrescriptionCreationAttributes extends Optional<
  NutritionPrescriptionAttributes,
  | "id"
  | "versionNumber"
  | "triggeringScanId"
  | "targetCalories"
  | "targetProteinG"
  | "targetCarbsG"
  | "targetFatG"
  | "hydrationTargetMl"
  | "preTrainingGuidance"
  | "postTrainingGuidance"
  | "notes"
  | "supersededAt"
  | "supersededBy"
  | "createdAt"
  | "updatedAt"
> {}

export class NutritionPrescription
  extends Model<
    NutritionPrescriptionAttributes,
    NutritionPrescriptionCreationAttributes
  >
  implements NutritionPrescriptionAttributes
{
  declare id: string;
  declare playerId: string;
  declare versionNumber: number;
  declare issuedBy: string;
  declare triggeringReason: TriggeringReason;
  declare triggeringScanId: string | null;
  declare targetCalories: number | null;
  declare targetProteinG: number | null;
  declare targetCarbsG: number | null;
  declare targetFatG: number | null;
  declare hydrationTargetMl: number | null;
  declare preTrainingGuidance: string | null;
  declare postTrainingGuidance: string | null;
  declare notes: string | null;
  declare supersededAt: Date | null;
  declare supersededBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare meals?: PrescriptionMeal[];
}

NutritionPrescription.init(
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
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "version_number",
    },
    issuedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "issued_by",
    },
    triggeringReason: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "manual",
      field: "triggering_reason",
    },
    triggeringScanId: {
      type: DataTypes.UUID,
      field: "triggering_scan_id",
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
    hydrationTargetMl: {
      type: DataTypes.INTEGER,
      field: "hydration_target_ml",
    },
    preTrainingGuidance: {
      type: DataTypes.TEXT,
      field: "pre_training_guidance",
    },
    postTrainingGuidance: {
      type: DataTypes.TEXT,
      field: "post_training_guidance",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    supersededAt: {
      type: DataTypes.DATE,
      field: "superseded_at",
    },
    supersededBy: {
      type: DataTypes.UUID,
      field: "superseded_by",
    },
  },
  {
    sequelize,
    tableName: "nutrition_prescriptions",
    underscored: true,
    timestamps: true,
  },
);

// ─── PrescriptionMeal ─────────────────────────────────────────────────────────

export interface PrescriptionMealAttributes {
  id: string;
  prescriptionId: string;
  dayOfWeek: number | null;
  mealType: "breakfast" | "lunch" | "dinner" | "snacks" | null;
  customName: string | null;
  description: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt?: Date;
}

interface PrescriptionMealCreationAttributes extends Optional<
  PrescriptionMealAttributes,
  | "id"
  | "dayOfWeek"
  | "mealType"
  | "customName"
  | "description"
  | "sortOrder"
  | "notes"
  | "createdAt"
> {}

export class PrescriptionMeal
  extends Model<PrescriptionMealAttributes, PrescriptionMealCreationAttributes>
  implements PrescriptionMealAttributes
{
  declare id: string;
  declare prescriptionId: string;
  declare dayOfWeek: number | null;
  declare mealType: "breakfast" | "lunch" | "dinner" | "snacks" | null;
  declare customName: string | null;
  declare description: string | null;
  declare sortOrder: number;
  declare notes: string | null;
  declare readonly createdAt: Date;

  declare items?: PrescriptionMealItem[];
}

PrescriptionMeal.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "prescription_id",
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      field: "day_of_week",
    },
    mealType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "meal_type",
    },
    customName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_name",
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: "prescription_meals",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ─── PrescriptionMealItem ─────────────────────────────────────────────────────

export interface PrescriptionMealItemAttributes {
  id: string;
  mealId: string;
  foodItemId: string | null;
  name: string | null;
  servings: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  createdAt?: Date;
}

interface PrescriptionMealItemCreationAttributes extends Optional<
  PrescriptionMealItemAttributes,
  | "id"
  | "foodItemId"
  | "name"
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "createdAt"
> {}

export class PrescriptionMealItem
  extends Model<
    PrescriptionMealItemAttributes,
    PrescriptionMealItemCreationAttributes
  >
  implements PrescriptionMealItemAttributes
{
  declare id: string;
  declare mealId: string;
  declare foodItemId: string | null;
  declare name: string | null;
  declare servings: number;
  declare calories: number | null;
  declare proteinG: number | null;
  declare carbsG: number | null;
  declare fatG: number | null;
  declare readonly createdAt: Date;

  declare food?: FoodItem;
}

PrescriptionMealItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mealId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "meal_id",
    },
    foodItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "food_item_id",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    servings: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1.0,
    },
    calories: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
    },
    proteinG: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "protein_g",
    },
    carbsG: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "carbs_g",
    },
    fatG: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "fat_g",
    },
  },
  {
    sequelize,
    tableName: "prescription_meal_items",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ─── Associations ─────────────────────────────────────────────────────────────

NutritionPrescription.hasMany(PrescriptionMeal, {
  foreignKey: "prescriptionId",
  as: "meals",
  onDelete: "CASCADE",
});
PrescriptionMeal.belongsTo(NutritionPrescription, {
  foreignKey: "prescriptionId",
  as: "prescription",
});

PrescriptionMeal.hasMany(PrescriptionMealItem, {
  foreignKey: "mealId",
  as: "items",
  onDelete: "CASCADE",
});
PrescriptionMealItem.belongsTo(PrescriptionMeal, {
  foreignKey: "mealId",
  as: "meal",
});
PrescriptionMealItem.belongsTo(FoodItem, {
  foreignKey: "foodItemId",
  as: "food",
});

export default NutritionPrescription;
