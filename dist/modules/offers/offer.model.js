"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Offer = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
// ── Model Class ──
class Offer extends sequelize_1.Model {
}
exports.Offer = Offer;
// ── Initialization ──
Offer.init({
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
    fromClubId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'from_club_id',
    },
    toClubId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'to_club_id',
    },
    offerType: {
        type: sequelize_1.DataTypes.ENUM('Transfer', 'Loan'),
        allowNull: false,
        defaultValue: 'Transfer',
        field: 'offer_type',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('New', 'Under Review', 'Negotiation', 'Closed'),
        defaultValue: 'New',
    },
    // Financial terms
    transferFee: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        field: 'transfer_fee',
    },
    salaryOffered: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        field: 'salary_offered',
    },
    contractYears: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'contract_years',
    },
    agentFee: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        field: 'agent_fee',
    },
    feeCurrency: {
        type: sequelize_1.DataTypes.STRING(3),
        defaultValue: 'SAR',
        field: 'fee_currency',
    },
    // Conditions
    conditions: {
        type: sequelize_1.DataTypes.JSONB,
        defaultValue: [],
    },
    counterOffer: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'counter_offer',
    },
    // Timeline
    submittedAt: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'submitted_at',
    },
    deadline: {
        type: sequelize_1.DataTypes.DATEONLY,
    },
    respondedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'responded_at',
    },
    closedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'closed_at',
    },
    // Notes & meta
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
    createdBy: {
        type: sequelize_1.DataTypes.UUID,
        field: 'created_by',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'offers',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=offer.model.js.map