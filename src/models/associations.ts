import { Player } from '../modules/players/player.model';
import { Club } from '../modules/clubs/club.model';
import { User } from '../modules/Users/user.model';
import { Task } from '../modules/tasks/task.model';
import { Contract } from '../modules/contracts/contract.model';
import { Offer } from '../modules/offers/offer.model';
import { Match } from '../modules/matches/match.model';
import { MatchPlayer } from '../modules/matches/matchPlayer.model';
import { PlayerMatchStats } from '../modules/matches/playerMatchStats.model';
import { Gate, GateChecklist } from '../modules/gates/gate.model';
import { Referral } from '../modules/referrals/referral.model';
import { Watchlist, ScreeningCase, SelectionDecision } from '../modules/scouting/scouting.model';
import { Invoice, Payment, LedgerEntry, Valuation } from '../modules/finance/finance.model';
import { Document } from '../modules/documents/document.model';
import { Clearance } from '../modules/clearances/clearance.model';
import { Injury, InjuryUpdate } from '../modules/injuries/injury.model';
import { TrainingCourse, TrainingEnrollment } from '../modules/training/training.model';
import { ExternalProviderMapping } from '../modules/players/externalProvider.model';
import { SaffTournament, SaffFixture, SaffStanding, SaffTeamMap } from '@modules/saff/saff.model';


export function setupAssociations() {

  // Player ↔ Club
  Player.belongsTo(Club, { as: 'club', foreignKey: 'currentClubId' });
  Club.hasMany(Player, { as: 'players', foreignKey: 'currentClubId' });

  // Player ↔ Agent (User)
  Player.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });
  User.hasMany(Player, { as: 'players', foreignKey: 'agentId' });

  // Player ↔ Coach (User)
  Player.belongsTo(User, { as: 'coach', foreignKey: 'coachId' });

  // Player ↔ Analyst (User)
  Player.belongsTo(User, { as: 'analyst', foreignKey: 'analystId' });

  // Task associations
  Task.belongsTo(Player, { as: 'player', foreignKey: 'playerId' });
  Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
  Task.belongsTo(User, { as: 'assigner', foreignKey: 'assignedBy' });

  // Contract associations
  Contract.belongsTo(Player, { as: 'player', foreignKey: 'playerId' });
  Contract.belongsTo(Club, { as: 'club', foreignKey: 'clubId' });
  Contract.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
  Player.hasMany(Contract, { as: 'contracts', foreignKey: 'playerId' });
  Club.hasMany(Contract, { as: 'contracts', foreignKey: 'clubId' });

  // Offer → Player
  Offer.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(Offer, { foreignKey: 'playerId', as: 'offers' });

  // Offer → Club (from / to)
  Offer.belongsTo(Club, { foreignKey: 'fromClubId', as: 'fromClub' });
  Offer.belongsTo(Club, { foreignKey: 'toClubId', as: 'toClub' });

  // Offer → User (creator)
  Offer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // Match ↔ Club
  Match.belongsTo(Club, { foreignKey: 'homeClubId', as: 'homeClub' });
  Match.belongsTo(Club, { foreignKey: 'awayClubId', as: 'awayClub' });
  Club.hasMany(Match, { foreignKey: 'homeClubId', as: 'homeMatches' });
  Club.hasMany(Match, { foreignKey: 'awayClubId', as: 'awayMatches' });

  // Match ↔ MatchPlayer ↔ Player
  Match.hasMany(MatchPlayer, { foreignKey: 'matchId', as: 'matchPlayers' });
  MatchPlayer.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });
  MatchPlayer.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(MatchPlayer, { foreignKey: 'playerId', as: 'matchAppearances' });

  // Match ↔ PlayerMatchStats ↔ Player
  Match.hasMany(PlayerMatchStats, { foreignKey: 'matchId', as: 'stats' });
  PlayerMatchStats.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });
  PlayerMatchStats.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(PlayerMatchStats, { foreignKey: 'playerId', as: 'matchStats' });

  // Task ↔ Match
  Task.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });
  Match.hasMany(Task, { foreignKey: 'matchId', as: 'tasks' });

  // Gate ↔ Player
  Gate.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(Gate, { foreignKey: 'playerId', as: 'gates' });
  Gate.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  Gate.hasMany(GateChecklist, { foreignKey: 'gateId', as: 'checklist' });
  GateChecklist.belongsTo(Gate, { foreignKey: 'gateId', as: 'gate' });

  // Referral
  Referral.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(Referral, { foreignKey: 'playerId', as: 'referrals' });
  Referral.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
  Referral.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // Scouting
  Watchlist.belongsTo(User, { foreignKey: 'scoutedBy', as: 'scout' });
  ScreeningCase.belongsTo(User, { foreignKey: 'packPreparedBy', as: 'preparer' });
  ScreeningCase.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // Finance
  Invoice.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Invoice.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });
  Invoice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Payment.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
  LedgerEntry.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Valuation.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(Valuation, { foreignKey: 'playerId', as: 'valuations' });

  // Document
  Document.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(Document, { foreignKey: 'playerId', as: 'documents' });
  Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

  // Clearance
  Clearance.belongsTo(Contract, { foreignKey: 'contractId', as: 'contract' });
  Clearance.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Clearance.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // ── Injuries (NO duplicates) ──
  Player.hasMany(Injury, { foreignKey: 'playerId', as: 'injuries' });
  Injury.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Injury.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });
  Injury.hasMany(InjuryUpdate, { foreignKey: 'injuryId', as: 'updates' });
  InjuryUpdate.belongsTo(Injury, { foreignKey: 'injuryId', as: 'injury' });

  // ── Training ──
  TrainingCourse.hasMany(TrainingEnrollment, { foreignKey: 'courseId', as: 'enrollments' });
  TrainingEnrollment.belongsTo(TrainingCourse, { foreignKey: 'courseId', as: 'course' });
  TrainingEnrollment.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
  Player.hasMany(TrainingEnrollment, { foreignKey: 'playerId', as: 'trainingEnrollments' });

  // ── External Provider Mappings ──
  Player.hasMany(ExternalProviderMapping, { foreignKey: 'playerId', as: 'externalProviders' });
  ExternalProviderMapping.belongsTo(Player, { foreignKey: 'playerId', as: 'player' });
}


SaffTournament.hasMany(SaffStanding, { foreignKey: 'tournamentId', as: 'standings' });
SaffStanding.belongsTo(SaffTournament, { foreignKey: 'tournamentId', as: 'tournament' });

SaffTournament.hasMany(SaffFixture, { foreignKey: 'tournamentId', as: 'fixtures' });
SaffFixture.belongsTo(SaffTournament, { foreignKey: 'tournamentId', as: 'tournament' });
