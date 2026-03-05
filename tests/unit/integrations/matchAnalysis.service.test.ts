/// <reference types="jest" />

const mockMatchFindOrCreate = jest.fn();
const mockPlayerMatchStatsUpsert = jest.fn();
const mockClubFindOne = jest.fn();
const mockExtMappingUpdate = jest.fn();
const mockSequelizeTransaction = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: (...a: unknown[]) => mockSequelizeTransaction(...a),
  },
}));

jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: {
    findOrCreate: (...a: unknown[]) => mockMatchFindOrCreate(...a),
    name: 'Match',
  },
}));
jest.mock('../../../src/modules/matches/playerMatchStats.model', () => ({
  PlayerMatchStats: {
    upsert: (...a: unknown[]) => mockPlayerMatchStatsUpsert(...a),
  },
}));
jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { findOne: (...a: unknown[]) => mockClubFindOne(...a), name: 'Club' },
}));
jest.mock('../../../src/modules/players/externalProvider.model', () => ({
  ExternalProviderMapping: {
    update: (...a: unknown[]) => mockExtMappingUpdate(...a),
  },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as maService from '../../../src/modules/integrations/matchAnalysis.service';

describe('Match Analysis Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerProvider', () => {
    it('should register a provider', () => {
      const provider: maService.MatchAnalysisProvider = {
        name: 'TestProvider',
        fetchPlayerMatches: jest.fn(),
        fetchMatchStats: jest.fn(),
        testConnection: jest.fn(),
      };
      maService.registerProvider(provider);
      expect(maService.getProvider('TestProvider')).toBe(provider);
      expect(maService.listProviders()).toContain('TestProvider');
    });
  });

  describe('getProvider', () => {
    it('should return undefined for unknown provider', () => {
      expect(maService.getProvider('Unknown')).toBeUndefined();
    });
  });

  describe('listProviders', () => {
    it('should return registered provider names', () => {
      const names = maService.listProviders();
      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('refreshPlayerStats', () => {
    it('should throw if provider not configured', async () => {
      await expect(maService.refreshPlayerStats('NonExistent', 'ext-001')).rejects.toThrow('not configured');
    });

    it('should fetch matches from registered provider', async () => {
      const mockMatches = [{ externalId: 'ext-m1', date: '2024-01-01', homeTeam: 'A', awayTeam: 'B', competition: 'SPL', minutesPlayed: 90, goals: 1, assists: 0 }];
      const provider: maService.MatchAnalysisProvider = {
        name: 'RefreshTest',
        fetchPlayerMatches: jest.fn().mockResolvedValue(mockMatches),
        fetchMatchStats: jest.fn(),
        testConnection: jest.fn(),
      };
      maService.registerProvider(provider);
      const result = await maService.refreshPlayerStats('RefreshTest', 'ext-001');
      expect(result).toHaveLength(1);
    });
  });

  describe('syncPlayerMatches', () => {
    it('should throw if provider not configured', async () => {
      await expect(maService.syncPlayerMatches('NonExistent', 'p1', 'ext-001')).rejects.toThrow('not configured');
    });

    it('should sync matches and persist stats', async () => {
      const mockExtMatches = [{
        externalId: 'ext-m1',
        date: '2024-01-01',
        homeTeam: 'Al Hilal',
        awayTeam: 'Al Nassr',
        competition: 'SPL',
        minutesPlayed: 90,
        goals: 2,
        assists: 1,
        rating: 8.5,
      }];

      const provider: maService.MatchAnalysisProvider = {
        name: 'SyncTest',
        fetchPlayerMatches: jest.fn().mockResolvedValue(mockExtMatches),
        fetchMatchStats: jest.fn().mockResolvedValue({ externalMatchId: 'ext-m1', passes: 50, passAccuracy: 80, shots: 3, shotsOnTarget: 2, tackles: 4, interceptions: 2, duelsWon: 6, duelsTotal: 10, distanceCovered: 10000, sprintDistance: 2000 }),
        testConnection: jest.fn(),
      };
      maService.registerProvider(provider);

      const mockTxn = { commit: jest.fn(), rollback: jest.fn() };
      mockSequelizeTransaction.mockResolvedValue(mockTxn);
      mockMatchFindOrCreate.mockResolvedValue([{ id: 'match-001', homeScore: null, update: jest.fn() }, true]);
      mockClubFindOne.mockResolvedValue({ id: 'club-001' });
      mockPlayerMatchStatsUpsert.mockResolvedValue([{}, true]);
      mockExtMappingUpdate.mockResolvedValue([1]);

      const result = await maService.syncPlayerMatches('SyncTest', 'player-001', 'ext-001');
      expect(result.imported).toBe(1);
      expect(result.matches).toHaveLength(1);
      expect(mockTxn.commit).toHaveBeenCalled();
    });

    it('should return empty result if no external matches', async () => {
      const provider: maService.MatchAnalysisProvider = {
        name: 'EmptySync',
        fetchPlayerMatches: jest.fn().mockResolvedValue([]),
        fetchMatchStats: jest.fn(),
        testConnection: jest.fn(),
      };
      maService.registerProvider(provider);
      mockExtMappingUpdate.mockResolvedValue([1]);

      const result = await maService.syncPlayerMatches('EmptySync', 'player-001', 'ext-001');
      expect(result.imported).toBe(0);
      expect(result.matches).toHaveLength(0);
    });
  });
});
