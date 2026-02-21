"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Valuation = exports.LedgerEntry = exports.Payment = exports.Invoice = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Invoice extends sequelize_1.Model {
}
exports.Invoice = Invoice;
Invoice.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    invoiceNumber: { type: sequelize_1.DataTypes.STRING(50), unique: true, allowNull: false, field: 'invoice_number' },
    contractId: { type: sequelize_1.DataTypes.UUID, field: 'contract_id' },
    playerId: { type: sequelize_1.DataTypes.UUID, field: 'player_id' },
    clubId: { type: sequelize_1.DataTypes.UUID, field: 'club_id' },
    amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    taxAmount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'tax_amount' },
    totalAmount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false, field: 'total_amount' },
    currency: { type: sequelize_1.DataTypes.STRING(3), defaultValue: 'SAR' },
    status: { type: sequelize_1.DataTypes.ENUM('Paid', 'Expected', 'Overdue', 'Cancelled'), defaultValue: 'Expected' },
    issueDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW, field: 'issue_date' },
    dueDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
    paidDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'paid_date' },
    description: { type: sequelize_1.DataTypes.TEXT },
    lineItems: { type: sequelize_1.DataTypes.JSONB, defaultValue: [], field: 'line_items' },
    documentUrl: { type: sequelize_1.DataTypes.TEXT, field: 'document_url' },
    createdBy: { type: sequelize_1.DataTypes.UUID, field: 'created_by' },
}, { sequelize: database_1.sequelize, tableName: 'invoices', underscored: true, timestamps: true });
class Payment extends sequelize_1.Model {
}
exports.Payment = Payment;
Payment.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    invoiceId: { type: sequelize_1.DataTypes.UUID, field: 'invoice_id' },
    milestoneId: { type: sequelize_1.DataTypes.UUID, field: 'milestone_id' },
    playerId: { type: sequelize_1.DataTypes.UUID, field: 'player_id' },
    amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: sequelize_1.DataTypes.STRING(3), defaultValue: 'SAR' },
    paymentType: { type: sequelize_1.DataTypes.ENUM('Commission', 'Sponsorship', 'Bonus'), allowNull: false, defaultValue: 'Commission', field: 'payment_type' },
    status: { type: sequelize_1.DataTypes.ENUM('Paid', 'Expected', 'Overdue', 'Cancelled'), defaultValue: 'Expected' },
    dueDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
    paidDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'paid_date' },
    reference: { type: sequelize_1.DataTypes.STRING(255) },
    payer: { type: sequelize_1.DataTypes.STRING(255) },
    notes: { type: sequelize_1.DataTypes.TEXT },
}, { sequelize: database_1.sequelize, tableName: 'payments', underscored: true, timestamps: true });
class LedgerEntry extends sequelize_1.Model {
}
exports.LedgerEntry = LedgerEntry;
LedgerEntry.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    transactionId: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, field: 'transaction_id' },
    side: { type: sequelize_1.DataTypes.ENUM('Debit', 'Credit'), allowNull: false },
    account: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    amount: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: sequelize_1.DataTypes.STRING(3), defaultValue: 'SAR' },
    description: { type: sequelize_1.DataTypes.TEXT },
    referenceType: { type: sequelize_1.DataTypes.STRING(100), field: 'reference_type' },
    referenceId: { type: sequelize_1.DataTypes.UUID, field: 'reference_id' },
    playerId: { type: sequelize_1.DataTypes.UUID, field: 'player_id' },
    postedAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW, field: 'posted_at' },
    createdBy: { type: sequelize_1.DataTypes.UUID, field: 'created_by' },
}, { sequelize: database_1.sequelize, tableName: 'ledger_entries', underscored: true, timestamps: false });
class Valuation extends sequelize_1.Model {
}
exports.Valuation = Valuation;
Valuation.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    playerId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'player_id' },
    value: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: sequelize_1.DataTypes.STRING(3), defaultValue: 'SAR' },
    source: { type: sequelize_1.DataTypes.STRING(255) },
    trend: { type: sequelize_1.DataTypes.ENUM('up', 'down', 'stable'), defaultValue: 'stable' },
    changePct: { type: sequelize_1.DataTypes.DECIMAL(5, 2), field: 'change_pct' },
    valuedAt: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW, field: 'valued_at' },
    notes: { type: sequelize_1.DataTypes.TEXT },
}, { sequelize: database_1.sequelize, tableName: 'valuations', underscored: true, timestamps: true, updatedAt: false });
//# sourceMappingURL=finance.model.js.map