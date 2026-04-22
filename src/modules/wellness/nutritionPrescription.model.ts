import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type TriggeringReason = "manual" | "scan" | "injury" | "block_change";

// ─── NutritionPrescription ────────────────────────────────────────────────────

export interface NutritionPrescriptionAttributes {
  id: string;
  playerId: string;
  trainingBlockId: string | null;
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
  | "trainingBlockId"
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
  declare trainingBlockId: string | null;
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
    trainingBlockId: {
      type: DataTypes.UUID,
      field: "training_block_id",
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
  mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  description: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt?: Date;
}

interface PrescriptionMealCreationAttributes extends Optional<
  PrescriptionMealAttributes,
  "id" | "dayOfWeek" | "description" | "sortOrder" | "notes" | "createdAt"
> {}

export class PrescriptionMeal
  extends Model<PrescriptionMealAttributes, PrescriptionMealCreationAttributes>
  implements PrescriptionMealAttributes
{
  declare id: string;
  declare prescriptionId: string;
  declare dayOfWeek: number | null;
  declare mealType: "breakfast" | "lunch" | "dinner" | "snacks";
  declare description: string | null;
  declare sortOrder: number;
  declare notes: string | null;
  declare readonly createdAt: Date;
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
      allowNull: false,
      field: "meal_type",
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

export default NutritionPrescription;
