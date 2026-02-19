import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Gate Number & Status Types ──

export type GateNumber = '0' | '1' | '2' | '3';
export type GateStatus = 'Pending' | 'InProgress' | 'Completed';

// ══════════════════════════════════════════
// GATE MODEL
// ══════════════════════════════════════════

export interface GateAttributes {
  id: string;
  playerId: string;
  gateNumber: GateNumber;
  status: GateStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  approvedBy?: string | null;
  approverRole?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GateCreationAttributes extends Optional<
  GateAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> {}

export class Gate extends Model<GateAttributes, GateCreationAttributes> implements GateAttributes {
  declare id: string;
  declare playerId: string;
  declare gateNumber: GateNumber;
  declare status: GateStatus;
  declare startedAt: Date | null;
  declare completedAt: Date | null;
  declare approvedBy: string | null;
  declare approverRole: string | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Gate.init({
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
  gateNumber: {
    type: DataTypes.ENUM('0', '1', '2', '3'),
    allowNull: false,
    field: 'gate_number',
  },
  status: {
    type: DataTypes.ENUM('Pending', 'InProgress', 'Completed'),
    defaultValue: 'Pending',
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
  },
  approvedBy: {
    type: DataTypes.UUID,
    field: 'approved_by',
  },
  approverRole: {
    type: DataTypes.STRING(100),
    field: 'approver_role',
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  tableName: 'gates',
  underscored: true,
  timestamps: true,
});

// ══════════════════════════════════════════
// GATE CHECKLIST MODEL
// ══════════════════════════════════════════

export interface GateChecklistAttributes {
  id: string;
  gateId: string;
  item: string;
  isCompleted: boolean;
  isMandatory: boolean;
  assignedTo?: string | null;
  completedAt?: Date | null;
  completedBy?: string | null;
  evidenceUrl?: string | null;
  notes?: string | null;
  sortOrder: number;
  createdAt?: Date;
}

interface GateChecklistCreationAttributes extends Optional<
  GateChecklistAttributes,
  'id' | 'isCompleted' | 'isMandatory' | 'sortOrder' | 'createdAt'
> {}

export class GateChecklist extends Model<GateChecklistAttributes, GateChecklistCreationAttributes> implements GateChecklistAttributes {
  declare id: string;
  declare gateId: string;
  declare item: string;
  declare isCompleted: boolean;
  declare isMandatory: boolean;
  declare assignedTo: string | null;
  declare completedAt: Date | null;
  declare completedBy: string | null;
  declare evidenceUrl: string | null;
  declare notes: string | null;
  declare sortOrder: number;
  declare createdAt: Date;
}

GateChecklist.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  gateId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'gate_id',
  },
  item: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_completed',
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_mandatory',
  },
  assignedTo: {
    type: DataTypes.UUID,
    field: 'assigned_to',
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
  },
  completedBy: {
    type: DataTypes.UUID,
    field: 'completed_by',
  },
  evidenceUrl: {
    type: DataTypes.TEXT,
    field: 'evidence_url',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order',
  },
}, {
  sequelize,
  tableName: 'gate_checklists',
  underscored: true,
  timestamps: true,
  updatedAt: false, // no updated_at in DB
});

// ── Associations (within module) ──
