import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { Task } from "@modules/tasks/task.model";
import { Contract } from "@modules/contracts/contract.model";
import { Offer } from "@modules/offers/offer.model";
import { Match } from "@modules/matches/match.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { Gate, GateChecklist } from "@modules/gates/gate.model";
import { Referral } from "@modules/referrals/referral.model";
import {
  Watchlist,
  ScreeningCase,
  SelectionDecision,
} from "@modules/scouting/scouting.model";
import {
  Invoice,
  Payment,
  LedgerEntry,
  Valuation,
  Expense,
} from "@modules/finance/finance.model";
import { Document } from "@modules/documents/document.model";
import { Clearance } from "@modules/clearances/clearance.model";
import { Injury, InjuryUpdate } from "@modules/injuries/injury.model";
import {
  TrainingActivity,
  TrainingCourse,
  TrainingEnrollment,
} from "@modules/training/training.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import {
  SaffTournament,
  SaffFixture,
  SaffStanding,
  SaffTeamMap,
} from "@modules/saff/saff.model";
import { Notification } from "@modules/notifications/notification.model";
import { Note } from "@modules/notes/note.model";
import { PlayerClubHistory } from "@modules/players/playerClubHistory.model";
import { TechnicalReport } from "@modules/reports/report.model";
import { MatchAnalysis } from "@modules/matches/matchAnalysis.model";
import {
  Competition,
  ClubCompetition,
} from "@modules/competitions/competition.model";
import { ApprovalRequest } from "@modules/approvals/approval.model";
import {
  ApprovalChainTemplate,
  ApprovalChainTemplateStep,
} from "@modules/approvals/approvalChainTemplate.model";
import { CalendarEvent, EventAttendee } from "@modules/calendar/event.model";
import {
  SignatureRequest,
  SignatureSigner,
  SignatureAuditTrail,
} from "@modules/esignatures/esignature.model";
import { ApprovalStep } from "@modules/approvals/approvalStep.model";
import { ContractTemplate } from "@modules/contracts/contractTemplate.model";
import {
  ExerciseLibrary,
  BodyMetric,
  MetricTarget,
  BmrCalculation,
  WorkoutPlan,
  WorkoutSession,
  WorkoutExercise,
  WorkoutAssignment,
  WorkoutLog,
  FoodItem,
  DietPlan,
  DietMeal,
  DietMealItem,
  DietAdherence,
  CoachAlert,
} from "@modules/gym/gym.model";

export function setupAssociations() {
  // Player ↔ Club
  Player.belongsTo(Club, { as: "club", foreignKey: "currentClubId" });
  Club.hasMany(Player, { as: "players", foreignKey: "currentClubId" });

  // Player ↔ Agent (User)
  Player.belongsTo(User, { as: "agent", foreignKey: "agentId" });
  User.hasMany(Player, { as: "players", foreignKey: "agentId" });

  // Player ↔ Coach (User)
  Player.belongsTo(User, { as: "coach", foreignKey: "coachId" });

  // Player ↔ Analyst (User)
  Player.belongsTo(User, { as: "analyst", foreignKey: "analystId" });

  // User ↔ Player (Portal link — one user per player)
  User.belongsTo(Player, { as: "playerProfile", foreignKey: "playerId" });
  Player.hasOne(User, { as: "userAccount", foreignKey: "playerId" });

  // Task associations
  Task.belongsTo(Player, { as: "player", foreignKey: "playerId" });
  Task.belongsTo(User, { as: "assignee", foreignKey: "assignedTo" });
  Task.belongsTo(User, { as: "assigner", foreignKey: "assignedBy" });

  // Contract associations
  Contract.belongsTo(Player, { as: "player", foreignKey: "playerId" });
  Contract.belongsTo(Club, { as: "club", foreignKey: "clubId" });
  Contract.belongsTo(User, { as: "creator", foreignKey: "createdBy" });
  Player.hasMany(Contract, { as: "contracts", foreignKey: "playerId" });
  Club.hasMany(Contract, { as: "contracts", foreignKey: "clubId" });

  // Offer → Player
  Offer.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(Offer, { foreignKey: "playerId", as: "offers" });

  // Offer → Club (from / to)
  Offer.belongsTo(Club, { foreignKey: "fromClubId", as: "fromClub" });
  Offer.belongsTo(Club, { foreignKey: "toClubId", as: "toClub" });

  // Offer → User (creator)
  Offer.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // Match ↔ Club
  Match.belongsTo(Club, { foreignKey: "homeClubId", as: "homeClub" });
  Match.belongsTo(Club, { foreignKey: "awayClubId", as: "awayClub" });
  Club.hasMany(Match, { foreignKey: "homeClubId", as: "homeMatches" });
  Club.hasMany(Match, { foreignKey: "awayClubId", as: "awayMatches" });

  // Match ↔ Competition
  Match.belongsTo(Competition, {
    foreignKey: "competitionId",
    as: "competitionRef",
  });
  Competition.hasMany(Match, { foreignKey: "competitionId", as: "matches" });

  // Club ↔ Competition (many-to-many via ClubCompetition)
  Club.belongsToMany(Competition, {
    through: ClubCompetition,
    foreignKey: "clubId",
    otherKey: "competitionId",
    as: "competitions",
  });
  Competition.belongsToMany(Club, {
    through: ClubCompetition,
    foreignKey: "competitionId",
    otherKey: "clubId",
    as: "clubs",
  });

  // ClubCompetition direct associations (for include queries)
  ClubCompetition.belongsTo(Club, { foreignKey: "clubId", as: "club" });
  ClubCompetition.belongsTo(Competition, {
    foreignKey: "competitionId",
    as: "competition",
  });

  // Match ↔ MatchPlayer ↔ Player
  Match.hasMany(MatchPlayer, { foreignKey: "matchId", as: "matchPlayers" });
  MatchPlayer.belongsTo(Match, { foreignKey: "matchId", as: "match" });
  MatchPlayer.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(MatchPlayer, {
    foreignKey: "playerId",
    as: "matchAppearances",
  });

  // Match ↔ PlayerMatchStats ↔ Player
  Match.hasMany(PlayerMatchStats, { foreignKey: "matchId", as: "stats" });
  PlayerMatchStats.belongsTo(Match, { foreignKey: "matchId", as: "match" });
  PlayerMatchStats.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(PlayerMatchStats, {
    foreignKey: "playerId",
    as: "matchStats",
  });

  // Task ↔ Match
  Task.belongsTo(Match, { foreignKey: "matchId", as: "match" });
  Match.hasMany(Task, { foreignKey: "matchId", as: "tasks" });

  // Gate ↔ Player
  Gate.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(Gate, { foreignKey: "playerId", as: "gates" });
  Gate.belongsTo(User, { foreignKey: "approvedBy", as: "approver" });
  Gate.hasMany(GateChecklist, { foreignKey: "gateId", as: "checklist" });
  GateChecklist.belongsTo(Gate, { foreignKey: "gateId", as: "gate" });

  // Referral
  Referral.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(Referral, { foreignKey: "playerId", as: "referrals" });
  Referral.belongsTo(User, { foreignKey: "assignedTo", as: "assignee" });
  Referral.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // Scouting
  Watchlist.belongsTo(User, { foreignKey: "scoutedBy", as: "scout" });
  ScreeningCase.belongsTo(User, {
    foreignKey: "packPreparedBy",
    as: "preparer",
  });
  ScreeningCase.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // Finance
  Invoice.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Invoice.belongsTo(Club, { foreignKey: "clubId", as: "club" });
  Invoice.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  Payment.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Payment.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });
  LedgerEntry.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Valuation.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(Valuation, { foreignKey: "playerId", as: "valuations" });
  Expense.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Expense.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // Document (polymorphic via entityType + entityId — no direct FK associations)
  Document.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });

  // Clearance
  Contract.hasMany(Clearance, { foreignKey: "contractId", as: "clearances" });
  Clearance.belongsTo(Contract, { foreignKey: "contractId", as: "contract" });
  Player.hasMany(Clearance, { foreignKey: "playerId", as: "clearances" });
  Clearance.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Clearance.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // ── Injuries (NO duplicates) ──
  Player.hasMany(Injury, { foreignKey: "playerId", as: "injuries" });
  Injury.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Injury.belongsTo(Match, { foreignKey: "matchId", as: "match" });
  Injury.hasMany(InjuryUpdate, { foreignKey: "injuryId", as: "updates" });
  InjuryUpdate.belongsTo(Injury, { foreignKey: "injuryId", as: "injury" });

  // ── Training ──
  TrainingCourse.hasMany(TrainingEnrollment, {
    foreignKey: "courseId",
    as: "enrollments",
  });
  TrainingEnrollment.belongsTo(TrainingCourse, {
    foreignKey: "courseId",
    as: "course",
  });
  TrainingEnrollment.belongsTo(Player, {
    foreignKey: "playerId",
    as: "player",
  });
  Player.hasMany(TrainingEnrollment, {
    foreignKey: "playerId",
    as: "trainingEnrollments",
  });

  // ── External Provider Mappings ──
  Player.hasMany(ExternalProviderMapping, {
    foreignKey: "playerId",
    as: "externalProviders",
  });
  ExternalProviderMapping.belongsTo(Player, {
    foreignKey: "playerId",
    as: "player",
  });

  // SAFF associations
  SaffTournament.hasMany(SaffStanding, {
    foreignKey: "tournamentId",
    as: "standings",
  });
  SaffStanding.belongsTo(SaffTournament, {
    foreignKey: "tournamentId",
    as: "tournament",
  });

  SaffTournament.hasMany(SaffFixture, {
    foreignKey: "tournamentId",
    as: "fixtures",
  });
  SaffFixture.belongsTo(SaffTournament, {
    foreignKey: "tournamentId",
    as: "tournament",
  });

  // Notification associations
  User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

  // ── Training Activity (NEW) ──
  TrainingEnrollment.hasMany(TrainingActivity, {
    foreignKey: "enrollmentId",
    as: "activities",
  });
  TrainingActivity.belongsTo(TrainingEnrollment, {
    foreignKey: "enrollmentId",
    as: "enrollment",
  });
  TrainingActivity.belongsTo(TrainingCourse, {
    foreignKey: "courseId",
    as: "course",
  });
  TrainingActivity.belongsTo(Player, { foreignKey: "playerId", as: "player" });

  // ── Notes (polymorphic via ownerType + ownerId) ──
  Note.belongsTo(User, { foreignKey: "createdBy", as: "author" });

  // ── Player Club History ──
  Player.hasMany(PlayerClubHistory, {
    foreignKey: "playerId",
    as: "clubHistory",
  });
  PlayerClubHistory.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  PlayerClubHistory.belongsTo(Club, { foreignKey: "clubId", as: "club" });

  // ── Match Analyses ──
  Match.hasMany(MatchAnalysis, { foreignKey: "matchId", as: "analyses" });
  MatchAnalysis.belongsTo(Match, { foreignKey: "matchId", as: "match" });
  MatchAnalysis.belongsTo(User, { foreignKey: "analystId", as: "analyst" });

  // ── Technical Reports ──
  TechnicalReport.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  TechnicalReport.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  Player.hasMany(TechnicalReport, {
    foreignKey: "playerId",
    as: "technicalReports",
  });

  // ── Approval Requests ──
  ApprovalRequest.belongsTo(User, {
    foreignKey: "requestedBy",
    as: "requester",
  });
  ApprovalRequest.belongsTo(User, { foreignKey: "assignedTo", as: "assignee" });
  ApprovalRequest.belongsTo(User, { foreignKey: "resolvedBy", as: "resolver" });

  // ── Approval Chain Templates ──
  ApprovalChainTemplate.hasMany(ApprovalChainTemplateStep, {
    foreignKey: "templateId",
    as: "steps",
  });
  ApprovalChainTemplateStep.belongsTo(ApprovalChainTemplate, {
    foreignKey: "templateId",
    as: "template",
  });

  // ── Approval Steps (multi-step chains) ──
  ApprovalRequest.hasMany(ApprovalStep, {
    foreignKey: "approvalRequestId",
    as: "steps",
  });
  ApprovalRequest.belongsTo(ApprovalChainTemplate, {
    foreignKey: "templateId",
    as: "template",
  });
  ApprovalStep.belongsTo(ApprovalRequest, {
    foreignKey: "approvalRequestId",
    as: "approvalRequest",
  });
  ApprovalStep.belongsTo(User, { foreignKey: "resolvedBy", as: "resolver" });
  ApprovalStep.belongsTo(User, {
    foreignKey: "approverUserId",
    as: "approverUser",
  });

  // ── Contract Templates ──
  ContractTemplate.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

  // ═══════════════════════════════════════════
  // GYM COACH MODULE
  // ═══════════════════════════════════════════

  // Body Metrics
  Player.hasMany(BodyMetric, { foreignKey: "playerId", as: "bodyMetrics" });
  BodyMetric.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  BodyMetric.belongsTo(User, { foreignKey: "recordedBy", as: "recorder" });

  // Metric Targets
  Player.hasMany(MetricTarget, { foreignKey: "playerId", as: "metricTargets" });
  MetricTarget.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  MetricTarget.belongsTo(User, { foreignKey: "setBy", as: "setter" });

  // BMR Calculations
  Player.hasMany(BmrCalculation, {
    foreignKey: "playerId",
    as: "bmrCalculations",
  });
  BmrCalculation.belongsTo(Player, { foreignKey: "playerId", as: "player" });

  // Workout Plans → Sessions → Exercises
  WorkoutPlan.hasMany(WorkoutSession, { foreignKey: "planId", as: "sessions" });
  WorkoutSession.belongsTo(WorkoutPlan, { foreignKey: "planId", as: "plan" });
  WorkoutSession.hasMany(WorkoutExercise, {
    foreignKey: "sessionId",
    as: "exercises",
  });
  WorkoutExercise.belongsTo(WorkoutSession, {
    foreignKey: "sessionId",
    as: "session",
  });
  WorkoutExercise.belongsTo(ExerciseLibrary, {
    foreignKey: "exerciseId",
    as: "exercise",
  });

  // Workout Assignments
  WorkoutPlan.hasMany(WorkoutAssignment, {
    foreignKey: "planId",
    as: "assignments",
  });
  WorkoutAssignment.belongsTo(WorkoutPlan, {
    foreignKey: "planId",
    as: "plan",
  });
  WorkoutAssignment.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(WorkoutAssignment, {
    foreignKey: "playerId",
    as: "workoutAssignments",
  });

  // Workout Logs
  WorkoutAssignment.hasMany(WorkoutLog, {
    foreignKey: "assignmentId",
    as: "logs",
  });
  WorkoutLog.belongsTo(WorkoutAssignment, {
    foreignKey: "assignmentId",
    as: "assignment",
  });
  WorkoutLog.belongsTo(WorkoutSession, {
    foreignKey: "sessionId",
    as: "session",
  });
  WorkoutLog.belongsTo(Player, { foreignKey: "playerId", as: "player" });

  // Diet Plans → Meals → Items
  DietPlan.hasMany(DietMeal, { foreignKey: "planId", as: "meals" });
  DietMeal.belongsTo(DietPlan, { foreignKey: "planId", as: "plan" });
  DietMeal.hasMany(DietMealItem, { foreignKey: "mealId", as: "items" });
  DietMealItem.belongsTo(DietMeal, { foreignKey: "mealId", as: "meal" });
  DietMealItem.belongsTo(FoodItem, { foreignKey: "foodId", as: "food" });
  DietPlan.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  Player.hasMany(DietPlan, { foreignKey: "playerId", as: "dietPlans" });

  // Diet Adherence
  DietAdherence.belongsTo(DietPlan, { foreignKey: "planId", as: "plan" });
  DietAdherence.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  DietAdherence.belongsTo(DietMeal, { foreignKey: "mealId", as: "meal" });

  // Coach Alerts
  CoachAlert.belongsTo(User, { foreignKey: "coachId", as: "coach" });
  CoachAlert.belongsTo(Player, { foreignKey: "playerId", as: "player" });

  // ── Calendar Events ──
  CalendarEvent.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  CalendarEvent.hasMany(EventAttendee, {
    foreignKey: "eventId",
    as: "attendees",
  });
  EventAttendee.belongsTo(CalendarEvent, {
    foreignKey: "eventId",
    as: "event",
  });
  EventAttendee.belongsTo(Player, {
    foreignKey: "attendeeId",
    as: "player",
    constraints: false,
  });
  EventAttendee.belongsTo(User, {
    foreignKey: "attendeeId",
    as: "user",
    constraints: false,
  });
  CalendarEvent.belongsTo(CalendarEvent, {
    foreignKey: "recurrenceParentId",
    as: "recurrenceParent",
  });
  CalendarEvent.hasMany(CalendarEvent, {
    foreignKey: "recurrenceParentId",
    as: "recurrenceChildren",
  });

  // ── E-Signatures ──
  SignatureRequest.belongsTo(Document, {
    foreignKey: "documentId",
    as: "document",
  });
  SignatureRequest.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator",
  });
  SignatureRequest.hasMany(SignatureSigner, {
    foreignKey: "signatureRequestId",
    as: "signers",
  });
  SignatureRequest.hasMany(SignatureAuditTrail, {
    foreignKey: "signatureRequestId",
    as: "auditTrail",
  });
  SignatureSigner.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });
  SignatureSigner.belongsTo(SignatureRequest, {
    foreignKey: "signatureRequestId",
    as: "request",
  });
}
