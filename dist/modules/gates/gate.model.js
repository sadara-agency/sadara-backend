"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GateChecklist = exports.Gate = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Gate extends sequelize_1.Model {
}
exports.Gate = Gate;
Gate.init({
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
    gateNumber: {
        type: sequelize_1.DataTypes.ENUM('0', '1', '2', '3'),
        allowNull: false,
        field: 'gate_number',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Pending', 'InProgress', 'Completed'),
        defaultValue: 'Pending',
    },
    startedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'started_at',
    },
    completedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'completed_at',
    },
    approvedBy: {
        type: sequelize_1.DataTypes.UUID,
        field: 'approved_by',
    },
    approverRole: {
        type: sequelize_1.DataTypes.STRING(100),
        field: 'approver_role',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'gates',
    underscored: true,
    timestamps: true,
});
class GateChecklist extends sequelize_1.Model {
}
exports.GateChecklist = GateChecklist;
GateChecklist.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    gateId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'gate_id',
    },
    item: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
    },
    isCompleted: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_completed',
    },
    isMandatory: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_mandatory',
    },
    assignedTo: {
        type: sequelize_1.DataTypes.UUID,
        field: 'assigned_to',
    },
    completedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'completed_at',
    },
    completedBy: {
        type: sequelize_1.DataTypes.UUID,
        field: 'completed_by',
    },
    evidenceUrl: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'evidence_url',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
    sortOrder: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        field: 'sort_order',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'gate_checklists',
    underscored: true,
    timestamps: true,
    updatedAt: false, // no updated_at in DB
});
// ── Associations (within module) ──
//# sourceMappingURL=gate.model.js.map