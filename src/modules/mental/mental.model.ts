import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

export type AssessmentCategory =
  | "depression"
  | "anxiety"
  | "stress"
  | "burnout"
  | "wellbeing"
  | "custom";

export type SeverityLevel = "normal" | "mild" | "moderate" | "severe";
export type AssessmentStatus = "pending" | "completed" | "reviewed";

export interface QuestionDef {
  text: string;
  textAr?: string;
  type: "scale" | "boolean" | "text";
  min?: number;
  max?: number;
  weight?: number;
}

export interface ScoringRange {
  minScore: number;
  maxScore: number;
  label: string;
  labelAr?: string;
  severity: SeverityLevel;
}

// ── MentalAssessmentTemplate ──

interface TemplateAttributes {
  id: string;
  name: string;
  nameAr: string | null;
  category: AssessmentCategory;
  questions: QuestionDef[];
  scoringRanges: ScoringRange[];
  maxScore: number | null;
  isValidated: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateCreation extends Optional<
  TemplateAttributes,
  | "id"
  | "nameAr"
  | "scoringRanges"
  | "maxScore"
  | "isValidated"
  | "isActive"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class MentalAssessmentTemplate
  extends Model<TemplateAttributes, TemplateCreation>
  implements TemplateAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare category: AssessmentCategory;
  declare questions: QuestionDef[];
  declare scoringRanges: ScoringRange[];
  declare maxScore: number | null;
  declare isValidated: boolean;
  declare isActive: boolean;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MentalAssessmentTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    nameAr: { type: DataTypes.STRING(150), field: "name_ar" },
    category: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "custom",
    },
    questions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    scoringRanges: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: "scoring_ranges",
    },
    maxScore: { type: DataTypes.INTEGER, field: "max_score" },
    isValidated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_validated",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "mental_assessment_templates",
    underscored: true,
    timestamps: true,
  },
);

// ── MentalAssessment ──

export interface ResponseEntry {
  questionIndex: number;
  value: number | boolean | string;
}

interface AssessmentAttributes {
  id: string;
  templateId: string;
  playerId: string;
  administeredBy: string | null;
  assessmentDate: string;
  responses: ResponseEntry[];
  totalScore: number | null;
  severityLevel: SeverityLevel | null;
  clinicalNotes: string | null;
  clinicalNotesAr: string | null;
  recommendedActions: string[];
  followUpDate: string | null;
  isConfidential: boolean;
  status: AssessmentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AssessmentCreation extends Optional<
  AssessmentAttributes,
  | "id"
  | "administeredBy"
  | "totalScore"
  | "severityLevel"
  | "clinicalNotes"
  | "clinicalNotesAr"
  | "recommendedActions"
  | "followUpDate"
  | "isConfidential"
  | "status"
  | "createdAt"
  | "updatedAt"
> {}

export class MentalAssessment
  extends Model<AssessmentAttributes, AssessmentCreation>
  implements AssessmentAttributes
{
  declare id: string;
  declare templateId: string;
  declare playerId: string;
  declare administeredBy: string | null;
  declare assessmentDate: string;
  declare responses: ResponseEntry[];
  declare totalScore: number | null;
  declare severityLevel: SeverityLevel | null;
  declare clinicalNotes: string | null;
  declare clinicalNotesAr: string | null;
  declare recommendedActions: string[];
  declare followUpDate: string | null;
  declare isConfidential: boolean;
  declare status: AssessmentStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare template?: MentalAssessmentTemplate;
  declare player?: Player;
  declare administrator?: User;
}

MentalAssessment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "template_id",
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    administeredBy: { type: DataTypes.UUID, field: "administered_by" },
    assessmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "assessment_date",
    },
    responses: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    totalScore: { type: DataTypes.DECIMAL(6, 2), field: "total_score" },
    severityLevel: { type: DataTypes.STRING(20), field: "severity_level" },
    clinicalNotes: { type: DataTypes.TEXT, field: "clinical_notes" },
    clinicalNotesAr: { type: DataTypes.TEXT, field: "clinical_notes_ar" },
    recommendedActions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: "recommended_actions",
    },
    followUpDate: { type: DataTypes.DATEONLY, field: "follow_up_date" },
    isConfidential: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_confidential",
    },
    status: { type: DataTypes.STRING(20), defaultValue: "completed" },
  },
  {
    sequelize,
    tableName: "mental_assessments",
    underscored: true,
    timestamps: true,
  },
);

// ── Inline associations ──
MentalAssessment.belongsTo(MentalAssessmentTemplate, {
  foreignKey: "templateId",
  as: "template",
});
MentalAssessmentTemplate.hasMany(MentalAssessment, {
  foreignKey: "templateId",
  as: "assessments",
});

MentalAssessment.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(MentalAssessment, {
  foreignKey: "playerId",
  as: "mentalAssessments",
});

MentalAssessment.belongsTo(User, {
  foreignKey: "administeredBy",
  as: "administrator",
});
