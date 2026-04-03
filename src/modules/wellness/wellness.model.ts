// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional, type WhereOptions } from "sequelize";
import { sequelize } from "@config/database";

// ── Wellness Profile ──

export type WellnessGoal = "bulk" | "cut" | "maintenance";

interface ProfileAttributes {
  id: string;
  playerId: string;
  sex: "male" | "female";
  activityLevel: number;
  goal: WellnessGoal;
  targetCalories?: number | null;
  targetProteinG?: number | null;
  targetFatG?: number | null;
  targetCarbsG?: number | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProfileCreation extends Optional<
  ProfileAttributes,
  "id" | "activityLevel" | "goal" | "createdAt" | "updatedAt"
> {}

export class WellnessProfile
  extends Model<ProfileAttributes, ProfileCreation>
  implements ProfileAttributes
{
  declare id: string;
  declare playerId: string;
  declare sex: "male" | "female";
  declare activityLevel: number;
  declare goal: WellnessGoal;
  declare targetCalories: number | null;
  declare targetProteinG: number | null;
  declare targetFatG: number | null;
  declare targetCarbsG: number | null;
  declare notes: string | null;
  declare createdBy: string;
}

WellnessProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "player_id",
    },
    sex: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [["male", "female"]] },
    },
    activityLevel: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.55,
      field: "activity_level",
    },
    goal: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "maintenance",
      validate: { isIn: [["bulk", "cut", "maintenance"]] },
    },
    targetCalories: { type: DataTypes.INTEGER, field: "target_calories" },
    targetProteinG: {
      type: DataTypes.DECIMAL(6, 1),
      field: "target_protein_g",
    },
    targetFatG: { type: DataTypes.DECIMAL(6, 1), field: "target_fat_g" },
    targetCarbsG: { type: DataTypes.DECIMAL(6, 1), field: "target_carbs_g" },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
  },
  {
    sequelize,
    tableName: "wellness_profiles",
    underscored: true,
    timestamps: true,
  },
);

// ── Weight Log ──

interface WeightLogAttributes {
  id: string;
  playerId: string;
  weightKg: number;
  bodyFatPct?: number | null;
  notes?: string | null;
  loggedAt: string; // DATE as YYYY-MM-DD
  createdAt?: Date;
}

interface WeightLogCreation extends Optional<
  WeightLogAttributes,
  "id" | "createdAt"
> {}

export class WellnessWeightLog
  extends Model<WeightLogAttributes, WeightLogCreation>
  implements WeightLogAttributes
{
  declare id: string;
  declare playerId: string;
  declare weightKg: number;
  declare bodyFatPct: number | null;
  declare notes: string | null;
  declare loggedAt: string;
}

WellnessWeightLog.init(
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
    weightKg: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      field: "weight_kg",
    },
    bodyFatPct: {
      type: DataTypes.DECIMAL(4, 1),
      field: "body_fat_pct",
    },
    notes: { type: DataTypes.TEXT },
    loggedAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "logged_at",
    },
  },
  {
    sequelize,
    tableName: "wellness_weight_logs",
    underscored: true,
    timestamps: true,
    updatedAt: false, // weight logs are append-only
  },
);

// ── Food Item (cached food database) ──

export type FoodSource = "nutritionix" | "edamam" | "custom";

interface FoodItemAttributes {
  id: string;
  externalId?: string | null;
  source: FoodSource;
  name: string;
  nameAr?: string | null;
  brand?: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  photoUrl?: string | null;
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FoodItemCreation extends Optional<
  FoodItemAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class WellnessFoodItem
  extends Model<FoodItemAttributes, FoodItemCreation>
  implements FoodItemAttributes
{
  declare id: string;
  declare externalId: string | null;
  declare source: FoodSource;
  declare name: string;
  declare nameAr: string | null;
  declare brand: string | null;
  declare servingQty: number;
  declare servingUnit: string;
  declare calories: number;
  declare proteinG: number;
  declare carbsG: number;
  declare fatG: number;
  declare fiberG: number | null;
  declare photoUrl: string | null;
  declare isVerified: boolean;
}

WellnessFoodItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    externalId: { type: DataTypes.STRING(100), field: "external_id" },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "custom",
      validate: { isIn: [["nutritionix", "edamam", "custom"]] },
    },
    name: { type: DataTypes.STRING(500), allowNull: false },
    nameAr: { type: DataTypes.STRING(500), field: "name_ar" },
    brand: { type: DataTypes.STRING(255) },
    servingQty: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 1,
      field: "serving_qty",
    },
    servingUnit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "serving",
      field: "serving_unit",
    },
    calories: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    proteinG: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "protein_g",
    },
    carbsG: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "carbs_g",
    },
    fatG: { type: DataTypes.DECIMAL(8, 2), allowNull: false, field: "fat_g" },
    fiberG: { type: DataTypes.DECIMAL(8, 2), field: "fiber_g" },
    photoUrl: { type: DataTypes.STRING(500), field: "photo_url" },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_verified",
    },
  },
  {
    sequelize,
    tableName: "wellness_food_items",
    underscored: true,
    timestamps: true,
  },
);

// ── Meal Log ──

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface MealLogAttributes {
  id: string;
  playerId: string;
  mealType: MealType;
  foodItemId?: string | null;
  customName?: string | null;
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedDate: string; // DATE as YYYY-MM-DD
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MealLogCreation extends Optional<
  MealLogAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class WellnessMealLog
  extends Model<MealLogAttributes, MealLogCreation>
  implements MealLogAttributes
{
  declare id: string;
  declare playerId: string;
  declare mealType: MealType;
  declare foodItemId: string | null;
  declare customName: string | null;
  declare servings: number;
  declare calories: number;
  declare proteinG: number;
  declare carbsG: number;
  declare fatG: number;
  declare loggedDate: string;
  declare notes: string | null;
}

WellnessMealLog.init(
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
    mealType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "meal_type",
      validate: { isIn: [["breakfast", "lunch", "dinner", "snack"]] },
    },
    foodItemId: {
      type: DataTypes.UUID,
      field: "food_item_id",
    },
    customName: { type: DataTypes.STRING(500), field: "custom_name" },
    servings: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 1,
    },
    calories: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    proteinG: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "protein_g",
    },
    carbsG: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      field: "carbs_g",
    },
    fatG: { type: DataTypes.DECIMAL(8, 2), allowNull: false, field: "fat_g" },
    loggedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "logged_date",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "wellness_meal_logs",
    underscored: true,
    timestamps: true,
  },
);

// ── Wellness Checkin (Daily Readiness Survey) ──

interface WellnessCheckinAttributes {
  id: string;
  playerId: string;
  checkinDate: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigue: number | null;
  muscleSoreness: number | null;
  mood: number | null;
  stress: number | null;
  sorenessAreas: string[] | null;
  readinessScore: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WellnessCheckinCreation extends Optional<
  WellnessCheckinAttributes,
  | "id"
  | "sleepHours"
  | "sleepQuality"
  | "fatigue"
  | "muscleSoreness"
  | "mood"
  | "stress"
  | "sorenessAreas"
  | "readinessScore"
  | "notes"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class WellnessCheckin
  extends Model<WellnessCheckinAttributes, WellnessCheckinCreation>
  implements WellnessCheckinAttributes
{
  declare id: string;
  declare playerId: string;
  declare checkinDate: string;
  declare sleepHours: number | null;
  declare sleepQuality: number | null;
  declare fatigue: number | null;
  declare muscleSoreness: number | null;
  declare mood: number | null;
  declare stress: number | null;
  declare sorenessAreas: string[] | null;
  declare readinessScore: number | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

WellnessCheckin.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    checkinDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "checkin_date",
    },
    sleepHours: { type: DataTypes.FLOAT, field: "sleep_hours" },
    sleepQuality: { type: DataTypes.INTEGER, field: "sleep_quality" },
    fatigue: { type: DataTypes.INTEGER },
    muscleSoreness: { type: DataTypes.INTEGER, field: "muscle_soreness" },
    mood: { type: DataTypes.INTEGER },
    stress: { type: DataTypes.INTEGER },
    sorenessAreas: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: "soreness_areas",
    },
    readinessScore: { type: DataTypes.INTEGER, field: "readiness_score" },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "wellness_checkins",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations ──

WellnessMealLog.belongsTo(WellnessFoodItem, {
  foreignKey: "food_item_id",
  as: "foodItem",
});
