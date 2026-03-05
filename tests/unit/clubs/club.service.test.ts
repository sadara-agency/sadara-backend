/// <reference types="jest" />
import { mockClub, mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockClubCreate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
    transaction: jest.fn(async (cb: any) => cb({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockClubCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { name: 'Player' },
}));

jest.mock('../../../src/modules/Users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as clubService from '../../../src/modules/clubs/club.service';
const { sequelize } = require('../../../src/config/database');

describe('Club Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LIST CLUBS
  // ════════════════════════════════════════════════════════
  describe('listClubs', () => {
    it('should return paginated clubs', async () => {
      mockFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(mockClub())],
      });

      const result = await clubService.listClubs({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by type', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await clubService.listClubs({ type: 'Club', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await clubService.listClubs({ search: 'Hilal', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // GET CLUB BY ID
  // ════════════════════════════════════════════════════════
  describe('getClubById', () => {
    it('should return club with contacts and players', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
      sequelize.query
        .mockResolvedValueOnce([{ id: 'contact-1', name: 'John' }]) // contacts
        .mockResolvedValueOnce([mockModelInstance({ id: 'p1', firstName: 'Salem' })]) // players
        .mockResolvedValueOnce([mockModelInstance({ id: 'c1', status: 'Active' })]); // contracts

      const result = await clubService.getClubById('club-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(clubService.getClubById('bad')).rejects.toThrow('Club not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE CLUB
  // ════════════════════════════════════════════════════════
  describe('createClub', () => {
    it('should create a club', async () => {
      mockClubCreate.mockResolvedValue(mockModelInstance(mockClub()));

      const result = await clubService.createClub({ name: 'Al-Hilal' } as any);

      expect(result).toBeDefined();
      expect(mockClubCreate).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE CLUB
  // ════════════════════════════════════════════════════════
  describe('updateClub', () => {
    it('should update club fields', async () => {
      const club = mockModelInstance(mockClub());
      mockFindByPk.mockResolvedValue(club);

      await clubService.updateClub('club-001', { city: 'Jeddah' } as any);

      expect(club.update).toHaveBeenCalledWith(expect.objectContaining({ city: 'Jeddah' }));
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(clubService.updateClub('bad', { city: 'x' } as any)).rejects.toThrow('Club not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE CLUB
  // ════════════════════════════════════════════════════════
  describe('deleteClub', () => {
    it('should soft-delete club and cascade FKs', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
      sequelize.query.mockResolvedValue([]);
      sequelize.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      const result = await clubService.deleteClub('club-001');

      expect(result).toEqual({ id: 'club-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(clubService.deleteClub('bad')).rejects.toThrow('Club not found');
    });
  });

  describe('deleteClubs', () => {
    it('should bulk delete clubs', async () => {
      sequelize.query.mockResolvedValue([1]);
      sequelize.transaction.mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
      });

      const result = await clubService.deleteClubs(['club-001', 'club-002']);

      expect(result).toBeDefined();
    });

    it('should return 0 for empty array', async () => {
      const result = await clubService.deleteClubs([]);

      expect(result).toEqual({ count: 0 });
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE LOGO
  // ════════════════════════════════════════════════════════
  describe('updateClubLogo', () => {
    it('should update logo URL', async () => {
      const club = mockModelInstance(mockClub());
      mockFindByPk.mockResolvedValue(club);

      await clubService.updateClubLogo('club-001', 'https://cdn.example.com/logo.png');

      expect(club.update).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: 'https://cdn.example.com/logo.png' }));
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(clubService.updateClubLogo('bad', 'url')).rejects.toThrow('Club not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // CONTACTS
  // ════════════════════════════════════════════════════════
  describe('createContact', () => {
    it('should create contact for club', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
      sequelize.query.mockResolvedValue([{ id: 'contact-new', name: 'John Doe' }]);

      const result = await clubService.createContact('club-001', { name: 'John Doe', role: 'Agent' } as any);

      expect(result).toBeDefined();
    });

    it('should throw 404 if club not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        clubService.createContact('bad', { name: 'John' } as any),
      ).rejects.toThrow('Club not found');
    });
  });

  describe('updateContact', () => {
    it('should update contact fields', async () => {
      sequelize.query.mockResolvedValue([[{ id: 'contact-001', name: 'Updated' }], { rowCount: 1 }]);

      const result = await clubService.updateContact('contact-001', 'club-001', { name: 'Updated' } as any);

      expect(result).toBeDefined();
    });

    it('should throw 400 if no fields provided', async () => {
      await expect(
        clubService.updateContact('contact-001', 'club-001', {} as any),
      ).rejects.toThrow();
    });

    it('should throw 404 if contact not found', async () => {
      sequelize.query.mockResolvedValue([[], { rowCount: 0 }]);

      await expect(
        clubService.updateContact('bad', 'club-001', { name: 'x' } as any),
      ).rejects.toThrow();
    });
  });

  describe('deleteContact', () => {
    it('should delete contact', async () => {
      sequelize.query.mockResolvedValue([[], { rowCount: 1 }]);

      const result = await clubService.deleteContact('contact-001', 'club-001');

      expect(result).toEqual({ id: 'contact-001' });
    });

    it('should throw 404 if contact not found', async () => {
      sequelize.query.mockResolvedValue([[], { rowCount: 0 }]);

      await expect(clubService.deleteContact('bad', 'club-001')).rejects.toThrow();
    });
  });
});
