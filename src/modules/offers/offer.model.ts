import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Attribute Interfaces ──

interface OfferAttributes {
  id: string;
  playerId: string;
  fromClubId?: string | null;
  toClubId?: string | null;
  offerType: 'Transfer' | 'Loan';
  status: 'New' | 'Under Review' | 'Negotiation' | 'Closed';

  // Financial terms
  transferFee?: number | null;
  salaryOffered?: number | null;
  contractYears?: number | null;
  agentFee?: number | null;
  feeCurrency: string;

  // Conditions
  conditions?: object | null;
  counterOffer?: object | null;

  // Timeline
  submittedAt?: Date | null;
  deadline?: string | null;
  respondedAt?: Date | null;
  closedAt?: Date | null;

  // Notes & meta
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OfferCreationAttributes extends Optional<
  OfferAttributes,
  'id' | 'offerType' | 'status' | 'feeCurrency' | 'submittedAt' | 'createdAt' | 'updatedAt'
> {}

// ── Model Class ──

export class Offer extends Model<OfferAttributes, OfferCreationAttributes> implements OfferAttributes {
  declare id: string;
  declare playerId: string;
  declare fromClubId: string | null;
  declare toClubId: string | null;
  declare offerType: 'Transfer' | 'Loan';
  declare status: 'New' | 'Under Review' | 'Negotiation' | 'Closed';

  declare transferFee: number | null;
  declare salaryOffered: number | null;
  declare contractYears: number | null;
  declare agentFee: number | null;
  declare feeCurrency: string;

  declare conditions: object | null;
  declare counterOffer: object | null;

  declare submittedAt: Date | null;
  declare deadline: string | null;
  declare respondedAt: Date | null;
  declare closedAt: Date | null;

  declare notes: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

Offer.init({
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
  fromClubId: {
    type: DataTypes.UUID,
    field: 'from_club_id',
  },
  toClubId: {
    type: DataTypes.UUID,
    field: 'to_club_id',
  },
  offerType: {
    type: DataTypes.ENUM('Transfer', 'Loan'),
    allowNull: false,
    defaultValue: 'Transfer',
    field: 'offer_type',
  },
  status: {
    type: DataTypes.ENUM('New', 'Under Review', 'Negotiation', 'Closed'),
    defaultValue: 'New',
  },

  // Financial terms
  transferFee: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'transfer_fee',
  },
  salaryOffered: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'salary_offered',
  },
  contractYears: {
    type: DataTypes.INTEGER,
    field: 'contract_years',
  },
  agentFee: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'agent_fee',
  },
  feeCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'SAR',
    field: 'fee_currency',
  },

  // Conditions
  conditions: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  counterOffer: {
    type: DataTypes.JSONB,
    field: 'counter_offer',
  },

  // Timeline
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
  },
  deadline: {
    type: DataTypes.DATEONLY,
  },
  respondedAt: {
    type: DataTypes.DATE,
    field: 'responded_at',
  },
  closedAt: {
    type: DataTypes.DATE,
    field: 'closed_at',
  },

  // Notes & meta
  notes: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
  },
}, {
  sequelize,
  tableName: 'offers',
  underscored: true,
  timestamps: true,
});