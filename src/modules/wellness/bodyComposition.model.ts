// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/bodyComposition.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface BodyCompositionAttributes {
  id: string;
  playerId: string;
  scanDate: string; // DATE as YYYY-MM-DD
  scanDevice?: string | null;

  // Core body composition
  weightKg: number;
  bodyFatPct?: number | null;
  bodyFatMassKg?: number | null;
  leanBodyMassKg?: number | null;
  skeletalMuscleMassKg?: number | null;
  totalBodyWaterKg?: number | null;
  proteinKg?: number | null;
  mineralsKg?: number | null;

  // Segmental lean mass (kg)
  segmentalLeanRightArm?: number | null;
  segmentalLeanLeftArm?: number | null;
  segmentalLeanTrunk?: number | null;
  segmentalLeanRightLeg?: number | null;
  segmentalLeanLeftLeg?: number | null;

  // Segmental fat mass (kg)
  segmentalFatRightArm?: number | null;
  segmentalFatLeftArm?: number | null;
  segmentalFatTrunk?: number | null;
  segmentalFatRightLeg?: number | null;
  segmentalFatLeftLeg?: number | null;

  // Metabolic / visceral
  measuredBmr?: number | null;
  visceralFatLevel?: number | null;
  visceralFatAreaCm2?: number | null;
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
  declare scanDevice: string | null;

  declare weightKg: number;
  declare bodyFatPct: number | null;
  declare bodyFatMassKg: number | null;
  declare leanBodyMassKg: number | null;
  declare skeletalMuscleMassKg: number | null;
  declare totalBodyWaterKg: number | null;
  declare proteinKg: number | null;
  declare mineralsKg: number | null;

  declare segmentalLeanRightArm: number | null;
  declare segmentalLeanLeftArm: number | null;
  declare segmentalLeanTrunk: number | null;
  declare segmentalLeanRightLeg: number | null;
  declare segmentalLeanLeftLeg: number | null;

  declare segmentalFatRightArm: number | null;
  declare segmentalFatLeftArm: number | null;
  declare segmentalFatTrunk: number | null;
  declare segmentalFatRightLeg: number | null;
  declare segmentalFatLeftLeg: number | null;

  declare measuredBmr: number | null;
  declare visceralFatLevel: number | null;
  declare visceralFatAreaCm2: number | null;
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
    scanDevice: {
      type: DataTypes.STRING(50),
      field: "scan_device",
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
    bodyFatMassKg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "body_fat_mass_kg",
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
    mineralsKg: {
      type: DataTypes.DECIMAL(4, 1),
      field: "minerals_kg",
    },

    segmentalLeanRightArm: {
      type: DataTypes.DECIMAL(4, 1),
      field: "segmental_lean_right_arm",
    },
    segmentalLeanLeftArm: {
      type: DataTypes.DECIMAL(4, 1),
      field: "segmental_lean_left_arm",
    },
    segmentalLeanTrunk: {
      type: DataTypes.DECIMAL(5, 1),
      field: "segmental_lean_trunk",
    },
    segmentalLeanRightLeg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "segmental_lean_right_leg",
    },
    segmentalLeanLeftLeg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "segmental_lean_left_leg",
    },

    segmentalFatRightArm: {
      type: DataTypes.DECIMAL(4, 1),
      field: "segmental_fat_right_arm",
    },
    segmentalFatLeftArm: {
      type: DataTypes.DECIMAL(4, 1),
      field: "segmental_fat_left_arm",
    },
    segmentalFatTrunk: {
      type: DataTypes.DECIMAL(5, 1),
      field: "segmental_fat_trunk",
    },
    segmentalFatRightLeg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "segmental_fat_right_leg",
    },
    segmentalFatLeftLeg: {
      type: DataTypes.DECIMAL(5, 1),
      field: "segmental_fat_left_leg",
    },

    measuredBmr: {
      type: DataTypes.INTEGER,
      field: "measured_bmr",
    },
    visceralFatLevel: {
      type: DataTypes.INTEGER,
      field: "visceral_fat_level",
      validate: { min: 1, max: 30 },
    },
    visceralFatAreaCm2: {
      type: DataTypes.DECIMAL(6, 1),
      field: "visceral_fat_area_cm2",
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
