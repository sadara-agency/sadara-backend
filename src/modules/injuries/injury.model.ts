import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type InjuryStatus = 'UnderTreatment' | 'Recovered' | 'Relapsed' | 'Chronic';
export type InjurySeverity = 'Minor' | 'Moderate' | 'Severe' | 'Critical';
export type InjuryCause = 'Training' | 'Match' | 'NonFootball' | 'Unknown';

interface InjuryAttributes {
  id: string;
  playerId: string;
  matchId?: string | null;
  // Core
  injuryType: string;
  injuryTypeAr?: string | null;
  bodyPart: string;
  bodyPartAr?: string | null;
  severity: InjurySeverity;
  cause: InjuryCause;
  status: InjuryStatus;
  // Timeline
  injuryDate: string;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  estimatedDaysOut?: number | null;
  daysOut?: number | null;
  // Medical
  diagnosis?: string | null;
  diagnosisAr?: string | null;
  treatment?: string | null;
  treatmentPlan?: string | null;
  treatmentPlanAr?: string | null;
  surgeon?: string | null;
  surgeonName?: string | null;
  facility?: string | null;
  medicalProvider?: string | null;
  actualDaysOut?: number | null;
  isSurgeryRequired: boolean;
  surgeryDate?: string | null;
  // Context
  isRecurring: boolean;
  relatedInjuryId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InjuryCreation extends Optional<InjuryAttributes,
  'id' | 'severity' | 'cause' | 'status' | 'isSurgeryRequired' | 'isRecurring' | 'createdAt' | 'updatedAt'> { }

export class Injury extends Model<InjuryAttributes, InjuryCreation> implements InjuryAttributes {
  declare id: string;
  declare playerId: string;
  declare matchId: string | null;
  declare injuryType: string;
  declare injuryTypeAr: string | null;
  declare bodyPart: string;
  declare bodyPartAr: string | null;
  declare severity: InjurySeverity;
  declare cause: InjuryCause;
  declare status: InjuryStatus;
  declare injuryDate: string;
  declare expectedReturnDate: string | null;
  declare actualReturnDate: string | null;
  declare estimatedDaysOut: number | null;
  declare daysOut: number | null;
  declare diagnosis: string | null;
  declare diagnosisAr: string | null;
  declare treatment: string | null;
  declare treatmentPlan: string | null;
  declare treatmentPlanAr: string | null;
  declare surgeon: string | null;
  declare surgeonName: string | null;
  declare facility: string | null;
  declare medicalProvider: string | null;
  declare actualDaysOut: number | null;
  declare isSurgeryRequired: boolean;
  declare surgeryDate: string | null;
  declare isRecurring: boolean;
  declare relatedInjuryId: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
}

Injury.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  playerId: { type: DataTypes.UUID, allowNull: false, field: 'player_id' },
  matchId: { type: DataTypes.UUID, field: 'match_id' },

  // ── Core ──
  injuryType: { type: DataTypes.STRING(255), allowNull: false, field: 'injury_type' },
  injuryTypeAr: { type: DataTypes.STRING(255), field: 'injury_type_ar' },
  bodyPart: { type: DataTypes.STRING(255), allowNull: false, field: 'body_part' },
  bodyPartAr: { type: DataTypes.STRING(255), field: 'body_part_ar' },
  severity: { type: DataTypes.STRING(50), defaultValue: 'Moderate' },
  cause: { type: DataTypes.STRING(50), defaultValue: 'Unknown' },
  status: { type: DataTypes.STRING(50), defaultValue: 'UnderTreatment' },

  // ── Timeline ──
  injuryDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'injury_date' },
  expectedReturnDate: { type: DataTypes.DATEONLY, field: 'expected_return_date' },   // col #8
  actualReturnDate: { type: DataTypes.DATEONLY, field: 'actual_return_date' },     // col #9
  estimatedDaysOut: { type: DataTypes.INTEGER, field: 'estimated_days_out' },      // col #29
  daysOut: { type: DataTypes.INTEGER, field: 'days_out' },                // col #10

  // ── Medical ──
  diagnosis: { type: DataTypes.TEXT },                                       // col #11
  diagnosisAr: { type: DataTypes.TEXT, field: 'diagnosis_ar' },               // col #23
  treatment: { type: DataTypes.TEXT },                                       // col #12 (original)
  treatmentPlan: { type: DataTypes.TEXT, field: 'treatment_plan' },             // col #26 (new)
  treatmentPlanAr: { type: DataTypes.TEXT, field: 'treatment_plan_ar' },          // col #24
  surgeon: { type: DataTypes.STRING(255) },                               // col #13 (original)
  surgeonName: { type: DataTypes.STRING(255), field: 'surgeon_name' },        // col #28 (new)
  facility: { type: DataTypes.STRING(255) },                               // col #14 (original)
  medicalProvider: { type: DataTypes.STRING(255), field: 'medical_provider' },    // col #27 (new)
  actualDaysOut: { type: DataTypes.INTEGER, field: 'actual_days_out' },         // col #30
  isSurgeryRequired: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_surgery_required' }, // col #31
  surgeryDate: { type: DataTypes.DATEONLY, field: 'surgery_date' },           // col #32

  // ── Context ──
  isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_recurring' },  // col #16
  relatedInjuryId: { type: DataTypes.UUID, field: 'related_injury_id' },          // col #17
  notes: { type: DataTypes.TEXT },                                       // col #18
  createdBy: { type: DataTypes.UUID, field: 'created_by' },                 // col #33
}, {
  sequelize,
  tableName: 'injuries',
  underscored: true,
  timestamps: true,
});

// ── Injury Update sub-model ──

interface InjuryUpdateAttributes {
  id: string;
  injuryId: string;
  updateDate: string;
  status?: InjuryStatus | null;
  notes?: string | null;
  notesAr?: string | null;
  updatedBy?: string | null;
  createdAt?: Date;
}

interface InjuryUpdateCreation extends Optional<InjuryUpdateAttributes, 'id' | 'createdAt'> { }

export class InjuryUpdate extends Model<InjuryUpdateAttributes, InjuryUpdateCreation> implements InjuryUpdateAttributes {
  declare id: string;
  declare injuryId: string;
  declare updateDate: string;
  declare status: InjuryStatus | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare updatedBy: string | null;
}

InjuryUpdate.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  injuryId: { type: DataTypes.UUID, allowNull: false, field: 'injury_id' },
  updateDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'update_date' },
  status: { type: DataTypes.STRING(50) },
  notes: { type: DataTypes.TEXT },
  notesAr: { type: DataTypes.TEXT, field: 'notes_ar' },
  updatedBy: { type: DataTypes.UUID, field: 'updated_by' },
}, {
  sequelize,
  tableName: 'injury_updates',
  underscored: true,
  timestamps: true,
  updatedAt: false,
});