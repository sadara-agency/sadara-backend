import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Injury } from "@modules/injuries/injury.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

// ── Phase progression order ──
export const RTP_PHASES = [
  "rest",
  "light_training",
  "partial_training",
  "full_training",
  "match_ready",
  "returned",
] as const;
export type RtpPhase = (typeof RTP_PHASES)[number];
export type RtpStatus = "active" | "completed" | "aborted";

// ── RtpProtocol ──

interface RtpProtocolAttributes {
  id: string;
  injuryId: string;
  playerId: string;
  startDate: string;
  targetReturnDate: string | null;
  actualReturnDate: string | null;
  currentPhase: RtpPhase;
  status: RtpStatus;
  medicalNotes: string | null;
  medicalNotesAr: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RtpProtocolCreationAttributes extends Optional<
  RtpProtocolAttributes,
  | "id"
  | "targetReturnDate"
  | "actualReturnDate"
  | "currentPhase"
  | "status"
  | "medicalNotes"
  | "medicalNotesAr"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class RtpProtocol
  extends Model<RtpProtocolAttributes, RtpProtocolCreationAttributes>
  implements RtpProtocolAttributes
{
  declare id: string;
  declare injuryId: string;
  declare playerId: string;
  declare startDate: string;
  declare targetReturnDate: string | null;
  declare actualReturnDate: string | null;
  declare currentPhase: RtpPhase;
  declare status: RtpStatus;
  declare medicalNotes: string | null;
  declare medicalNotesAr: string | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Virtual associations (populated by includes)
  declare injury?: Injury;
  declare player?: Player;
  declare creator?: User;
  declare phaseLogs?: RtpPhaseLog[];
}

RtpProtocol.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    injuryId: { type: DataTypes.UUID, allowNull: false, field: "injury_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    targetReturnDate: { type: DataTypes.DATEONLY, field: "target_return_date" },
    actualReturnDate: { type: DataTypes.DATEONLY, field: "actual_return_date" },
    currentPhase: {
      type: DataTypes.STRING(50),
      defaultValue: "rest",
      field: "current_phase",
    },
    status: { type: DataTypes.STRING(20), defaultValue: "active" },
    medicalNotes: { type: DataTypes.TEXT, field: "medical_notes" },
    medicalNotesAr: { type: DataTypes.TEXT, field: "medical_notes_ar" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "rtp_protocols",
    underscored: true,
    timestamps: true,
  },
);

// ── RtpPhaseLog ──

interface RtpPhaseLogAttributes {
  id: string;
  protocolId: string;
  phase: RtpPhase;
  enteredDate: string;
  exitedDate: string | null;
  clearedBy: string | null;
  painLevel: number | null;
  fitnessTestPassed: boolean | null;
  medicalClearance: boolean;
  notes: string | null;
  notesAr: string | null;
  createdAt?: Date;
}

interface RtpPhaseLogCreationAttributes extends Optional<
  RtpPhaseLogAttributes,
  | "id"
  | "exitedDate"
  | "clearedBy"
  | "painLevel"
  | "fitnessTestPassed"
  | "medicalClearance"
  | "notes"
  | "notesAr"
  | "createdAt"
> {}

export class RtpPhaseLog
  extends Model<RtpPhaseLogAttributes, RtpPhaseLogCreationAttributes>
  implements RtpPhaseLogAttributes
{
  declare id: string;
  declare protocolId: string;
  declare phase: RtpPhase;
  declare enteredDate: string;
  declare exitedDate: string | null;
  declare clearedBy: string | null;
  declare painLevel: number | null;
  declare fitnessTestPassed: boolean | null;
  declare medicalClearance: boolean;
  declare notes: string | null;
  declare notesAr: string | null;
  declare readonly createdAt: Date;

  declare clearingUser?: User;
}

RtpPhaseLog.init(
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
    phase: { type: DataTypes.STRING(50), allowNull: false },
    enteredDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "entered_date",
    },
    exitedDate: { type: DataTypes.DATEONLY, field: "exited_date" },
    clearedBy: { type: DataTypes.UUID, field: "cleared_by" },
    painLevel: { type: DataTypes.INTEGER, field: "pain_level" },
    fitnessTestPassed: {
      type: DataTypes.BOOLEAN,
      field: "fitness_test_passed",
    },
    medicalClearance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "medical_clearance",
    },
    notes: { type: DataTypes.TEXT },
    notesAr: { type: DataTypes.TEXT, field: "notes_ar" },
  },
  {
    sequelize,
    tableName: "rtp_phase_logs",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

// ── Associations (inline — no circular deps) ──

RtpProtocol.hasMany(RtpPhaseLog, {
  foreignKey: "protocolId",
  as: "phaseLogs",
  onDelete: "CASCADE",
});
RtpPhaseLog.belongsTo(RtpProtocol, {
  foreignKey: "protocolId",
  as: "protocol",
});

RtpProtocol.belongsTo(Injury, { foreignKey: "injuryId", as: "injury" });
Injury.hasOne(RtpProtocol, { foreignKey: "injuryId", as: "rtpProtocol" });

RtpProtocol.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(RtpProtocol, { foreignKey: "playerId", as: "rtpProtocols" });

RtpProtocol.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

RtpPhaseLog.belongsTo(User, { foreignKey: "clearedBy", as: "clearingUser" });
