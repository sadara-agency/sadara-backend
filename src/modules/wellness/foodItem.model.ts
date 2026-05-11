import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface FoodItemAttributes {
  id: string;
  fdcId: number;
  name: string;
  nameAr: string | null;
  category: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  defaultServingG: number;
  servingLabel: string | null;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FoodItemCreationAttributes extends Optional<
  FoodItemAttributes,
  | "id"
  | "nameAr"
  | "category"
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "fiberG"
  | "sodiumMg"
  | "servingLabel"
  | "createdAt"
  | "updatedAt"
> {}

export class FoodItem
  extends Model<FoodItemAttributes, FoodItemCreationAttributes>
  implements FoodItemAttributes
{
  declare id: string;
  declare fdcId: number;
  declare name: string;
  declare nameAr: string | null;
  declare category: string | null;
  declare calories: number | null;
  declare proteinG: number | null;
  declare carbsG: number | null;
  declare fatG: number | null;
  declare fiberG: number | null;
  declare sodiumMg: number | null;
  declare defaultServingG: number;
  declare servingLabel: string | null;
  declare source: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

FoodItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fdcId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "fdc_id",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(255),
      field: "name_ar",
    },
    category: {
      type: DataTypes.STRING(100),
    },
    calories: {
      type: DataTypes.DECIMAL(7, 1),
    },
    proteinG: {
      type: DataTypes.DECIMAL(6, 2),
      field: "protein_g",
    },
    carbsG: {
      type: DataTypes.DECIMAL(6, 2),
      field: "carbs_g",
    },
    fatG: {
      type: DataTypes.DECIMAL(6, 2),
      field: "fat_g",
    },
    fiberG: {
      type: DataTypes.DECIMAL(6, 2),
      field: "fiber_g",
    },
    sodiumMg: {
      type: DataTypes.DECIMAL(7, 2),
      field: "sodium_mg",
    },
    defaultServingG: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: false,
      defaultValue: 100,
      field: "default_serving_g",
    },
    servingLabel: {
      type: DataTypes.STRING(50),
      field: "serving_label",
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "usda",
    },
  },
  {
    sequelize,
    tableName: "food_items",
    underscored: true,
    timestamps: true,
  },
);

export default FoodItem;
