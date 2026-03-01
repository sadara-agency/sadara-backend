"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Clearance = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Clearance extends sequelize_1.Model {
}
exports.Clearance = Clearance;
Clearance.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    contractId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'contract_id',
    },
    playerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'player_id',
    },
    clearanceNumber: {
        type: sequelize_1.DataTypes.STRING(50),
        unique: true,
        field: 'clearance_number',
    },
    reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    terminationDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: 'termination_date',
    },
    outstandingAmount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'outstanding_amount',
    },
    outstandingCurrency: {
        type: sequelize_1.DataTypes.STRING(3),
        defaultValue: 'SAR',
        field: 'outstanding_currency',
    },
    outstandingDetails: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'outstanding_details',
    },
    hasOutstanding: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_outstanding',
    },
    noClaimsDeclaration: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'no_claims_declaration',
    },
    declarationText: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'declaration_text',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Processing', 'Completed'),
        defaultValue: 'Processing',
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
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
    createdBy: {
        type: sequelize_1.DataTypes.UUID,
        field: 'created_by',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'clearances',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=clearance.model.js.map