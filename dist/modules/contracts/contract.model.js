"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Contract extends sequelize_1.Model {
}
exports.Contract = Contract;
Contract.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    playerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'player_id',
    },
    clubId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'club_id',
    },
    category: {
        type: sequelize_1.DataTypes.ENUM('Club', 'Sponsorship'),
        allowNull: false,
        defaultValue: 'Club',
    },
    contractType: {
        type: sequelize_1.DataTypes.ENUM('Representation', 'CareerManagement', 'Transfer', 'Loan', 'Renewal', 'Sponsorship', 'ImageRights', 'MedicalAuth'),
        defaultValue: 'Representation',
        field: 'contract_type',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Active', 'Expiring Soon', 'Expired', 'Draft', 'Review', 'Signing', 'Terminated'),
        defaultValue: 'Draft',
    },
    title: {
        type: sequelize_1.DataTypes.STRING(255),
    },
    startDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date',
    },
    endDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: 'end_date',
    },
    baseSalary: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        field: 'base_salary',
    },
    salaryCurrency: {
        type: sequelize_1.DataTypes.STRING(3),
        defaultValue: 'SAR',
        field: 'salary_currency',
    },
    signingBonus: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'signing_bonus',
    },
    releaseClause: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        field: 'release_clause',
    },
    performanceBonus: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'performance_bonus',
    },
    commissionPct: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        field: 'commission_pct',
    },
    totalCommission: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        field: 'total_commission',
    },
    commissionLocked: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'commission_locked',
    },
    // Representation
    exclusivity: {
        type: sequelize_1.DataTypes.ENUM('Exclusive', 'NonExclusive'),
        defaultValue: 'Exclusive',
    },
    representationScope: {
        type: sequelize_1.DataTypes.ENUM('Local', 'International', 'Both'),
        defaultValue: 'Both',
        field: 'representation_scope',
    },
    agentName: {
        type: sequelize_1.DataTypes.STRING(255),
        field: 'agent_name',
    },
    agentLicense: {
        type: sequelize_1.DataTypes.STRING(100),
        field: 'agent_license',
    },
    // Documents & Signing
    documentUrl: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'document_url',
    },
    signedDocumentUrl: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'signed_document_url',
    },
    signedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'signed_at',
    },
    signingMethod: {
        type: sequelize_1.DataTypes.STRING(20),
        field: 'signing_method',
    },
    // Alerts & Termination
    expiryAlertSent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'expiry_alert_sent',
    },
    terminatedByClearanceId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'terminated_by_clearance_id',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
    createdBy: {
        type: sequelize_1.DataTypes.UUID,
        field: 'created_by',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'contracts',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=contract.model.js.map