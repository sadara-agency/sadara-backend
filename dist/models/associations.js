"use strict";
// src/models/associations.ts
// This file sets up all Sequelize associations between models.
// It should be imported once in the main app initialization
// after all models have been defined, to ensure associations
// are registered before any queries are made.
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = setupAssociations;
const player_model_1 = require("../modules/players/player.model");
const club_model_1 = require("../modules/clubs/club.model");
const user_model_1 = require("../modules/Users/user.model");
const task_model_1 = require("../modules/tasks/task.model");
const contract_model_1 = require("../modules/contracts/contract.model");
const offer_model_1 = require("../modules/offers/offer.model");
const match_model_1 = require("../modules/matches/match.model");
const gate_model_1 = require("../modules/gates/gate.model");
const referral_model_1 = require("../modules/referrals/referral.model");
const scouting_model_1 = require("../modules/scouting/scouting.model");
const finance_model_1 = require("../modules/finance/finance.model");
const document_model_1 = require("../modules/documents/document.model");
function setupAssociations() {
    // Player ↔ Club
    player_model_1.Player.belongsTo(club_model_1.Club, { as: 'club', foreignKey: 'currentClubId' });
    club_model_1.Club.hasMany(player_model_1.Player, { as: 'players', foreignKey: 'currentClubId' });
    // Player ↔ Agent (User)
    player_model_1.Player.belongsTo(user_model_1.User, { as: 'agent', foreignKey: 'agentId' });
    user_model_1.User.hasMany(player_model_1.Player, { as: 'players', foreignKey: 'agentId' });
    // Task associations
    task_model_1.Task.belongsTo(player_model_1.Player, { as: 'player', foreignKey: 'playerId' });
    task_model_1.Task.belongsTo(user_model_1.User, { as: 'assignee', foreignKey: 'assignedTo' });
    task_model_1.Task.belongsTo(user_model_1.User, { as: 'assigner', foreignKey: 'assignedBy' });
    // Contract associations
    contract_model_1.Contract.belongsTo(player_model_1.Player, { as: 'player', foreignKey: 'playerId' });
    contract_model_1.Contract.belongsTo(club_model_1.Club, { as: 'club', foreignKey: 'clubId' });
    contract_model_1.Contract.belongsTo(user_model_1.User, { as: 'creator', foreignKey: 'createdBy' });
    player_model_1.Player.hasMany(contract_model_1.Contract, { as: 'contracts', foreignKey: 'playerId' });
    club_model_1.Club.hasMany(contract_model_1.Contract, { as: 'contracts', foreignKey: 'clubId' });
    // Offer → Player
    offer_model_1.Offer.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    player_model_1.Player.hasMany(offer_model_1.Offer, { foreignKey: 'playerId', as: 'offers' });
    // Offer → Club (from / to)
    offer_model_1.Offer.belongsTo(club_model_1.Club, { foreignKey: 'fromClubId', as: 'fromClub' });
    offer_model_1.Offer.belongsTo(club_model_1.Club, { foreignKey: 'toClubId', as: 'toClub' });
    // Offer → User (creator)
    offer_model_1.Offer.belongsTo(user_model_1.User, { foreignKey: 'createdBy', as: 'creator' });
    match_model_1.Match.belongsTo(club_model_1.Club, { foreignKey: 'homeClubId', as: 'homeClub' });
    match_model_1.Match.belongsTo(club_model_1.Club, { foreignKey: 'awayClubId', as: 'awayClub' });
    club_model_1.Club.hasMany(match_model_1.Match, { foreignKey: 'homeClubId', as: 'homeMatches' });
    club_model_1.Club.hasMany(match_model_1.Match, { foreignKey: 'awayClubId', as: 'awayMatches' });
    gate_model_1.Gate.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    player_model_1.Player.hasMany(gate_model_1.Gate, { foreignKey: 'playerId', as: 'gates' });
    gate_model_1.Gate.belongsTo(user_model_1.User, { foreignKey: 'approvedBy', as: 'approver' });
    gate_model_1.Gate.hasMany(gate_model_1.GateChecklist, { foreignKey: 'gateId', as: 'checklist' });
    gate_model_1.GateChecklist.belongsTo(gate_model_1.Gate, { foreignKey: 'gateId', as: 'gate' });
    referral_model_1.Referral.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    player_model_1.Player.hasMany(referral_model_1.Referral, { foreignKey: 'playerId', as: 'referrals' });
    referral_model_1.Referral.belongsTo(user_model_1.User, { foreignKey: 'assignedTo', as: 'assignee' });
    referral_model_1.Referral.belongsTo(user_model_1.User, { foreignKey: 'createdBy', as: 'creator' });
    scouting_model_1.Watchlist.belongsTo(user_model_1.User, { foreignKey: 'scoutedBy', as: 'scout' });
    scouting_model_1.ScreeningCase.belongsTo(user_model_1.User, { foreignKey: 'packPreparedBy', as: 'preparer' });
    scouting_model_1.ScreeningCase.belongsTo(user_model_1.User, { foreignKey: 'createdBy', as: 'creator' });
    finance_model_1.Invoice.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    finance_model_1.Invoice.belongsTo(club_model_1.Club, { foreignKey: 'clubId', as: 'club' });
    finance_model_1.Invoice.belongsTo(user_model_1.User, { foreignKey: 'createdBy', as: 'creator' });
    finance_model_1.Payment.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    finance_model_1.Payment.belongsTo(finance_model_1.Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
    finance_model_1.LedgerEntry.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    finance_model_1.Valuation.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    player_model_1.Player.hasMany(finance_model_1.Valuation, { foreignKey: 'playerId', as: 'valuations' });
    document_model_1.Document.belongsTo(player_model_1.Player, { foreignKey: 'playerId', as: 'player' });
    player_model_1.Player.hasMany(document_model_1.Document, { foreignKey: 'playerId', as: 'documents' });
    document_model_1.Document.belongsTo(user_model_1.User, { foreignKey: 'uploadedBy', as: 'uploader' });
}
//# sourceMappingURL=associations.js.map