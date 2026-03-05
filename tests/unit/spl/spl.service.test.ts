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

jest.mock('../../../src/modules/spl/spl.registry', () => ({
  SPL_CLUB_REGISTRY: [
    { nameEn: 'Al Hilal', nameAr: 'الهلال', splTeamId: '1', espnTeamId: '100' },
    { nameEn: 'Al Nassr', nameAr: 'النصر', splTeamId: '2', espnTeamId: '200' },
  ],
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as splService from '../../../src/modules/spl/spl.service';

describe('SPL Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

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
