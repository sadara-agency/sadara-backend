import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ContractAttributes {
  id: string;
  playerId: string;
  clubId: string;
  category: 'Club' | 'Sponsorship';
  contractType: 'Representation' | 'CareerManagement' | 'Transfer' | 'Loan' | 'Renewal' | 'Sponsorship' | 'ImageRights' | 'MedicalAuth';
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft' | 'Review' | 'Signing' | 'Terminated';
  title: string | null;
  startDate: string;
  endDate: string;
  baseSalary: number | null;
  salaryCurrency: 'SAR' | 'USD' | 'EUR';
  signingBonus: number;
  releaseClause: number | null;
  performanceBonus: number;
  commissionPct: number | null;
  totalCommission: number | null;
  commissionLocked: boolean;
  // Representation-specific
  exclusivity: 'Exclusive' | 'NonExclusive';
  representationScope: 'Local' | 'International' | 'Both';
  agentName: string | null;
  agentLicense: string | null;
  // Documents & Signing
  documentUrl: string | null;
  signedDocumentUrl: string | null;
  signedAt: Date | null;
  signingMethod: string | null;
  // Alerts & Termination
  expiryAlertSent: boolean;
  terminatedByClearanceId: string | null;
  // Meta
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContractCreationAttributes extends Optional<
  ContractAttributes,
  'id' | 'category' | 'contractType' | 'status' | 'title' | 'baseSalary' |
  'salaryCurrency' | 'signingBonus' | 'releaseClause' | 'performanceBonus' |
  'commissionPct' | 'totalCommission' | 'commissionLocked' |
  'exclusivity' | 'representationScope' | 'agentName' | 'agentLicense' |
  'documentUrl' | 'signedDocumentUrl' | 'signedAt' | 'signingMethod' |
  'expiryAlertSent' | 'terminatedByClearanceId' |
  'notes' | 'createdBy' | 'createdAt' | 'updatedAt'
> {}

export class Contract extends Model<ContractAttributes, ContractCreationAttributes> implements ContractAttributes {
  declare id: string;
  declare playerId: string;
  declare clubId: string;
  declare category: 'Club' | 'Sponsorship';
  declare contractType: 'Representation' | 'CareerManagement' | 'Transfer' | 'Loan' | 'Renewal' | 'Sponsorship' | 'ImageRights' | 'MedicalAuth';
  declare status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft' | 'Review' | 'Signing' | 'Terminated';
  declare title: string | null;
  declare startDate: string;
  declare endDate: string;
  declare baseSalary: number | null;
  declare salaryCurrency: 'SAR' | 'USD' | 'EUR';
  declare signingBonus: number;
  declare releaseClause: number | null;
  declare performanceBonus: number;
  declare commissionPct: number | null;
  declare totalCommission: number | null;
  declare commissionLocked: boolean;
  declare exclusivity: 'Exclusive' | 'NonExclusive';
  declare representationScope: 'Local' | 'International' | 'Both';
  declare agentName: string | null;
  declare agentLicense: string | null;
  declare documentUrl: string | null;
  declare signedDocumentUrl: string | null;
  declare signedAt: Date | null;
  declare signingMethod: string | null;
  declare expiryAlertSent: boolean;
  declare terminatedByClearanceId: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Contract.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'player_id',
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'club_id',
  },
  category: {
    type: DataTypes.ENUM('Club', 'Sponsorship'),
    allowNull: false,
    defaultValue: 'Club',
  },
  contractType: {
    type: DataTypes.ENUM(
      'Representation', 'CareerManagement', 'Transfer', 'Loan',
      'Renewal', 'Sponsorship', 'ImageRights', 'MedicalAuth',
    ),
    defaultValue: 'Representation',
    field: 'contract_type',
  },
  status: {
    type: DataTypes.ENUM('Active', 'Expiring Soon', 'Expired', 'Draft', 'Review', 'Signing', 'Terminated'),
    defaultValue: 'Draft',
  },
  title: {
    type: DataTypes.STRING(255),
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date',
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date',
  },
  baseSalary: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'base_salary',
  },
  salaryCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'SAR',
    field: 'salary_currency',
  },
  signingBonus: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'signing_bonus',
  },
  releaseClause: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'release_clause',
  },
  performanceBonus: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'performance_bonus',
  },
  commissionPct: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'commission_pct',
  },
  totalCommission: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'total_commission',
  },
  commissionLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'commission_locked',
  },
  // Representation
  exclusivity: {
    type: DataTypes.ENUM('Exclusive', 'NonExclusive'),
    defaultValue: 'Exclusive',
  },
  representationScope: {
    type: DataTypes.ENUM('Local', 'International', 'Both'),
    defaultValue: 'Both',
    field: 'representation_scope',
  },
  agentName: {
    type: DataTypes.STRING(255),
    field: 'agent_name',
  },
  agentLicense: {
    type: DataTypes.STRING(100),
    field: 'agent_license',
  },
  // Documents & Signing
  documentUrl: {
    type: DataTypes.TEXT,
    field: 'document_url',
  },
  signedDocumentUrl: {
    type: DataTypes.TEXT,
    field: 'signed_document_url',
  },
  signedAt: {
    type: DataTypes.DATE,
    field: 'signed_at',
  },
  signingMethod: {
    type: DataTypes.STRING(20),
    field: 'signing_method',
  },
  // Alerts & Termination
  expiryAlertSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'expiry_alert_sent',
  },
  terminatedByClearanceId: {
    type: DataTypes.UUID,
    field: 'terminated_by_clearance_id',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
  },
}, {
  sequelize,
  tableName: 'contracts',
  underscored: true,
  timestamps: true,
});