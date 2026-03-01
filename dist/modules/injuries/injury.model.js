"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjuryUpdate = exports.Injury = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Injury extends sequelize_1.Model {
}
exports.Injury = Injury;
Injury.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    playerId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'player_id' },
    matchId: { type: sequelize_1.DataTypes.UUID, field: 'match_id' },
    // ── Core ──
    injuryType: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, field: 'injury_type' },
    injuryTypeAr: { type: sequelize_1.DataTypes.STRING(255), field: 'injury_type_ar' },
    bodyPart: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, field: 'body_part' },
    bodyPartAr: { type: sequelize_1.DataTypes.STRING(255), field: 'body_part_ar' },
    severity: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'Moderate' },
    cause: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'Unknown' },
    status: { type: sequelize_1.DataTypes.STRING(50), defaultValue: 'UnderTreatment' },
    // ── Timeline ──
    injuryDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: 'injury_date' },
    expectedReturnDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'expected_return_date' }, // col #8
    actualReturnDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'actual_return_date' }, // col #9
    estimatedDaysOut: { type: sequelize_1.DataTypes.INTEGER, field: 'estimated_days_out' }, // col #29
    daysOut: { type: sequelize_1.DataTypes.INTEGER, field: 'days_out' }, // col #10
    // ── Medical ──
    diagnosis: { type: sequelize_1.DataTypes.TEXT }, // col #11
    diagnosisAr: { type: sequelize_1.DataTypes.TEXT, field: 'diagnosis_ar' }, // col #23
    treatment: { type: sequelize_1.DataTypes.TEXT }, // col #12 (original)
    treatmentPlan: { type: sequelize_1.DataTypes.TEXT, field: 'treatment_plan' }, // col #26 (new)
    treatmentPlanAr: { type: sequelize_1.DataTypes.TEXT, field: 'treatment_plan_ar' }, // col #24
    surgeon: { type: sequelize_1.DataTypes.STRING(255) }, // col #13 (original)
    surgeonName: { type: sequelize_1.DataTypes.STRING(255), field: 'surgeon_name' }, // col #28 (new)
    facility: { type: sequelize_1.DataTypes.STRING(255) }, // col #14 (original)
    medicalProvider: { type: sequelize_1.DataTypes.STRING(255), field: 'medical_provider' }, // col #27 (new)
    actualDaysOut: { type: sequelize_1.DataTypes.INTEGER, field: 'actual_days_out' }, // col #30
    isSurgeryRequired: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'is_surgery_required' }, // col #31
    surgeryDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'surgery_date' }, // col #32
    // ── Context ──
    isRecurring: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'is_recurring' }, // col #16
    relatedInjuryId: { type: sequelize_1.DataTypes.UUID, field: 'related_injury_id' }, // col #17
    notes: { type: sequelize_1.DataTypes.TEXT }, // col #18
    createdBy: { type: sequelize_1.DataTypes.UUID, field: 'created_by' }, // col #33
}, {
    sequelize: database_1.sequelize,
    tableName: 'injuries',
    underscored: true,
    timestamps: true,
});
class InjuryUpdate extends sequelize_1.Model {
}
exports.InjuryUpdate = InjuryUpdate;
InjuryUpdate.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    injuryId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'injury_id' },
    updateDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW, field: 'update_date' },
    status: { type: sequelize_1.DataTypes.STRING(50) },
    notes: { type: sequelize_1.DataTypes.TEXT },
    notesAr: { type: sequelize_1.DataTypes.TEXT, field: 'notes_ar' },
    updatedBy: { type: sequelize_1.DataTypes.UUID, field: 'updated_by' },
}, {
    sequelize: database_1.sequelize,
    tableName: 'injury_updates',
    underscored: true,
    timestamps: true,
    updatedAt: false,
});
//# sourceMappingURL=injury.model.js.map