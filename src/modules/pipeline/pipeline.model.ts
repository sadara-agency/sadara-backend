import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import Partner from "@modules/partners/partner.model";

export const PIPELINE_PHASES = [
  "Registered",
  "Compliance",
  "Fit-or-Pass",
  "Fit",
  "Passed",
  "Negotiation",
  "Closing",
  "Closed-Won",
  "Settled",
  "Aftercare",
  "Withdrawn",
  "On-Hold",
  "Closed-Lost",
] as const;
export type PipelinePhase = (typeof PIPELINE_PHASES)[number];

interface PipelineAttributes {
  id: string;
  submissionRef: string;
  partnerId: string;
  playerNameEn: string;
  playerNameAr?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  position?: string | null;
  currentClub?: string | null;
  corridor?: string | null;
  contractExpiry?: string | null;
  wageExpectation?: string | null;
  videoLink?: string | null;
  dataLink?: string | null;
  phase: PipelinePhase;
  phaseSince?: Date | null;
  dueDate?: string | null;
  hqOwner?: string | null;
  nextAction?: string | null;
  conflictFlag: boolean;
  conflictNote?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PipelineCreationAttributes extends Optional<
  PipelineAttributes,
  | "id"
  | "submissionRef"
  | "playerNameAr"
  | "dateOfBirth"
  | "nationality"
  | "position"
  | "currentClub"
  | "corridor"
  | "contractExpiry"
  | "wageExpectation"
  | "videoLink"
  | "dataLink"
  | "phaseSince"
  | "dueDate"
  | "hqOwner"
  | "nextAction"
  | "conflictFlag"
  | "conflictNote"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

class Pipeline
  extends Model<PipelineAttributes, PipelineCreationAttributes>
  implements PipelineAttributes
{
  public id!: string;
  public submissionRef!: string;
  public partnerId!: string;
  public playerNameEn!: string;
  public playerNameAr!: string | null;
  public dateOfBirth!: string | null;
  public nationality!: string | null;
  public position!: string | null;
  public currentClub!: string | null;
  public corridor!: string | null;
  public contractExpiry!: string | null;
  public wageExpectation!: string | null;
  public videoLink!: string | null;
  public dataLink!: string | null;
  public phase!: PipelinePhase;
  public phaseSince!: Date | null;
  public dueDate!: string | null;
  public hqOwner!: string | null;
  public nextAction!: string | null;
  public conflictFlag!: boolean;
  public conflictNote!: string | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Pipeline.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    submissionRef: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    playerNameEn: { type: DataTypes.STRING(200), allowNull: false },
    playerNameAr: { type: DataTypes.STRING(200), allowNull: true },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
    nationality: { type: DataTypes.STRING(100), allowNull: true },
    position: { type: DataTypes.STRING(100), allowNull: true },
    currentClub: { type: DataTypes.STRING(200), allowNull: true },
    corridor: { type: DataTypes.STRING(100), allowNull: true },
    contractExpiry: { type: DataTypes.DATEONLY, allowNull: true },
    wageExpectation: { type: DataTypes.STRING(100), allowNull: true },
    videoLink: { type: DataTypes.TEXT, allowNull: true },
    dataLink: { type: DataTypes.TEXT, allowNull: true },
    phase: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Registered",
    },
    phaseSince: { type: DataTypes.DATE, allowNull: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    hqOwner: { type: DataTypes.STRING(200), allowNull: true },
    nextAction: { type: DataTypes.TEXT, allowNull: true },
    conflictFlag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    conflictNote: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "pipeline_submissions",
    underscored: true,
    timestamps: true,
  },
);

Pipeline.belongsTo(Partner, { foreignKey: "partnerId", as: "partner" });
Partner.hasMany(Pipeline, { foreignKey: "partnerId", as: "submissions" });

export default Pipeline;
