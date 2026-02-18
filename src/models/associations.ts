// src/models/associations.ts
// This file sets up all Sequelize associations between models.
// It should be imported once in the main app initialization
// after all models have been defined, to ensure associations
// are registered before any queries are made.

import { Player } from '../modules/players/player.model';
import { Club } from '../modules/clubs/club.model';
import { User } from '../modules/Users/user.model';
import { Task } from '../modules/tasks/task.model';
import { Contract } from '../modules/contracts/contract.model';
import { Offer } from '../modules/offers/offer.model';
import { Match } from '../modules/matches/match.model';


export function setupAssociations() {

  // Player ↔ Club
  Player.belongsTo(Club, { as: 'club', foreignKey: 'currentClubId' });
  Club.hasMany(Player, { as: 'players', foreignKey: 'currentClubId' });

  // Player ↔ Agent (User)
  Player.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });
  User.hasMany(Player, { as: 'players', foreignKey: 'agentId' });

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

  Match.belongsTo(Club, { foreignKey: 'homeClubId', as: 'homeClub' });
  Match.belongsTo(Club, { foreignKey: 'awayClubId', as: 'awayClub' });
  Club.hasMany(Match, { foreignKey: 'homeClubId', as: 'homeMatches' });
  Club.hasMany(Match, { foreignKey: 'awayClubId', as: 'awayMatches' });

}