import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface ContractTemplateDefaultValues {
  playerContractType?: "Professional" | "Amateur" | "Youth";
  exclusivity?: "Exclusive" | "NonExclusive";
  representationScope?: "Local" | "International" | "Both";
  baseSalary?: number;
  salaryCurrency?: "SAR" | "USD" | "EUR";
  signingBonus?: number;
  releaseClause?: number;
  performanceBonus?: number;
  commissionPct?: number;
  agentName?: string;
  agentLicense?: string;
  notes?: string;
}

interface ContractTemplateAttributes {
  id: string;
  name: string;
  nameAr: string | null;
  contractType: string;
  category: "Club" | "Sponsorship";
  defaultValues: ContractTemplateDefaultValues;
  isActive: boolean;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContractTemplateCreation extends Optional<
  ContractTemplateAttributes,
  "id" | "nameAr" | "isActive" | "createdBy" | "createdAt" | "updatedAt"
> {}

export class ContractTemplate
  extends Model<ContractTemplateAttributes, ContractTemplateCreation>
  implements ContractTemplateAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare contractType: string;
  declare category: "Club" | "Sponsorship";
  declare defaultValues: ContractTemplateDefaultValues;
  declare isActive: boolean;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ContractTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(200),
      field: "name_ar",
    },
    contractType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "contract_type",
    },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    defaultValues: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "default_values",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: {
      type: DataTypes.UUID,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "contract_templates",
    underscored: true,
    timestamps: true,
  },
);
