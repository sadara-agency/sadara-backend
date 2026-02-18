// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.model.ts
// Sequelize model for the tasks table.
//
// The old task.routes.ts used raw SQL queries because this
// model didn't exist. Now we get type safety, associations,
// and can use Sequelize's query builder consistently.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Attribute interfaces ──
interface TaskAttributes {
    id: string;
    title: string;
    titleAr: string | null;
    description: string | null;
    type: 'Match' | 'Contract' | 'Health' | 'Report' | 'Offer' | 'General';
    status: 'Open' | 'InProgress' | 'Completed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedTo: string | null;
    assignedBy: string | null;
    playerId: string | null;
    matchId: string | null;
    contractId: string | null;
    dueDate: string | null;
    completedAt: Date | null;
    isAutoCreated: boolean;
    triggerRuleId: string | null;
    notes: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface TaskCreationAttributes extends Optional<
    TaskAttributes,
    'id' | 'titleAr' | 'description' | 'type' | 'status' | 'priority' |
    'assignedTo' | 'assignedBy' | 'playerId' | 'matchId' | 'contractId' |
    'dueDate' | 'completedAt' | 'isAutoCreated' | 'triggerRuleId' | 'notes' |
    'createdAt' | 'updatedAt'
> { }

export class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
    declare id: string;
    declare title: string;
    declare titleAr: string | null;
    declare description: string | null;
    declare type: 'Match' | 'Contract' | 'Health' | 'Report' | 'Offer' | 'General';
    declare status: 'Open' | 'InProgress' | 'Completed';
    declare priority: 'low' | 'medium' | 'high' | 'critical';
    declare assignedTo: string | null;
    declare assignedBy: string | null;
    declare playerId: string | null;
    declare matchId: string | null;
    declare contractId: string | null;
    declare dueDate: string | null;
    declare completedAt: Date | null;
    declare isAutoCreated: boolean;
    declare triggerRuleId: string | null;
    declare notes: string | null;
}

Task.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    titleAr: {
        type: DataTypes.STRING(500),
        field: 'title_ar',
    },
    description: {
        type: DataTypes.TEXT,
    },
    type: {
        type: DataTypes.ENUM('Match', 'Contract', 'Health', 'Report', 'Offer', 'General'),
        defaultValue: 'General',
    },
    status: {
        type: DataTypes.ENUM('Open', 'InProgress', 'Completed'),
        defaultValue: 'Open',
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
    },
    assignedTo: {
        type: DataTypes.UUID,
        field: 'assigned_to',
    },
    assignedBy: {
        type: DataTypes.UUID,
        field: 'assigned_by',
    },
    playerId: {
        type: DataTypes.UUID,
        field: 'player_id',
    },
    matchId: {
        type: DataTypes.UUID,
        field: 'match_id',
    },
    contractId: {
        type: DataTypes.UUID,
        field: 'contract_id',
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        field: 'due_date',
    },
    completedAt: {
        type: DataTypes.DATE,
        field: 'completed_at',
    },
    isAutoCreated: {
        type: DataTypes.BOOLEAN,
        field: 'is_auto_created',
        defaultValue: false,
    },
    triggerRuleId: {
        type: DataTypes.UUID,
        field: 'trigger_rule_id',
    },
    notes: {
        type: DataTypes.TEXT,
    },
}, {
    sequelize,
    tableName: 'tasks',
    underscored: true,
    timestamps: true,
});