/// <reference types="jest" />
import { mockMatch, mockClub, mockPlayer, mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──
const mockMatchFindAndCountAll = jest.fn();
const mockMatchFindByPk = jest.fn();
const mockMatchFindAll = jest.fn();
const mockMatchFindOne = jest.fn();
const mockMatchCreate = jest.fn();
const mockMatchDestroy = jest.fn();
const mockMatchCount = jest.fn();
const mockPlayerFindAndCountAll = jest.fn();
const mockMPFindAll = jest.fn();
const mockMPFindOne = jest.fn();
const mockMPBulkCreate = jest.fn();
const mockMPCount = jest.fn();
const mockStatsFindAll = jest.fn();
const mockStatsFindOne = jest.fn();
const mockStatsBulkCreate = jest.fn();
const mockAnalysisFindAll = jest.fn();
const mockAnalysisFindOne = jest.fn();
const mockAnalysisCreate = jest.fn();
const mockClubFindByPk = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockPlayerFindAll = jest.fn();
const mockTaskCount = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn(), QueryTypes: { SELECT: 'SELECT' } },
}));

jest.mock('../../../src/shared/utils/displayId', () => ({
  generateDisplayId: jest.fn().mockResolvedValue('MTH-26-0001'),
}));

jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: {
    findAndCountAll: (...a: unknown[]) => mockMatchFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockMatchFindByPk(...a),
    findAll: (...a: unknown[]) => mockMatchFindAll(...a),
    findOne: (...a: unknown[]) => mockMatchFindOne(...a),
    create: (...a: unknown[]) => mockMatchCreate(...a),
    destroy: (...a: unknown[]) => mockMatchDestroy(...a),
    count: (...a: unknown[]) => mockMatchCount(...a),
  },
}));

jest.mock('../../../src/modules/matches/matchPlayer.model', () => ({
  MatchPlayer: {
    findAll: (...a: unknown[]) => mockMPFindAll(...a),
    findOne: (...a: unknown[]) => mockMPFindOne(...a),
    bulkCreate: (...a: unknown[]) => mockMPBulkCreate(...a),
    count: (...a: unknown[]) => mockMPCount(...a),
  },
}));

jest.mock('../../../src/modules/matches/playerMatchStats.model', () => ({
  PlayerMatchStats: {
    findAll: (...a: unknown[]) => mockStatsFindAll(...a),
    findOne: (...a: unknown[]) => mockStatsFindOne(...a),
    bulkCreate: (...a: unknown[]) => mockStatsBulkCreate(...a),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
  },
}));

jest.mock('../../../src/modules/matches/matchAnalysis.model', () => ({
  MatchAnalysis: {
    findAll: (...a: unknown[]) => mockAnalysisFindAll(...a),
    findOne: (...a: unknown[]) => mockAnalysisFindOne(...a),
    create: (...a: unknown[]) => mockAnalysisCreate(...a),
  },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
    name: 'Club',
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    findAll: (...a: unknown[]) => mockPlayerFindAll(...a),
    findAndCountAll: (...a: unknown[]) => mockPlayerFindAndCountAll(...a),
    name: 'Player',
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/modules/tasks/task.model', () => ({
  Task: {
    count: (...a: unknown[]) => mockTaskCount(...a),
    name: 'Task',
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as matchService from '../../../src/modules/matches/match.service';

describe('Match Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LIST MATCHES
  // ════════════════════════════════════════════════════════
  describe('listMatches', () => {
    beforeEach(() => {
      // Mock the second findAll call used for statusCounts
      mockMatchFindAll.mockResolvedValue([]);
    });

    it('should return paginated matches', async () => {
      mockMatchFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(mockMatch())],
      });

      const result = await matchService.listMatches({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockMatchFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await matchService.listMatches({ status: 'upcoming', page: 1, limit: 10 });

      expect(mockMatchFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by competition', async () => {
      mockMatchFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await matchService.listMatches({ competition: 'Saudi Pro League', page: 1, limit: 10 });

      expect(mockMatchFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by clubId', async () => {
      mockMatchFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await matchService.listMatches({ clubId: 'club-001', page: 1, limit: 10 });

      expect(mockMatchFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      mockMatchFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await matchService.listMatches({ from: '2025-01-01', to: '2025-12-31', page: 1, limit: 10 });

      expect(mockMatchFindAndCountAll).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // GET MATCH BY ID
  // ════════════════════════════════════════════════════════
  describe('getMatchById', () => {
    it('should return match with counts', async () => {
      const match = mockModelInstance(mockMatch());
      mockMatchFindByPk.mockResolvedValue(match);
      mockTaskCount.mockResolvedValue(3);

      const result = await matchService.getMatchById('match-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.getMatchById('bad')).rejects.toThrow('Match not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // GET UPCOMING MATCHES
  // ════════════════════════════════════════════════════════
  describe('getUpcomingMatches', () => {
    it('should return upcoming matches', async () => {
      mockMatchFindAll.mockResolvedValue([mockModelInstance(mockMatch())]);

      const result = await matchService.getUpcomingMatches();

      expect(result).toHaveLength(1);
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE MATCH
  // ════════════════════════════════════════════════════════
  describe('createMatch', () => {
    it('should create match', async () => {
      mockClubFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
      mockMatchFindOne.mockResolvedValue(null); // no conflicting match within 3-day window
      const created = mockModelInstance(mockMatch());
      mockMatchCreate.mockResolvedValue(created);
      // createMatch calls getMatchById internally, which uses findByPk + Task.count
      mockMatchFindByPk.mockResolvedValue(created);
      mockTaskCount.mockResolvedValue(0);

      const result = await matchService.createMatch({
        homeClubId: 'club-001',
        awayClubId: 'club-002',
        matchDate: '2025-03-15T18:00:00Z',
      });

      expect(result).toBeDefined();
      expect(mockMatchCreate).toHaveBeenCalled();
    });

    it('should throw 404 if home club not found', async () => {
      mockClubFindByPk.mockResolvedValueOnce(null);

      await expect(
        matchService.createMatch({ homeClubId: 'bad', matchDate: '2025-03-15' }),
      ).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE MATCH
  // ════════════════════════════════════════════════════════
  describe('updateMatch', () => {
    it('should update match', async () => {
      const match = mockModelInstance(mockMatch());
      mockMatchFindByPk.mockResolvedValue(match);

      await matchService.updateMatch('match-001', { venue: 'New Stadium' });

      expect(match.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.updateMatch('bad', { venue: 'x' })).rejects.toThrow('Match not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE SCORE
  // ════════════════════════════════════════════════════════
  describe('updateScore', () => {
    it('should update score', async () => {
      const match = mockModelInstance(mockMatch({ status: 'live' }));
      mockMatchFindByPk.mockResolvedValue(match);

      await matchService.updateScore('match-001', { homeScore: 2, awayScore: 1 });

      expect(match.update).toHaveBeenCalledWith(
        expect.objectContaining({ homeScore: 2, awayScore: 1 }),
      );
    });

    it('should throw 404 if not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.updateScore('bad', { homeScore: 0, awayScore: 0 })).rejects.toThrow('Match not found');
    });

    it('should throw 400 if match is cancelled', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch({ status: 'cancelled' })));

      await expect(
        matchService.updateScore('match-001', { homeScore: 1, awayScore: 0 }),
      ).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE STATUS
  // ════════════════════════════════════════════════════════
  describe('updateMatchStatus', () => {
    it('should update status', async () => {
      // Use a match with a non-midnight time so the time validation passes
      const match = mockModelInstance(mockMatch({ matchDate: '2025-06-15T18:00:00Z' }));
      mockMatchFindByPk.mockResolvedValue(match);
      mockMPCount.mockResolvedValue(5); // at least 1 player assigned

      await matchService.updateMatchStatus('match-001', 'live');

      expect(match.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'live' }));
    });

    it('should throw 404 if not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.updateMatchStatus('bad', 'live')).rejects.toThrow('Match not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE MATCH
  // ════════════════════════════════════════════════════════
  describe('deleteMatch', () => {
    it('should delete non-completed match', async () => {
      const match = mockModelInstance(mockMatch({ status: 'upcoming' }));
      mockMatchFindByPk.mockResolvedValue(match);

      const result = await matchService.deleteMatch('match-001');

      expect(match.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'match-001' });
    });

    it('should throw 404 if not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.deleteMatch('bad')).rejects.toThrow('Match not found');
    });

    it('should throw 400 for completed matches', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch({ status: 'completed' })));

      await expect(matchService.deleteMatch('match-001')).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // MATCH PLAYERS
  // ════════════════════════════════════════════════════════
  describe('getMatchPlayers', () => {
    it('should return match players', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch()));
      mockMPFindAll.mockResolvedValue([{ playerId: 'player-001', availability: 'starter' }]);

      const result = await matchService.getMatchPlayers('match-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if match not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.getMatchPlayers('bad')).rejects.toThrow('Match not found');
    });
  });

  describe('assignPlayers', () => {
    it('should assign players to match', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch()));
      mockPlayerFindAll.mockResolvedValue([mockModelInstance(mockPlayer())]);
      mockMPCount.mockResolvedValue(0); // no current starters
      mockMPBulkCreate.mockResolvedValue([]);
      mockMPFindAll.mockResolvedValue([]);

      const result = await matchService.assignPlayers('match-001', [
        { playerId: 'player-001', availability: 'starter' },
      ]);

      expect(mockMPBulkCreate).toHaveBeenCalled();
    });

    it('should throw 404 if match not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(
        matchService.assignPlayers('bad', [{ playerId: 'player-001' }]),
      ).rejects.toThrow('Match not found');
    });
  });

  describe('updateMatchPlayer', () => {
    it('should update match player', async () => {
      const mp = mockModelInstance({ matchId: 'match-001', playerId: 'player-001', availability: 'starter' });
      mockMPFindOne.mockResolvedValue(mp);

      await matchService.updateMatchPlayer('match-001', 'player-001', { availability: 'bench' });

      expect(mp.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockMPFindOne.mockResolvedValue(null);

      await expect(
        matchService.updateMatchPlayer('bad', 'player-001', { availability: 'bench' }),
      ).rejects.toThrow();
    });
  });

  describe('removePlayerFromMatch', () => {
    it('should remove player from match', async () => {
      const mp = mockModelInstance({ matchId: 'match-001', playerId: 'player-001' });
      mockMPFindOne.mockResolvedValue(mp);

      const result = await matchService.removePlayerFromMatch('match-001', 'player-001');

      expect(mp.destroy).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockMPFindOne.mockResolvedValue(null);

      await expect(matchService.removePlayerFromMatch('bad', 'player-001')).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // MATCH STATS
  // ════════════════════════════════════════════════════════
  describe('getMatchStats', () => {
    it('should return match stats', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch()));
      mockStatsFindAll.mockResolvedValue([{ playerId: 'player-001', goals: 2 }]);

      const result = await matchService.getMatchStats('match-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if match not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.getMatchStats('bad')).rejects.toThrow('Match not found');
    });
  });

  describe('upsertStats', () => {
    it('should bulk upsert stats', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch()));
      mockStatsBulkCreate.mockResolvedValue([]);
      mockStatsFindAll.mockResolvedValue([]);

      await matchService.upsertStats('match-001', [
        { playerId: 'player-001', goals: 2, assists: 1 },
      ]);

      expect(mockStatsBulkCreate).toHaveBeenCalled();
    });

    it('should throw 404 if match not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.upsertStats('bad', [{ playerId: 'p-1' }])).rejects.toThrow('Match not found');
    });
  });

  describe('updatePlayerStats', () => {
    it('should update player stats', async () => {
      const stats = mockModelInstance({ matchId: 'match-001', playerId: 'player-001', goals: 1 });
      mockStatsFindOne.mockResolvedValue(stats);

      await matchService.updatePlayerStats('match-001', 'player-001', { goals: 3 });

      expect(stats.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockStatsFindOne.mockResolvedValue(null);

      await expect(matchService.updatePlayerStats('bad', 'p-1', { goals: 0 })).rejects.toThrow();
    });
  });

  describe('deletePlayerStats', () => {
    it('should delete player stats', async () => {
      const stats = mockModelInstance({ matchId: 'match-001', playerId: 'player-001' });
      mockStatsFindOne.mockResolvedValue(stats);

      await matchService.deletePlayerStats('match-001', 'player-001');

      expect(stats.destroy).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockStatsFindOne.mockResolvedValue(null);

      await expect(matchService.deletePlayerStats('bad', 'p-1')).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // PLAYER MATCHES
  // ════════════════════════════════════════════════════════
  describe('getPlayerMatches', () => {
    it('should return paginated player matches', async () => {
      mockMatchFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockMatch())] });

      const result = await matchService.getPlayerMatches('player-001', { page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
    });
  });

  describe('getPlayerAggregateStats', () => {
    it('should return aggregated stats', async () => {
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([{
        matchesPlayed: '10', totalGoals: '5', totalAssists: '3', totalMinutes: '900',
        averageRating: '7.5', totalYellowCards: '2', totalRedCards: '0',
      }]);

      const result = await matchService.getPlayerAggregateStats('player-001');

      expect(result).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════
  // MATCH ANALYSIS
  // ════════════════════════════════════════════════════════
  describe('getMatchAnalyses', () => {
    it('should return analyses for match', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch()));
      mockAnalysisFindAll.mockResolvedValue([]);

      const result = await matchService.getMatchAnalyses('match-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if match not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(matchService.getMatchAnalyses('bad')).rejects.toThrow('Match not found');
    });
  });

  describe('getMatchAnalysisById', () => {
    it('should return analysis', async () => {
      mockAnalysisFindOne.mockResolvedValue(mockModelInstance({ id: 'analysis-001', type: 'post-match' }));

      const result = await matchService.getMatchAnalysisById('match-001', 'analysis-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockAnalysisFindOne.mockResolvedValue(null);

      await expect(matchService.getMatchAnalysisById('match-001', 'bad')).rejects.toThrow();
    });
  });

  describe('createMatchAnalysis', () => {
    it('should create analysis', async () => {
      mockMatchFindByPk.mockResolvedValue(mockModelInstance(mockMatch()));
      mockAnalysisCreate.mockResolvedValue(mockModelInstance({ id: 'analysis-001' }));
      mockAnalysisFindOne.mockResolvedValue(mockModelInstance({ id: 'analysis-001', type: 'post-match' }));

      const result = await matchService.createMatchAnalysis('match-001', 'user-001', {
        type: 'post-match',
        title: 'Analysis',
        content: 'Good match',
      });

      expect(mockAnalysisCreate).toHaveBeenCalled();
    });

    it('should throw 404 if match not found', async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(
        matchService.createMatchAnalysis('bad', 'user-001', { type: 'post-match', title: 'x', content: 'y' }),
      ).rejects.toThrow('Match not found');
    });
  });

  describe('updateMatchAnalysis', () => {
    it('should update analysis', async () => {
      const analysis = mockModelInstance({ id: 'analysis-001', matchId: 'match-001' });
      mockAnalysisFindOne.mockResolvedValue(analysis);

      await matchService.updateMatchAnalysis('match-001', 'analysis-001', { title: 'Updated' });

      expect(analysis.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockAnalysisFindOne.mockResolvedValue(null);

      await expect(
        matchService.updateMatchAnalysis('match-001', 'bad', { title: 'x' }),
      ).rejects.toThrow();
    });
  });

  describe('publishMatchAnalysis', () => {
    it('should publish analysis', async () => {
      const analysis = mockModelInstance({ id: 'analysis-001', matchId: 'match-001', status: 'draft' });
      mockAnalysisFindOne.mockResolvedValue(analysis);

      await matchService.publishMatchAnalysis('match-001', 'analysis-001');

      expect(analysis.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
    });
  });

  describe('deleteMatchAnalysis', () => {
    it('should delete analysis', async () => {
      const analysis = mockModelInstance({ id: 'analysis-001', matchId: 'match-001' });
      mockAnalysisFindOne.mockResolvedValue(analysis);

      const result = await matchService.deleteMatchAnalysis('match-001', 'analysis-001');

      expect(analysis.destroy).toHaveBeenCalled();
    });
  });
});
