import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Enum Types ──

export type PaymentStatus = 'Paid' | 'Expected' | 'Overdue' | 'Cancelled';
export type PaymentType = 'Commission' | 'Sponsorship' | 'Bonus';
export type ValuationTrend = 'up' | 'down' | 'stable';
export type LedgerSide = 'Debit' | 'Credit';

// ══════════════════════════════════════════
// INVOICE
// ══════════════════════════════════════════

export interface InvoiceAttributes {
  id: string;
  invoiceNumber: string;
  contractId?: string | null;
  playerId?: string | null;
  clubId?: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: PaymentStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  description?: string | null;
  lineItems?: object | null;
  documentUrl?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InvoiceCreation extends Optional<InvoiceAttributes, 'id' | 'invoiceNumber' | 'taxAmount' | 'currency' | 'status' | 'createdAt' | 'updatedAt'> {}

export class Invoice extends Model<InvoiceAttributes, InvoiceCreation> implements InvoiceAttributes {
  declare id: string;
  declare invoiceNumber: string;
  declare contractId: string | null;
  declare playerId: string | null;
  declare clubId: string | null;
  declare amount: number;
  declare taxAmount: number;
  declare totalAmount: number;
  declare currency: string;
  declare status: PaymentStatus;
  declare issueDate: string;
  declare dueDate: string;
  declare paidDate: string | null;
  declare description: string | null;
  declare lineItems: object | null;
  declare documentUrl: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Invoice.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceNumber: { type: DataTypes.STRING(50), unique: true, allowNull: false, field: 'invoice_number' },
  contractId: { type: DataTypes.UUID, field: 'contract_id' },
  playerId: { type: DataTypes.UUID, field: 'player_id' },
  clubId: { type: DataTypes.UUID, field: 'club_id' },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  taxAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'tax_amount' },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'total_amount' },
  currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
  status: { type: DataTypes.ENUM('Paid', 'Expected', 'Overdue', 'Cancelled'), defaultValue: 'Expected' },
  issueDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'issue_date' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  paidDate: { type: DataTypes.DATEONLY, field: 'paid_date' },
  description: { type: DataTypes.TEXT },
  lineItems: { type: DataTypes.JSONB, defaultValue: [], field: 'line_items' },
  documentUrl: { type: DataTypes.TEXT, field: 'document_url' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
}, { sequelize, tableName: 'invoices', underscored: true, timestamps: true });

// ══════════════════════════════════════════
// PAYMENT
// ══════════════════════════════════════════

export interface PaymentAttributes {
  id: string;
  invoiceId?: string | null;
  milestoneId?: string | null;
  playerId?: string | null;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  status: PaymentStatus;
  dueDate: string;
  paidDate?: string | null;
  reference?: string | null;
  payer?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentCreation extends Optional<PaymentAttributes, 'id' | 'currency' | 'status' | 'createdAt' | 'updatedAt'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreation> implements PaymentAttributes {
  declare id: string;
  declare invoiceId: string | null;
  declare milestoneId: string | null;
  declare playerId: string | null;
  declare amount: number;
  declare currency: string;
  declare paymentType: PaymentType;
  declare status: PaymentStatus;
  declare dueDate: string;
  declare paidDate: string | null;
  declare reference: string | null;
  declare payer: string | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceId: { type: DataTypes.UUID, field: 'invoice_id' },
  milestoneId: { type: DataTypes.UUID, field: 'milestone_id' },
  playerId: { type: DataTypes.UUID, field: 'player_id' },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
  paymentType: { type: DataTypes.ENUM('Commission', 'Sponsorship', 'Bonus'), allowNull: false, defaultValue: 'Commission', field: 'payment_type' },
  status: { type: DataTypes.ENUM('Paid', 'Expected', 'Overdue', 'Cancelled'), defaultValue: 'Expected' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  paidDate: { type: DataTypes.DATEONLY, field: 'paid_date' },
  reference: { type: DataTypes.STRING(255) },
  payer: { type: DataTypes.STRING(255) },
  notes: { type: DataTypes.TEXT },
}, { sequelize, tableName: 'payments', underscored: true, timestamps: true });

// ══════════════════════════════════════════
// LEDGER ENTRY (double-entry)
// ══════════════════════════════════════════

export interface LedgerAttributes {
  id: string;
  transactionId: string;
  side: LedgerSide;
  account: string;
  amount: number;
  currency: string;
  description?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  playerId?: string | null;
  postedAt?: Date;
  createdBy?: string | null;
}

interface LedgerCreation extends Optional<LedgerAttributes, 'id' | 'transactionId' | 'currency'> {}

export class LedgerEntry extends Model<LedgerAttributes, LedgerCreation> implements LedgerAttributes {
  declare id: string;
  declare transactionId: string;
  declare side: LedgerSide;
  declare account: string;
  declare amount: number;
  declare currency: string;
  declare description: string | null;
  declare referenceType: string | null;
  declare referenceId: string | null;
  declare playerId: string | null;
  declare postedAt: Date;
  declare createdBy: string | null;
}

LedgerEntry.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transactionId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, field: 'transaction_id' },
  side: { type: DataTypes.ENUM('Debit', 'Credit'), allowNull: false },
  account: { type: DataTypes.STRING(255), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
  description: { type: DataTypes.TEXT },
  referenceType: { type: DataTypes.STRING(100), field: 'reference_type' },
  referenceId: { type: DataTypes.UUID, field: 'reference_id' },
  playerId: { type: DataTypes.UUID, field: 'player_id' },
  postedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'posted_at' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
}, { sequelize, tableName: 'ledger_entries', underscored: true, timestamps: false });

// ══════════════════════════════════════════
// VALUATION
// ══════════════════════════════════════════

export interface ValuationAttributes {
  id: string;
  playerId: string;
  value: number;
  currency: string;
  source?: string | null;
  trend: ValuationTrend;
  changePct?: number | null;
  valuedAt: string;
  notes?: string | null;
  createdAt?: Date;
}

interface ValuationCreation extends Optional<ValuationAttributes, 'id' | 'currency' | 'trend' | 'createdAt'> {}

export class Valuation extends Model<ValuationAttributes, ValuationCreation> implements ValuationAttributes {
  declare id: string;
  declare playerId: string;
  declare value: number;
  declare currency: string;
  declare source: string | null;
  declare trend: ValuationTrend;
  declare changePct: number | null;
  declare valuedAt: string;
  declare notes: string | null;
  declare createdAt: Date;
}

Valuation.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  playerId: { type: DataTypes.UUID, allowNull: false, field: 'player_id' },
  value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
  source: { type: DataTypes.STRING(255) },
  trend: { type: DataTypes.ENUM('up', 'down', 'stable'), defaultValue: 'stable' },
  changePct: { type: DataTypes.DECIMAL(5, 2), field: 'change_pct' },
  valuedAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'valued_at' },
  notes: { type: DataTypes.TEXT },
}, { sequelize, tableName: 'valuations', underscored: true, timestamps: true, updatedAt: false });