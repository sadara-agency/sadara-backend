/// <reference types="jest" />
import { mockPlayer, mockClub, mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockDestroy = jest.fn();
const mockProviderFindAll = jest.fn();
const mockProviderUpsert = jest.fn();
const mockProviderFindOne = jest.fn();
const mockHistoryUpdate = jest.fn();
const mockHistoryCreate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    destroy: (...a: unknown[]) => mockDestroy(...a),
  },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { name: 'Club' },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/modules/players/playerClubHistory.model', () => ({
  PlayerClubHistory: {
    update: (...a: unknown[]) => mockHistoryUpdate(...a),
    create: (...a: unknown[]) => mockHistoryCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/externalProvider.model', () => ({
  ExternalProviderMapping: {
    findAll: (...a: unknown[]) => mockProviderFindAll(...a),
    upsert: (...a: unknown[]) => mockProviderUpsert(...a),
    findOne: (...a: unknown[]) => mockProviderFindOne(...a),
  },
}));

jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as playerService from '../../../src/modules/players/player.service';

describe('Player Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LIST PLAYERS
  // ════════════════════════════════════════════════════════
  describe('listPlayers', () => {
    it('should return paginated players', async () => {
      const player = mockModelInstance(mockPlayer());
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [player] });
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([]);

      const result = await playerService.listPlayers({ page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([]);

      await playerService.listPlayers({ status: 'Active', page: 1, limit: 10 });

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where).toBeDefined();
    });

    it('should apply search filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([]);

      await playerService.listPlayers({ search: 'Salem', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by position', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([]);

      await playerService.listPlayers({ position: 'Forward', page: 1, limit: 10 });

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════
  // GET PLAYER BY ID
  // ════════════════════════════════════════════════════════
  describe('getPlayerById', () => {
    it('should return player with counts', async () => {
      const player = mockModelInstance(mockPlayer());
      mockFindByPk.mockResolvedValue(player);
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([{ activeContracts: 1, activeInjuries: 0, openTasks: 2 }]);

      const result = await playerService.getPlayerById('player-001');

      expect(result).toBeDefined();
      expect(mockFindByPk).toHaveBeenCalledWith('player-001', expect.anything());
    });

    it('should throw 404 if player not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(playerService.getPlayerById('nonexistent')).rejects.toThrow('Player not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE PLAYER
  // ════════════════════════════════════════════════════════
  describe('createPlayer', () => {
    it('should create a player with createdBy', async () => {
      const created = mockModelInstance(mockPlayer());
      mockCreate.mockResolvedValue(created);

      const result = await playerService.createPlayer(
        { firstName: 'Salem', lastName: 'Al-Dawsari', dateOfBirth: '1991-08-19' },
        'user-001',
      );

      expect(result).toBeDefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'user-001' }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE PLAYER
  // ════════════════════════════════════════════════════════
  describe('updatePlayer', () => {
    it('should update player fields', async () => {
      const player = mockModelInstance(mockPlayer());
      mockFindByPk.mockResolvedValue(player);

      const result = await playerService.updatePlayer('player-001', { position: 'Midfielder' });

      expect(result).toBeDefined();
      expect(player.update).toHaveBeenCalledWith(expect.objectContaining({ position: 'Midfielder' }), expect.anything());
    });

    it('should throw 404 if player not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(playerService.updatePlayer('nonexistent', { position: 'GK' })).rejects.toThrow('Player not found');
    });

    it('should track club history when clubId changes', async () => {
      const player = mockModelInstance(mockPlayer({ currentClubId: 'club-001' }));
      mockFindByPk.mockResolvedValue(player);
      mockHistoryUpdate.mockResolvedValue([1]);
      mockHistoryCreate.mockResolvedValue({});

      await playerService.updatePlayer('player-001', { currentClubId: 'club-002' });

      expect(player.update).toHaveBeenCalledWith(expect.objectContaining({ currentClubId: 'club-002' }), expect.anything());
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE PLAYER
  // ════════════════════════════════════════════════════════
  describe('deletePlayer', () => {
    it('should delete player without active contracts', async () => {
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([{ count: '0' }]);
      mockDestroy.mockResolvedValue(1);

      const result = await playerService.deletePlayer('player-001');

      expect(result).toEqual({ id: 'player-001' });
    });

    it('should throw 400 if player has active contracts', async () => {
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([{ active_contracts: 2 }]);

      await expect(playerService.deletePlayer('player-001')).rejects.toThrow();
    });

    it('should throw 404 if player not found', async () => {
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([{ active_contracts: 0 }]);
      mockDestroy.mockResolvedValue(0);

      await expect(playerService.deletePlayer('nonexistent')).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // PROVIDERS
  // ════════════════════════════════════════════════════════
  describe('getPlayerProviders', () => {
    it('should return provider mappings', async () => {
      mockProviderFindAll.mockResolvedValue([{ providerName: 'wyscout', externalPlayerId: '123' }]);

      const result = await playerService.getPlayerProviders('player-001');

      expect(result).toHaveLength(1);
    });
  });

  describe('upsertPlayerProvider', () => {
    it('should upsert provider mapping', async () => {
      mockProviderUpsert.mockResolvedValue([{ id: 'map-001' }, true]);

      const result = await playerService.upsertPlayerProvider('player-001', {
        providerName: 'wyscout',
        externalPlayerId: '456',
      });

      expect(result).toBeDefined();
    });
  });

  describe('removePlayerProvider', () => {
    it('should remove provider mapping', async () => {
      const mapping = mockModelInstance({ id: 'map-001', providerName: 'wyscout' });
      mockProviderFindOne.mockResolvedValue(mapping);

      const result = await playerService.removePlayerProvider('player-001', 'wyscout');

      expect(mapping.destroy).toHaveBeenCalled();
      expect(result).toEqual({ playerId: 'player-001', providerName: 'wyscout' });
    });

    it('should throw if provider mapping not found', async () => {
      mockProviderFindOne.mockResolvedValue(null);

      await expect(playerService.removePlayerProvider('player-001', 'unknown')).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // DUPLICATE CHECK
  // ════════════════════════════════════════════════════════
  describe('checkDuplicate', () => {
    it('should return matches when name and DOB provided', async () => {
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([mockPlayer()]);

      const result = await playerService.checkDuplicate({
        firstName: 'Salem',
        lastName: 'Al-Dawsari',
        dateOfBirth: '1991-08-19',
      });

      expect(result).toBeDefined();
    });

    it('should return empty for insufficient params', async () => {
      const result = await playerService.checkDuplicate({ firstName: 'Salem' });

      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════
  // CLUB HISTORY
  // ════════════════════════════════════════════════════════
  describe('getClubHistory', () => {
    it('should return club history', async () => {
      const { sequelize } = require('../../../src/config/database');
      sequelize.query.mockResolvedValue([
        { clubId: 'club-001', name: 'Al-Hilal', joinDate: '2020-01-01' },
      ]);

      const result = await playerService.getClubHistory('player-001');

      expect(result).toHaveLength(1);
    });
  });
});
