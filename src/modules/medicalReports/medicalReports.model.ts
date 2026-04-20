import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Document } from "@modules/documents/document.model";

export type ParseStatus = "pending" | "parsed" | "manual" | "failed";
export type LabFlag = "H" | "L" | "N" | "" | null;

// ── MedicalReport ─────────────────────────────────────────

export interface MedicalReportAttributes {
  id: string;
  playerId: string;
  documentId: string;
  provider?: string | null;
  reportType?: string | null;
  reportDate?: string | null;
  collectedDate?: string | null;
  reservationId?: string | null;
  parseStatus: ParseStatus;
  summaryNotes?: string | null;
  uploadedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MedicalReportCreation extends Optional<
  MedicalReportAttributes,
  "id" | "parseStatus" | "createdAt" | "updatedAt"
> {}

export class MedicalReport
  extends Model<MedicalReportAttributes, MedicalReportCreation>
  implements MedicalReportAttributes
{
  declare id: string;
  declare playerId: string;
  declare documentId: string;
  declare provider: string | null;
  declare reportType: string | null;
  declare reportDate: string | null;
  declare collectedDate: string | null;
  declare reservationId: string | null;
  declare parseStatus: ParseStatus;
  declare summaryNotes: string | null;
  declare uploadedBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

MedicalReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "document_id",
    },
    provider: { type: DataTypes.STRING(200) },
    reportType: { type: DataTypes.STRING(100), field: "report_type" },
    reportDate: { type: DataTypes.DATEONLY, field: "report_date" },
    collectedDate: { type: DataTypes.DATEONLY, field: "collected_date" },
    reservationId: { type: DataTypes.STRING(100), field: "reservation_id" },
    parseStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      field: "parse_status",
    },
    summaryNotes: { type: DataTypes.TEXT, field: "summary_notes" },
    uploadedBy: { type: DataTypes.UUID, field: "uploaded_by" },
  },
  {
    sequelize,
    tableName: "medical_reports",
    underscored: true,
    timestamps: true,
  },
);

// ── MedicalLabResult ─────────────────────────────────────

export interface MedicalLabResultAttributes {
  id: string;
  medicalReportId: string;
  category?: string | null;
  name: string;
  valueNumeric?: number | string | null;
  valueText?: string | null;
  unit?: string | null;
  flag?: LabFlag;
  refRangeLow?: number | string | null;
  refRangeHigh?: number | string | null;
  refRangeText?: string | null;
  comment?: string | null;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MedicalLabResultCreation extends Optional<
  MedicalLabResultAttributes,
  "id" | "sortOrder" | "createdAt" | "updatedAt"
> {}

export class MedicalLabResult
  extends Model<MedicalLabResultAttributes, MedicalLabResultCreation>
  implements MedicalLabResultAttributes
{
  declare id: string;
  declare medicalReportId: string;
  declare category: string | null;
  declare name: string;
  declare valueNumeric: number | string | null;
  declare valueText: string | null;
  declare unit: string | null;
  declare flag: LabFlag;
  declare refRangeLow: number | string | null;
  declare refRangeHigh: number | string | null;
  declare refRangeText: string | null;
  declare comment: string | null;
  declare sortOrder: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

MedicalLabResult.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    medicalReportId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "medical_report_id",
    },
    category: { type: DataTypes.STRING(100) },
    name: { type: DataTypes.STRING(300), allowNull: false },
    valueNumeric: { type: DataTypes.DECIMAL(20, 6), field: "value_numeric" },
    valueText: { type: DataTypes.STRING(200), field: "value_text" },
    unit: { type: DataTypes.STRING(50) },
    flag: { type: DataTypes.STRING(5) },
    refRangeLow: { type: DataTypes.DECIMAL(20, 6), field: "ref_range_low" },
    refRangeHigh: { type: DataTypes.DECIMAL(20, 6), field: "ref_range_high" },
    refRangeText: { type: DataTypes.TEXT, field: "ref_range_text" },
    comment: { type: DataTypes.TEXT },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
  },
  {
    sequelize,
    tableName: "medical_lab_results",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations ─────────────────────────────────────────

MedicalReport.hasMany(MedicalLabResult, {
  foreignKey: "medicalReportId",
  as: "labResults",
  onDelete: "CASCADE",
});
MedicalLabResult.belongsTo(MedicalReport, {
  foreignKey: "medicalReportId",
  as: "report",
});

MedicalReport.belongsTo(Document, {
  foreignKey: "documentId",
  as: "document",
});
