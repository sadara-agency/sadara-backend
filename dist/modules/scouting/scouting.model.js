"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectionDecision = exports.ScreeningCase = exports.Watchlist = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Watchlist extends sequelize_1.Model {
}
exports.Watchlist = Watchlist;
Watchlist.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    prospectName: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, field: 'prospect_name' },
    prospectNameAr: { type: sequelize_1.DataTypes.STRING(255), field: 'prospect_name_ar' },
    dateOfBirth: { type: sequelize_1.DataTypes.DATEONLY, field: 'date_of_birth' },
    nationality: { type: sequelize_1.DataTypes.STRING(100) },
    position: { type: sequelize_1.DataTypes.STRING(100) },
    currentClub: { type: sequelize_1.DataTypes.STRING(255), field: 'current_club' },
    currentLeague: { type: sequelize_1.DataTypes.STRING(255), field: 'current_league' },
    status: { type: sequelize_1.DataTypes.ENUM('Active', 'Shortlisted', 'Archived', 'Rejected'), defaultValue: 'Active' },
    source: { type: sequelize_1.DataTypes.STRING(255) },
    scoutedBy: { type: sequelize_1.DataTypes.UUID, field: 'scouted_by' },
    videoClips: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'video_clips' },
    priority: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'Medium' },
    technicalRating: { type: sequelize_1.DataTypes.INTEGER, field: 'technical_rating' },
    physicalRating: { type: sequelize_1.DataTypes.INTEGER, field: 'physical_rating' },
    mentalRating: { type: sequelize_1.DataTypes.INTEGER, field: 'mental_rating' },
    potentialRating: { type: sequelize_1.DataTypes.INTEGER, field: 'potential_rating' },
    notes: { type: sequelize_1.DataTypes.TEXT },
}, {
    sequelize: database_1.sequelize, tableName: 'watchlists', underscored: true, timestamps: true,
});
class ScreeningCase extends sequelize_1.Model {
}
exports.ScreeningCase = ScreeningCase;
ScreeningCase.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    watchlistId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'watchlist_id' },
    caseNumber: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true, field: 'case_number' },
    status: { type: sequelize_1.DataTypes.ENUM('InProgress', 'PackReady', 'Closed'), defaultValue: 'InProgress' },
    identityCheck: { type: sequelize_1.DataTypes.ENUM('Verified', 'Pending', 'Failed'), defaultValue: 'Pending', field: 'identity_check' },
    passportVerified: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'passport_verified' },
    ageVerified: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'age_verified' },
    fitAssessment: { type: sequelize_1.DataTypes.TEXT, field: 'fit_assessment' },
    riskAssessment: { type: sequelize_1.DataTypes.TEXT, field: 'risk_assessment' },
    medicalClearance: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'medical_clearance' },
    baselineStats: { type: sequelize_1.DataTypes.JSONB, defaultValue: {}, field: 'baseline_stats' },
    isPackReady: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'is_pack_ready' },
    packPreparedAt: { type: sequelize_1.DataTypes.DATE, field: 'pack_prepared_at' },
    packPreparedBy: { type: sequelize_1.DataTypes.UUID, field: 'pack_prepared_by' },
    notes: { type: sequelize_1.DataTypes.TEXT },
    createdBy: { type: sequelize_1.DataTypes.UUID, field: 'created_by' },
}, {
    sequelize: database_1.sequelize, tableName: 'screening_cases', underscored: true, timestamps: true,
});
class SelectionDecision extends sequelize_1.Model {
}
exports.SelectionDecision = SelectionDecision;
SelectionDecision.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    screeningCaseId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'screening_case_id' },
    committeeName: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, field: 'committee_name' },
    decision: { type: sequelize_1.DataTypes.ENUM('Approved', 'Rejected', 'Deferred'), allowNull: false },
    decisionScope: { type: sequelize_1.DataTypes.ENUM('Full', 'Transfer-Only'), defaultValue: 'Full', field: 'decision_scope' },
    decisionDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW, field: 'decision_date' },
    votesFor: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'votes_for' },
    votesAgainst: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'votes_against' },
    votesAbstain: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'votes_abstain' },
    voteDetails: { type: sequelize_1.DataTypes.JSONB, defaultValue: [], field: 'vote_details' },
    rationale: { type: sequelize_1.DataTypes.TEXT },
    conditions: { type: sequelize_1.DataTypes.TEXT },
    dissentingOpinion: { type: sequelize_1.DataTypes.TEXT, field: 'dissenting_opinion' },
    recordedBy: { type: sequelize_1.DataTypes.UUID, field: 'recorded_by' },
}, {
    sequelize: database_1.sequelize, tableName: 'selection_decisions', underscored: true, timestamps: true, updatedAt: false,
});
// ── Associations ──
Watchlist.hasMany(ScreeningCase, { foreignKey: 'watchlistId', as: 'screeningCases' });
ScreeningCase.belongsTo(Watchlist, { foreignKey: 'watchlistId', as: 'watchlist' });
ScreeningCase.hasMany(SelectionDecision, { foreignKey: 'screeningCaseId', as: 'decisions' });
SelectionDecision.belongsTo(ScreeningCase, { foreignKey: 'screeningCaseId', as: 'screeningCase' });
//# sourceMappingURL=scouting.model.js.map