import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

// ── ApprovalChainTemplate ──

interface ApprovalChainTemplateAttributes {
  id: string;
  entityType: string;
  action: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApprovalChainTemplateCreation
  extends Optional<
    ApprovalChainTemplateAttributes,
    "id" | "nameAr" | "isActive" | "createdAt" | "updatedAt"
  > {}

export class ApprovalChainTemplate
  extends Model<ApprovalChainTemplateAttributes, ApprovalChainTemplateCreation>
  implements ApprovalChainTemplateAttributes
{
  declare id: string;
  declare entityType: string;
  declare action: string;
  declare name: string;
  declare nameAr: string | null;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association virtual
  declare steps?: ApprovalChainTemplateStep[];
}

ApprovalChainTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "entity_type",
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(200),
      field: "name_ar",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    sequelize,
    tableName: "approval_chain_templates",
    underscored: true,
    timestamps: true,
  },
);

// ── ApprovalChainTemplateStep ──

interface ApprovalChainTemplateStepAttributes {
  id: string;
  templateId: string;
  stepNumber: number;
  approverRole: string;
  label: string;
  labelAr: string | null;
  dueDays: number;
  isMandatory: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApprovalChainTemplateStepCreation
  extends Optional<
    ApprovalChainTemplateStepAttributes,
    "id" | "labelAr" | "dueDays" | "isMandatory" | "createdAt" | "updatedAt"
  > {}

export class ApprovalChainTemplateStep
  extends Model<
    ApprovalChainTemplateStepAttributes,
    ApprovalChainTemplateStepCreation
  >
  implements ApprovalChainTemplateStepAttributes
{
  declare id: string;
  declare templateId: string;
  declare stepNumber: number;
  declare approverRole: string;
  declare label: string;
  declare labelAr: string | null;
  declare dueDays: number;
  declare isMandatory: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ApprovalChainTemplateStep.init(
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
    stepNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "step_number",
    },
    approverRole: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "approver_role",
    },
    label: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    labelAr: {
      type: DataTypes.STRING(200),
      field: "label_ar",
    },
    dueDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: "due_days",
    },
    isMandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_mandatory",
    },
  },
  {
    sequelize,
    tableName: "approval_chain_template_steps",
    underscored: true,
    timestamps: true,
  },
);
