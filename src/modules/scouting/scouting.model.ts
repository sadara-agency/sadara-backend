import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Enum Types ──

export type WatchlistStatus = 'Active' | 'Shortlisted' | 'Archived' | 'Rejected';
export type ScreeningStatus = 'InProgress' | 'PackReady' | 'Closed';
export type IdentityCheck = 'Verified' | 'Pending' | 'Failed';
export type DecisionType = 'Approved' | 'Rejected' | 'Deferred';
export type DecisionScope = 'Full' | 'Transfer-Only';

// ══════════════════════════════════════════
// WATCHLIST MODEL
// ══════════════════════════════════════════

export interface WatchlistAttributes {
  id: string;
  prospectName: string;
  prospectNameAr?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  position?: string | null;
  currentClub?: string | null;
  currentLeague?: string | null;
  status: WatchlistStatus;
  source?: string | null;
  scoutedBy?: string | null;
  videoClips: number;
  priority: string;
  technicalRating?: number | null;
  physicalRating?: number | null;
  mentalRating?: number | null;
  potentialRating?: number | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WatchlistCreationAttributes extends Optional<
  WatchlistAttributes,
  'id' | 'status' | 'videoClips' | 'priority' | 'createdAt' | 'updatedAt'
> {}

export class Watchlist extends Model<WatchlistAttributes, WatchlistCreationAttributes> implements WatchlistAttributes {
  declare id: string;
  declare prospectName: string;
  declare prospectNameAr: string | null;
  declare dateOfBirth: string | null;
  declare nationality: string | null;
  declare position: string | null;
  declare currentClub: string | null;
  declare currentLeague: string | null;
  declare status: WatchlistStatus;
  declare source: string | null;
  declare scoutedBy: string | null;
  declare videoClips: number;
  declare priority: string;
  declare technicalRating: number | null;
  declare physicalRating: number | null;
  declare mentalRating: number | null;
  declare potentialRating: number | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Watchlist.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  prospectName: { type: DataTypes.STRING(255), allowNull: false, field: 'prospect_name' },
  prospectNameAr: { type: DataTypes.STRING(255), field: 'prospect_name_ar' },
  dateOfBirth: { type: DataTypes.DATEONLY, field: 'date_of_birth' },
  nationality: { type: DataTypes.STRING(100) },
  position: { type: DataTypes.STRING(100) },
  currentClub: { type: DataTypes.STRING(255), field: 'current_club' },
  currentLeague: { type: DataTypes.STRING(255), field: 'current_league' },
  status: { type: DataTypes.ENUM('Active', 'Shortlisted', 'Archived', 'Rejected'), defaultValue: 'Active' },
  source: { type: DataTypes.STRING(255) },
  scoutedBy: { type: DataTypes.UUID, field: 'scouted_by' },
  videoClips: { type: DataTypes.INTEGER, defaultValue: 0, field: 'video_clips' },
  priority: { type: DataTypes.STRING(20), defaultValue: 'Medium' },
  technicalRating: { type: DataTypes.INTEGER, field: 'technical_rating' },
  physicalRating: { type: DataTypes.INTEGER, field: 'physical_rating' },
  mentalRating: { type: DataTypes.INTEGER, field: 'mental_rating' },
  potentialRating: { type: DataTypes.INTEGER, field: 'potential_rating' },
  notes: { type: DataTypes.TEXT },
}, {
  sequelize, tableName: 'watchlists', underscored: true, timestamps: true,
});

// ══════════════════════════════════════════
// SCREENING CASE MODEL
// ══════════════════════════════════════════

export interface ScreeningCaseAttributes {
  id: string;
  watchlistId: string;
  caseNumber: string;
  status: ScreeningStatus;
  identityCheck: IdentityCheck;
  passportVerified: boolean;
  ageVerified: boolean;
  fitAssessment?: string | null;
  riskAssessment?: string | null;
  medicalClearance: boolean;
  baselineStats?: object | null;
  isPackReady: boolean;
  packPreparedAt?: Date | null;
  packPreparedBy?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScreeningCreationAttributes extends Optional<
  ScreeningCaseAttributes,
  'id' | 'status' | 'identityCheck' | 'passportVerified' | 'ageVerified' | 'medicalClearance' | 'isPackReady' | 'createdAt' | 'updatedAt'
> {}

export class ScreeningCase extends Model<ScreeningCaseAttributes, ScreeningCreationAttributes> implements ScreeningCaseAttributes {
  declare id: string;
  declare watchlistId: string;
  declare caseNumber: string;
  declare status: ScreeningStatus;
  declare identityCheck: IdentityCheck;
  declare passportVerified: boolean;
  declare ageVerified: boolean;
  declare fitAssessment: string | null;
  declare riskAssessment: string | null;
  declare medicalClearance: boolean;
  declare baselineStats: object | null;
  declare isPackReady: boolean;
  declare packPreparedAt: Date | null;
  declare packPreparedBy: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ScreeningCase.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  watchlistId: { type: DataTypes.UUID, allowNull: false, field: 'watchlist_id' },
  caseNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'case_number' },
  status: { type: DataTypes.ENUM('InProgress', 'PackReady', 'Closed'), defaultValue: 'InProgress' },
  identityCheck: { type: DataTypes.ENUM('Verified', 'Pending', 'Failed'), defaultValue: 'Pending', field: 'identity_check' },
  passportVerified: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'passport_verified' },
  ageVerified: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'age_verified' },
  fitAssessment: { type: DataTypes.TEXT, field: 'fit_assessment' },
  riskAssessment: { type: DataTypes.TEXT, field: 'risk_assessment' },
  medicalClearance: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'medical_clearance' },
  baselineStats: { type: DataTypes.JSONB, defaultValue: {}, field: 'baseline_stats' },
  isPackReady: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_pack_ready' },
  packPreparedAt: { type: DataTypes.DATE, field: 'pack_prepared_at' },
  packPreparedBy: { type: DataTypes.UUID, field: 'pack_prepared_by' },
  notes: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
}, {
  sequelize, tableName: 'screening_cases', underscored: true, timestamps: true,
});

// ══════════════════════════════════════════
// SELECTION DECISION MODEL (Immutable)
// ══════════════════════════════════════════

export interface SelectionDecisionAttributes {
  id: string;
  screeningCaseId: string;
  committeeName: string;
  decision: DecisionType;
  decisionScope: DecisionScope;
  decisionDate: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  voteDetails?: object | null;
  rationale?: string | null;
  conditions?: string | null;
  dissentingOpinion?: string | null;
  recordedBy?: string | null;
  createdAt?: Date;
}

interface SelectionCreationAttributes extends Optional<
  SelectionDecisionAttributes,
  'id' | 'decisionScope' | 'votesFor' | 'votesAgainst' | 'votesAbstain' | 'createdAt'
> {}

export class SelectionDecision extends Model<SelectionDecisionAttributes, SelectionCreationAttributes> implements SelectionDecisionAttributes {
  declare id: string;
  declare screeningCaseId: string;
  declare committeeName: string;
  declare decision: DecisionType;
  declare decisionScope: DecisionScope;
  declare decisionDate: string;
  declare votesFor: number;
  declare votesAgainst: number;
  declare votesAbstain: number;
  declare voteDetails: object | null;
  declare rationale: string | null;
  declare conditions: string | null;
  declare dissentingOpinion: string | null;
  declare recordedBy: string | null;
  declare createdAt: Date;
}

SelectionDecision.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  screeningCaseId: { type: DataTypes.UUID, allowNull: false, field: 'screening_case_id' },
  committeeName: { type: DataTypes.STRING(255), allowNull: false, field: 'committee_name' },
  decision: { type: DataTypes.ENUM('Approved', 'Rejected', 'Deferred'), allowNull: false },
  decisionScope: { type: DataTypes.ENUM('Full', 'Transfer-Only'), defaultValue: 'Full', field: 'decision_scope' },
  decisionDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'decision_date' },
  votesFor: { type: DataTypes.INTEGER, defaultValue: 0, field: 'votes_for' },
  votesAgainst: { type: DataTypes.INTEGER, defaultValue: 0, field: 'votes_against' },
  votesAbstain: { type: DataTypes.INTEGER, defaultValue: 0, field: 'votes_abstain' },
  voteDetails: { type: DataTypes.JSONB, defaultValue: [], field: 'vote_details' },
  rationale: { type: DataTypes.TEXT },
  conditions: { type: DataTypes.TEXT },
  dissentingOpinion: { type: DataTypes.TEXT, field: 'dissenting_opinion' },
  recordedBy: { type: DataTypes.UUID, field: 'recorded_by' },
}, {
  sequelize, tableName: 'selection_decisions', underscored: true, timestamps: true, updatedAt: false,
});

// ── Associations ──

Watchlist.hasMany(ScreeningCase, { foreignKey: 'watchlistId', as: 'screeningCases' });
ScreeningCase.belongsTo(Watchlist, { foreignKey: 'watchlistId', as: 'watchlist' });
ScreeningCase.hasMany(SelectionDecision, { foreignKey: 'screeningCaseId', as: 'decisions' });
SelectionDecision.belongsTo(ScreeningCase, { foreignKey: 'screeningCaseId', as: 'screeningCase' });