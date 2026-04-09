/// <reference types="jest" />

const mockClubFindOne = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findOne: (...a: unknown[]) => mockClubFindOne(...a),
    name: 'Club',
  },
}));

jest.mock('../../../src/modules/competitions/competition.model', () => ({
  Competition: {
    findOne: jest.fn().mockResolvedValue({
      id: 'comp-001',
      type: 'league',
      format: 'outdoor',
      gender: 'men',
      ageGroup: null,
    }),
    init: jest.fn(),
    name: 'Competition',
  },
  ClubCompetition: {
    findOne: jest.fn().mockResolvedValue(null),
    findOrCreate: jest.fn().mockResolvedValue([{}, true]),
    init: jest.fn(),
    name: 'ClubCompetition',
  },
}));

jest.mock('../../../src/modules/spl/spl.registry', () => ({
  SPL_CLUB_REGISTRY: [
    { nameEn: 'Al Hilal', nameAr: 'الهلال', splTeamId: '1', espnTeamId: '100' },
    { nameEn: 'Al Nassr', nameAr: 'النصر', splTeamId: '2', espnTeamId: '200' },
  ],
  findByPulseLiveTeamId: jest.fn(),
}));

jest.mock('../../../src/modules/spl/spl.pulselive', () => ({
  fetchStandings: jest.fn(),
  fetchRankedPlayers: jest.fn(),
  fetchPlayerStats: jest.fn(),
  fetchTeamStats: jest.fn(),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as splService from '../../../src/modules/spl/spl.service';

describe('SPL Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set mocks cleared by clearAllMocks
    const { Competition, ClubCompetition } = require('../../../src/modules/competitions/competition.model');
    (Competition.findOne as jest.Mock).mockResolvedValue({
      id: 'comp-001',
      type: 'league',
      format: 'outdoor',
      gender: 'men',
      ageGroup: null,
    });
    (ClubCompetition.findOne as jest.Mock).mockResolvedValue(null);
    (ClubCompetition.findOrCreate as jest.Mock).mockResolvedValue([{}, true]);
  });

  describe('seedClubExternalIds', () => {
    it('should update clubs with external IDs', async () => {
      const club = { id: 'club-001', update: jest.fn().mockResolvedValue({}) };
      mockClubFindOne.mockResolvedValue(club);
      const result = await splService.seedClubExternalIds();
      expect(result.updated).toBe(2);
      expect(result.notFound).toHaveLength(0);
    });

    it('should track not-found clubs', async () => {
      mockClubFindOne
        .mockResolvedValueOnce({ id: 'club-001', update: jest.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce(null);
      const result = await splService.seedClubExternalIds();
      expect(result.updated).toBe(1);
      expect(result.notFound).toContain('Al Nassr');
    });
  });

  describe('getSyncState', () => {
    it('should return current sync state', () => {
      const state = splService.getSyncState();
      expect(state).toHaveProperty('isRunning');
      expect(state).toHaveProperty('lastRun');
    });
  });

  describe('updateSyncState', () => {
    it('should update sync state', () => {
      splService.updateSyncState({ isRunning: true });
      const state = splService.getSyncState();
      expect(state.isRunning).toBe(true);
      // Reset
      splService.updateSyncState({ isRunning: false });
    });
  });
});
