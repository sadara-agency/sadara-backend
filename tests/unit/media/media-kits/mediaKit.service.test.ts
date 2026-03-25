/// <reference types="jest" />
import { mockModelInstance, mockPlayer, mockClub } from '../../../setup/test-helpers';

const mockGenFindAndCountAll = jest.fn();
const mockGenFindByPk = jest.fn();
const mockGenCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockClubFindByPk = jest.fn();

jest.mock('../../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../../src/modules/media/media-kits/mediaKit.model', () => ({
  MediaKitGeneration: {
    findAndCountAll: (...a: unknown[]) => mockGenFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockGenFindByPk(...a),
    create: (...a: unknown[]) => mockGenCreate(...a),
  },
}));

jest.mock('../../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
  },
}));

jest.mock('../../../../src/modules/clubs/club.model', () => ({
  Club: {
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
  },
}));

jest.mock('../../../../src/modules/users/user.model', () => ({ User: {} }));
jest.mock('../../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from '../../../../src/modules/media/media-kits/mediaKit.service';

const mockGeneration = (overrides: Record<string, any> = {}) => ({
  id: 'gen-001',
  templateType: 'player_profile',
  language: 'both',
  playerId: 'player-001',
  generatedBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Media Kit Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generatePlayerKit', () => {
    it('should create a player profile generation record', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
      mockGenCreate.mockResolvedValue(mockModelInstance(mockGeneration()));
      const result = await svc.generatePlayerKit('player-001', 'both', 'user-001');
      expect(result).toBeDefined();
      expect(mockGenCreate).toHaveBeenCalledWith(
        expect.objectContaining({ templateType: 'player_profile', playerId: 'player-001', generatedBy: 'user-001' }),
      );
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(svc.generatePlayerKit('bad', 'en', 'user-001')).rejects.toThrow('Player not found');
    });
  });

  describe('generateSquadKit', () => {
    it('should create a squad roster generation record', async () => {
      mockClubFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
      mockGenCreate.mockResolvedValue(mockModelInstance(mockGeneration({ templateType: 'squad_roster', clubId: 'club-001' })));
      const result = await svc.generateSquadKit('club-001', 'en', 'user-001');
      expect(result).toBeDefined();
      expect(mockGenCreate).toHaveBeenCalledWith(
        expect.objectContaining({ templateType: 'squad_roster', clubId: 'club-001', generatedBy: 'user-001' }),
      );
    });

    it('should throw 404 if club not found', async () => {
      mockClubFindByPk.mockResolvedValue(null);
      await expect(svc.generateSquadKit('bad', 'ar', 'user-001')).rejects.toThrow('Club not found');
    });
  });

  describe('listGenerationHistory', () => {
    it('should return paginated results', async () => {
      mockGenFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockGeneration())] });
      const result = await svc.listGenerationHistory({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('should filter by templateType', async () => {
      mockGenFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listGenerationHistory({ templateType: 'player_profile', page: 1, limit: 10 });
      expect(mockGenFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ templateType: 'player_profile' }) }),
      );
    });

    it('should filter by playerId', async () => {
      mockGenFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listGenerationHistory({ playerId: 'player-001', page: 1, limit: 10 });
      expect(mockGenFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ playerId: 'player-001' }) }),
      );
    });
  });

  describe('getGenerationById', () => {
    it('should return the generation', async () => {
      mockGenFindByPk.mockResolvedValue(mockModelInstance(mockGeneration()));
      const result = await svc.getGenerationById('gen-001');
      expect(result.id).toBe('gen-001');
    });

    it('should throw 404 if not found', async () => {
      mockGenFindByPk.mockResolvedValue(null);
      await expect(svc.getGenerationById('bad')).rejects.toThrow('Media kit generation not found');
    });
  });
});
