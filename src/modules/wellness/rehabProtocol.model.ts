import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── RehabProtocol ──

interface RehabProtocolAttributes {
  id: string;
  playerId: string;
  name: string;
  nameAr?: string | null;
  status: string;
  injuryId?: string | null;
  clearanceRequired: boolean;
  clearanceGranted: boolean;
  clearanceGrantedBy?: string | null;
  clearanceGrantedAt?: Date | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  phases?: RehabPhase[];
}

interface RehabProtocolCreation extends Optional<
  RehabProtocolAttributes,
  | "id"
  | "nameAr"
  | "status"
  | "injuryId"
  | "clearanceRequired"
  | "clearanceGranted"
  | "clearanceGrantedBy"
  | "clearanceGrantedAt"
  | "startDate"
  | "targetEndDate"
  | "notes"
  | "createdAt"
  | "updatedAt"
  | "phases"
> {}

export class RehabProtocol
  extends Model<RehabProtocolAttributes, RehabProtocolCreation>
  implements RehabProtocolAttributes
{
  declare id: string;
  declare playerId: string;
  declare name: string;
  declare nameAr: string | null;
  declare status: string;
  declare injuryId: string | null;
  declare clearanceRequired: boolean;
  declare clearanceGranted: boolean;
  declare clearanceGrantedBy: string | null;
  declare clearanceGrantedAt: Date | null;
  declare startDate: string | null;
  declare targetEndDate: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare phases?: RehabPhase[];
}

RehabProtocol.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    name: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: true, field: "name_ar" },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
    injuryId: { type: DataTypes.UUID, allowNull: true, field: "injury_id" },
    clearanceRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "clearance_required",
    },
    clearanceGranted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "clearance_granted",
    },
    clearanceGrantedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "clearance_granted_by",
    },
    clearanceGrantedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "clearance_granted_at",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "start_date",
    },
    targetEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "target_end_date",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: "created_by" },
  },
  {
    sequelize,
    tableName: "rehab_protocols",
    underscored: true,
    timestamps: true,
  },
);

// ── RehabPhase ──

interface RehabPhaseAttributes {
  id: string;
  protocolId: string;
  name: string;
  nameAr?: string | null;
  orderIndex: number;
  focusArea?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  exercises?: RehabPhaseExercise[];
}

interface RehabPhaseCreation extends Optional<
  RehabPhaseAttributes,
  | "id"
  | "nameAr"
  | "orderIndex"
  | "focusArea"
  | "notes"
  | "createdAt"
  | "updatedAt"
  | "exercises"
> {}

export class RehabPhase
  extends Model<RehabPhaseAttributes, RehabPhaseCreation>
  implements RehabPhaseAttributes
{
  declare id: string;
  declare protocolId: string;
  declare name: string;
  declare nameAr: string | null;
  declare orderIndex: number;
  declare focusArea: string | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare exercises?: RehabPhaseExercise[];
}

RehabPhase.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    protocolId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "protocol_id",
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: true, field: "name_ar" },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
    },
    focusArea: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "focus_area",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "rehab_phases", underscored: true, timestamps: true },
);

// ── RehabPhaseExercise ──

interface RehabPhaseExerciseAttributes {
  id: string;
  phaseId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeightKg?: number | null;
  restSeconds?: number | null;
  loadLevel: string;
  caution: boolean;
  cautionNote?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RehabPhaseExerciseCreation extends Optional<
  RehabPhaseExerciseAttributes,
  | "id"
  | "orderIndex"
  | "targetSets"
  | "targetReps"
  | "targetWeightKg"
  | "restSeconds"
  | "loadLevel"
  | "caution"
  | "cautionNote"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class RehabPhaseExercise
  extends Model<RehabPhaseExerciseAttributes, RehabPhaseExerciseCreation>
  implements RehabPhaseExerciseAttributes
{
  declare id: string;
  declare phaseId: string;
  declare exerciseId: string;
  declare orderIndex: number;
  declare targetSets: number;
  declare targetReps: string;
  declare targetWeightKg: number | null;
  declare restSeconds: number | null;
  declare loadLevel: string;
  declare caution: boolean;
  declare cautionNote: string | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

RehabPhaseExercise.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phaseId: { type: DataTypes.UUID, allowNull: false, field: "phase_id" },
    exerciseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "exercise_id",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
    },
    targetSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: "target_sets",
    },
    targetReps: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "10",
      field: "target_reps",
    },
    targetWeightKg: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: true,
      field: "target_weight_kg",
    },
    restSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
      field: "rest_seconds",
    },
    loadLevel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "bodyweight",
      field: "load_level",
    },
    caution: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    cautionNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "caution_note",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "rehab_phase_exercises",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations ──

RehabProtocol.hasMany(RehabPhase, {
  foreignKey: "protocolId",
  as: "phases",
  onDelete: "CASCADE",
});
RehabPhase.belongsTo(RehabProtocol, {
  foreignKey: "protocolId",
  as: "protocol",
});

RehabPhase.hasMany(RehabPhaseExercise, {
  foreignKey: "phaseId",
  as: "exercises",
  onDelete: "CASCADE",
});
RehabPhaseExercise.belongsTo(RehabPhase, {
  foreignKey: "phaseId",
  as: "phase",
});

export default RehabProtocol;
