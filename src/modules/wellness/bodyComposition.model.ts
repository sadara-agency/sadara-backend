// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/bodyComposition.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface BodyCompositionAttributes {
  id: string;
  playerId: string;
  scanDate: string; // DATE as YYYY-MM-DD
  deviceTag?: string | null;

  // Core body composition
  weightKg: number;
  bodyFatPct?: number | null;
  leanBodyMassKg?: number | null;
  skeletalMuscleMassKg?: number | null;
  totalBodyWaterKg?: number | null;
  proteinKg?: number | null;
  mineralKg?: number | null;

  // Segmental lean mass (kg)
  segLeanRightArmKg?: number | null;
  segLeanLeftArmKg?: number | null;
  segLeanTrunkKg?: number | null;
  segLeanRightLegKg?: number | null;
  segLeanLeftLegKg?: number | null;

  // Segmental fat mass (kg)
  segFatRightArmKg?: number | null;
  segFatLeftArmKg?: number | null;
  segFatTrunkKg?: number | null;
  segFatRightLegKg?: number | null;
  segFatLeftLegKg?: number | null;

  // Metabolic / visceral
  measuredBmrKcal?: number | null;
  visceralFatLevel?: number | null;
  waistHipRatio?: number | null;
  metabolicAge?: number | null;

  // Document attachment
  pdfDocumentId?: string | null;

  notes?: string | null;
  recordedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BodyCompositionCreation extends Optional<
  BodyCompositionAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class BodyComposition
  extends Model<BodyCompositionAttributes, BodyCompositionCreation>
  implements BodyCompositionAttributes
{
  declare id: string;
  declare playerId: string;
  declare scanDate: string;
  declare deviceTag: string | null;

  declare weightKg: number;
  declare bodyFatPct: number | null;
  declare leanBodyMassKg: number | null;
  declare skeletalMuscleMassKg: number | null;
  declare totalBodyWaterKg: number | null;
  declare proteinKg: number | null;
  declare mineralKg: number | null;

  declare segLeanRightArmKg: number | null;
  declare segLeanLeftArmKg: number | null;
  declare segLeanTrunkKg: number | null;
  declare segLeanRightLegKg: number | null;
  declare segLeanLeftLegKg: number | null;

  declare segFatRightArmKg: number | null;
  declare segFatLeftArmKg: number | null;
  declare segFatTrunkKg: number | null;
  declare segFatRightLegKg: number | null;
  declare segFatLeftLegKg: number | null;

  declare measuredBmrKcal: number | null;
  declare visceralFatLevel: number | null;
  declare waistHipRatio: number | null;
  declare metabolicAge: number | null;

  declare pdfDocumentId: string | null;

  declare notes: string | null;
  declare recordedBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BodyComposition.init(
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
    scanDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "scan_date",
    },
    deviceTag: {
      type: DataTypes.STRING(50),
      field: "device_tag",
    },

    weightKg: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: false,
      field: "weight_kg",
    },
    bodyFatPct: {
      type: DataTypes.DECIMAL(4, 1),
      field: "body_fat_pct",
      validate: { min: 0, max: 100 },
    },
    leanBodyMassKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "lean_body_mass_kg",
    },
    skeletalMuscleMassKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "skeletal_muscle_mass_kg",
    },
    totalBodyWaterKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "total_body_water_kg",
    },
    proteinKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "protein_kg",
    },
    mineralKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "mineral_kg",
    },

    segLeanRightArmKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "seg_lean_right_arm_kg",
    },
    segLeanLeftArmKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "seg_lean_left_arm_kg",
    },
    segLeanTrunkKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "seg_lean_trunk_kg",
    },
    segLeanRightLegKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "seg_lean_right_leg_kg",
    },
    segLeanLeftLegKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "seg_lean_left_leg_kg",
    },

    segFatRightArmKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "seg_fat_right_arm_kg",
    },
    segFatLeftArmKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "seg_fat_left_arm_kg",
    },
    segFatTrunkKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "seg_fat_trunk_kg",
    },
    segFatRightLegKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "seg_fat_right_leg_kg",
    },
    segFatLeftLegKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "seg_fat_left_leg_kg",
    },

    measuredBmrKcal: {
      type: DataTypes.INTEGER,
      field: "measured_bmr_kcal",
    },
    visceralFatLevel: {
      type: DataTypes.INTEGER,
      field: "visceral_fat_level",
      validate: { min: 1, max: 30 },
    },
    waistHipRatio: {
      type: DataTypes.DECIMAL(4, 2),
      field: "waist_hip_ratio",
    },
    metabolicAge: {
      type: DataTypes.INTEGER,
      field: "metabolic_age",
    },

    pdfDocumentId: {
      type: DataTypes.UUID,
      field: "pdf_document_id",
    },

    notes: { type: DataTypes.TEXT },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "recorded_by",
    },
  },
  {
    sequelize,
    tableName: "body_compositions",
    underscored: true,
    timestamps: true,
  },
);

export default BodyComposition;
