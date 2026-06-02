import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface PostureAssessmentAttributes {
  id: string;
  playerId: string;
  scanDate: string; // DATE as YYYY-MM-DD
  bodyAlignmentDeg?: number | null;
  headTiltDeg?: number | null;
  shoulderAlignmentDeg?: number | null;
  pelvicTiltDeg?: number | null;
  kneeAlignmentDeg?: number | null;
  feetAngleDeg?: number | null;
  overallGrade?: string | null;
  notes?: string | null;
  notesAr?: string | null;
  assessmentTool?: string | null;
  recordedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PostureAssessmentCreation extends Optional<
  PostureAssessmentAttributes,
  | "id"
  | "bodyAlignmentDeg"
  | "headTiltDeg"
  | "shoulderAlignmentDeg"
  | "pelvicTiltDeg"
  | "kneeAlignmentDeg"
  | "feetAngleDeg"
  | "overallGrade"
  | "notes"
  | "notesAr"
  | "assessmentTool"
  | "createdAt"
  | "updatedAt"
> {}

export class PostureAssessment
  extends Model<PostureAssessmentAttributes, PostureAssessmentCreation>
  implements PostureAssessmentAttributes
{
  declare id: string;
  declare playerId: string;
  declare scanDate: string;
  declare bodyAlignmentDeg: number | null;
  declare headTiltDeg: number | null;
  declare shoulderAlignmentDeg: number | null;
  declare pelvicTiltDeg: number | null;
  declare kneeAlignmentDeg: number | null;
  declare feetAngleDeg: number | null;
  declare overallGrade: string | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare assessmentTool: string | null;
  declare recordedBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PostureAssessment.init(
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
    bodyAlignmentDeg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "body_alignment_deg",
    },
    headTiltDeg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "head_tilt_deg",
    },
    shoulderAlignmentDeg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "shoulder_alignment_deg",
    },
    pelvicTiltDeg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "pelvic_tilt_deg",
    },
    kneeAlignmentDeg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "knee_alignment_deg",
    },
    feetAngleDeg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "feet_angle_deg",
    },
    overallGrade: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "overall_grade",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notesAr: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "notes_ar",
    },
    assessmentTool: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "assessment_tool",
    },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "recorded_by",
    },
  },
  {
    sequelize,
    tableName: "posture_assessments",
    underscored: true,
    timestamps: true,
  },
);

export default PostureAssessment;
