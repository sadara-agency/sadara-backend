import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { encryptFields, decryptFields } from "@shared/utils/encryption";

export type PlayerContractType = "Professional" | "Amateur" | "Youth";

interface ContractAttributes {
  id: string;
  playerId: string;
  clubId: string;
  category: "Club" | "Sponsorship";
  contractType:
    | "Representation"
    | "CareerManagement"
    | "Transfer"
    | "Loan"
    | "Renewal"
    | "Sponsorship"
    | "ImageRights"
    | "MedicalAuth"
    | "Termination";
  playerContractType: PlayerContractType | null;
  status:
    | "Active"
    | "Expiring Soon"
    | "Expired"
    | "Draft"
    | "Review"
    | "Signing"
    | "AwaitingPlayer"
    | "Terminated";
  title: string | null;
  startDate: string;
  endDate: string;
  baseSalary: number | null;
  salaryCurrency: "SAR" | "USD" | "EUR";
  signingBonus: number;
  releaseClause: number | null;
  performanceBonus: number;
  commissionPct: number | null;
  totalCommission: number | null;
  commissionLocked: boolean;
  // Representation-specific
  exclusivity: "Exclusive" | "NonExclusive";
  representationScope: "Local" | "International" | "Both";
  agentName: string | null;
  agentLicense: string | null;
  // Documents & Signing (player side)
  documentUrl: string | null;
  signedDocumentUrl: string | null;
  signedAt: Date | null;
  signingMethod: string | null;
  // Agent-side signing (two-sided workflow)
  agentSignatureData: string | null;
  agentSignedAt: Date | null;
  agentSigningMethod: string | null;
  // Alerts & Termination
  expiryAlertSent: boolean;
  terminatedByClearanceId: string | null;
  // Termination-type specific fields
  terminationReason: string | null;
  terminationDate: string | null;
  clearanceNumber: string | null;
  outstandingAmount: number | null;
  outstandingCurrency: string | null;
  outstandingDetails: string | null;
  hasOutstanding: boolean;
  noClaimsDeclaration: boolean;
  declarationText: string | null;
  parentContractId: string | null;
  // Meta
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContractCreationAttributes extends Optional<
  ContractAttributes,
  | "id"
  | "category"
  | "contractType"
  | "playerContractType"
  | "status"
  | "title"
  | "baseSalary"
  | "salaryCurrency"
  | "signingBonus"
  | "releaseClause"
  | "performanceBonus"
  | "commissionPct"
  | "totalCommission"
  | "commissionLocked"
  | "exclusivity"
  | "representationScope"
  | "agentName"
  | "agentLicense"
  | "documentUrl"
  | "signedDocumentUrl"
  | "signedAt"
  | "signingMethod"
  | "agentSignatureData"
  | "agentSignedAt"
  | "agentSigningMethod"
  | "expiryAlertSent"
  | "terminatedByClearanceId"
  | "terminationReason"
  | "terminationDate"
  | "clearanceNumber"
  | "outstandingAmount"
  | "outstandingCurrency"
  | "outstandingDetails"
  | "hasOutstanding"
  | "noClaimsDeclaration"
  | "declarationText"
  | "parentContractId"
  | "notes"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class Contract
  extends Model<ContractAttributes, ContractCreationAttributes>
  implements ContractAttributes
{
  declare id: string;
  declare playerId: string;
  declare clubId: string;
  declare category: "Club" | "Sponsorship";
  declare contractType:
    | "Representation"
    | "CareerManagement"
    | "Transfer"
    | "Loan"
    | "Renewal"
    | "Sponsorship"
    | "ImageRights"
    | "MedicalAuth"
    | "Termination";
  declare playerContractType: PlayerContractType | null;
  declare status:
    | "Active"
    | "Expiring Soon"
    | "Expired"
    | "Draft"
    | "Review"
    | "Signing"
    | "AwaitingPlayer"
    | "Terminated";
  declare title: string | null;
  declare startDate: string;
  declare endDate: string;
  declare baseSalary: number | null;
  declare salaryCurrency: "SAR" | "USD" | "EUR";
  declare signingBonus: number;
  declare releaseClause: number | null;
  declare performanceBonus: number;
  declare commissionPct: number | null;
  declare totalCommission: number | null;
  declare commissionLocked: boolean;
  declare exclusivity: "Exclusive" | "NonExclusive";
  declare representationScope: "Local" | "International" | "Both";
  declare agentName: string | null;
  declare agentLicense: string | null;
  declare documentUrl: string | null;
  declare signedDocumentUrl: string | null;
  declare signedAt: Date | null;
  declare signingMethod: string | null;
  declare agentSignatureData: string | null;
  declare agentSignedAt: Date | null;
  declare agentSigningMethod: string | null;
  declare expiryAlertSent: boolean;
  declare terminatedByClearanceId: string | null;
  declare terminationReason: string | null;
  declare terminationDate: string | null;
  declare clearanceNumber: string | null;
  declare outstandingAmount: number | null;
  declare outstandingCurrency: string | null;
  declare outstandingDetails: string | null;
  declare hasOutstanding: boolean;
  declare noClaimsDeclaration: boolean;
  declare declarationText: string | null;
  declare parentContractId: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Contract.init(
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
    clubId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "club_id",
    },
    category: {
      type: DataTypes.ENUM("Club", "Sponsorship"),
      allowNull: false,
      defaultValue: "Club",
    },
    contractType: {
      type: DataTypes.ENUM(
        "Representation",
        "CareerManagement",
        "Transfer",
        "Loan",
        "Renewal",
        "Sponsorship",
        "ImageRights",
        "MedicalAuth",
        "Termination",
      ),
      defaultValue: "Representation",
      field: "contract_type",
    },
    playerContractType: {
      type: DataTypes.ENUM("Professional", "Amateur", "Youth"),
      allowNull: true,
      defaultValue: null,
      field: "player_contract_type",
    },
    status: {
      type: DataTypes.ENUM(
        "Active",
        "Expiring Soon",
        "Expired",
        "Draft",
        "Review",
        "Signing",
        "AwaitingPlayer",
        "Terminated",
      ),
      defaultValue: "Draft",
    },
    title: {
      type: DataTypes.STRING(255),
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date",
    },
    baseSalary: {
      type: DataTypes.TEXT,
      field: "base_salary",
    },
    salaryCurrency: {
      type: DataTypes.STRING(3),
      defaultValue: "SAR",
      field: "salary_currency",
    },
    signingBonus: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: "signing_bonus",
    },
    releaseClause: {
      type: DataTypes.DECIMAL(15, 2),
      field: "release_clause",
    },
    performanceBonus: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: "performance_bonus",
    },
    commissionPct: {
      type: DataTypes.TEXT,
      field: "commission_pct",
    },
    totalCommission: {
      type: DataTypes.TEXT,
      field: "total_commission",
    },
    commissionLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "commission_locked",
    },
    // Representation
    exclusivity: {
      type: DataTypes.ENUM("Exclusive", "NonExclusive"),
      defaultValue: "Exclusive",
    },
    representationScope: {
      type: DataTypes.ENUM("Local", "International", "Both"),
      defaultValue: "Both",
      field: "representation_scope",
    },
    agentName: {
      type: DataTypes.STRING(255),
      field: "agent_name",
    },
    agentLicense: {
      type: DataTypes.STRING(100),
      field: "agent_license",
    },
    // Documents & Signing (player side)
    documentUrl: {
      type: DataTypes.TEXT,
      field: "document_url",
    },
    signedDocumentUrl: {
      type: DataTypes.TEXT,
      field: "signed_document_url",
    },
    signedAt: {
      type: DataTypes.DATE,
      field: "signed_at",
    },
    signingMethod: {
      type: DataTypes.STRING(20),
      field: "signing_method",
    },
    // Agent-side signing (two-sided workflow)
    agentSignatureData: {
      type: DataTypes.TEXT,
      field: "agent_signature_data",
    },
    agentSignedAt: {
      type: DataTypes.DATE,
      field: "agent_signed_at",
    },
    agentSigningMethod: {
      type: DataTypes.STRING(20),
      field: "agent_signing_method",
    },
    // Alerts & Termination
    expiryAlertSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "expiry_alert_sent",
    },
    terminatedByClearanceId: {
      type: DataTypes.UUID,
      field: "terminated_by_clearance_id",
    },
    terminationReason: {
      type: DataTypes.TEXT,
      field: "termination_reason",
    },
    terminationDate: {
      type: DataTypes.DATEONLY,
      field: "termination_date",
    },
    clearanceNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      field: "clearance_number",
    },
    outstandingAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: "outstanding_amount",
    },
    outstandingCurrency: {
      type: DataTypes.STRING(3),
      defaultValue: "SAR",
      field: "outstanding_currency",
    },
    outstandingDetails: {
      type: DataTypes.TEXT,
      field: "outstanding_details",
    },
    hasOutstanding: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "has_outstanding",
    },
    noClaimsDeclaration: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "no_claims_declaration",
    },
    declarationText: {
      type: DataTypes.TEXT,
      field: "declaration_text",
    },
    parentContractId: {
      type: DataTypes.UUID,
      field: "parent_contract_id",
      references: { model: "contracts", key: "id" },
    },
    notes: {
      type: DataTypes.TEXT,
    },
    createdBy: {
      type: DataTypes.UUID,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "contracts",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["club_id"] },
      { fields: ["status"] },
      { fields: ["end_date"] },
    ],
  },
);

// ── Encryption at rest for sensitive financial fields ──
const ENCRYPTED_CONTRACT_FIELDS = [
  "baseSalary",
  "commissionPct",
  "totalCommission",
];
Contract.addHook("beforeSave", encryptFields(ENCRYPTED_CONTRACT_FIELDS));
Contract.addHook("afterFind", decryptFields(ENCRYPTED_CONTRACT_FIELDS));
