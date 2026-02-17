// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.model.ts
// Sequelize model for the contracts table.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ContractAttributes {
  id: string;
  playerId: string;
  clubId: string;
  category: 'Club' | 'Sponsorship';
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
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
  documentUrl: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContractCreationAttributes extends Optional<
  ContractAttributes,
  'id' | 'status' | 'title' | 'salaryCurrency' | 'signingBonus' | 'performanceBonus' |
  'commissionLocked' | 'documentUrl' | 'notes' | 'createdBy' | 'createdAt' | 'updatedAt' |
  'baseSalary' | 'releaseClause' | 'commissionPct' | 'totalCommission'
> {}

export class Contract extends Model<ContractAttributes, ContractCreationAttributes> implements ContractAttributes {
  declare id: string;
  declare playerId: string;
  declare clubId: string;
  declare category: 'Club' | 'Sponsorship';
  declare status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
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
  declare documentUrl: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
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
    defaultValue: 'Club',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Expiring Soon', 'Expired', 'Draft'),
    defaultValue: 'Draft',
  },
  title: {
    type: DataTypes.STRING,
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
  documentUrl: {
    type: DataTypes.TEXT,
    field: 'document_url',
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