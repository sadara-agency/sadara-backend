import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface SupplementAttributes {
  id: string;
  playerId: string;
  name: string;
  nameAr?: string | null;
  dose: number;
  unit: string;
  timing: string;
  priority: string;
  notes?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SupplementCreation extends Optional<
  SupplementAttributes,
  "id" | "nameAr" | "notes" | "isActive" | "createdAt" | "updatedAt"
> {}

export class Supplement
  extends Model<SupplementAttributes, SupplementCreation>
  implements SupplementAttributes
{
  declare id: string;
  declare playerId: string;
  declare name: string;
  declare nameAr: string | null;
  declare dose: number;
  declare unit: string;
  declare timing: string;
  declare priority: string;
  declare notes: string | null;
  declare isActive: boolean;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Supplement.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "name_ar",
    },
    dose: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    timing: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "recommended",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "supplement_protocols",
    underscored: true,
    timestamps: true,
  },
);

export default Supplement;
