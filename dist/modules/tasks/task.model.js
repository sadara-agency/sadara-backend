"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.model.ts
// Sequelize model for the tasks table.
//
// The old task.routes.ts used raw SQL queries because this
// model didn't exist. Now we get type safety, associations,
// and can use Sequelize's query builder consistently.
// ─────────────────────────────────────────────────────────────
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Task extends sequelize_1.Model {
}
exports.Task = Task;
Task.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
    },
    titleAr: {
        type: sequelize_1.DataTypes.STRING(500),
        field: 'title_ar',
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('Match', 'Contract', 'Health', 'Report', 'Offer', 'General'),
        defaultValue: 'General',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Open', 'InProgress', 'Completed'),
        defaultValue: 'Open',
    },
    priority: {
        type: sequelize_1.DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
    },
    assignedTo: {
        type: sequelize_1.DataTypes.UUID,
        field: 'assigned_to',
    },
    assignedBy: {
        type: sequelize_1.DataTypes.UUID,
        field: 'assigned_by',
    },
    playerId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'player_id',
    },
    matchId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'match_id',
    },
    contractId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'contract_id',
    },
    dueDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        field: 'due_date',
    },
    completedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'completed_at',
    },
    isAutoCreated: {
        type: sequelize_1.DataTypes.BOOLEAN,
        field: 'is_auto_created',
        defaultValue: false,
    },
    triggerRuleId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'trigger_rule_id',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'tasks',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=task.model.js.map