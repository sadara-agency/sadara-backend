/// <reference types="jest" />
import { mockModelInstance } from '../../../setup/test-helpers';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../../src/modules/media/press-releases/pressRelease.model', () => ({
  PressRelease: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

jest.mock('../../../../src/modules/players/player.model', () => ({ Player: {} }));
jest.mock('../../../../src/modules/clubs/club.model', () => ({ Club: {} }));
jest.mock('../../../../src/modules/users/user.model', () => ({ User: {} }));
jest.mock('../../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from '../../../../src/modules/media/press-releases/pressRelease.service';

const mockRelease = (overrides: Record<string, any> = {}) => ({
  id: 'pr-001',
  title: 'Player Signs Contract',
  slug: 'player-signs-contract-abc123',
  category: 'transfer',
  status: 'draft',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Press Release Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listPressReleases', () => {
    it('should return paginated results', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockRelease())] });
      const result = await svc.listPressReleases({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listPressReleases({ status: 'published', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'published' }) }),
      );
    });

    it('should filter by category', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listPressReleases({ category: 'transfer', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: 'transfer' }) }),
      );
    });
  });

  describe('getPressReleaseById', () => {
    it('should return the release', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockRelease()));
      const result = await svc.getPressReleaseById('pr-001');
      expect(result.id).toBe('pr-001');
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.getPressReleaseById('bad')).rejects.toThrow('Press release not found');
    });
  });

  describe('getPressReleaseBySlug', () => {
    it('should return by slug', async () => {
      mockFindOne.mockResolvedValue(mockModelInstance(mockRelease()));
      const result = await svc.getPressReleaseBySlug('player-signs-contract-abc123');
      expect(result.slug).toBe('player-signs-contract-abc123');
    });

    it('should throw 404 if slug not found', async () => {
      mockFindOne.mockResolvedValue(null);
      await expect(svc.getPressReleaseBySlug('bad-slug')).rejects.toThrow('Press release not found');
    });
  });

  describe('createPressRelease', () => {
    it('should create with generated slug and createdBy', async () => {
      mockCreate.mockResolvedValue(mockModelInstance(mockRelease()));
      await svc.createPressRelease({ title: 'New Release', category: 'general' }, 'user-001');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Release',
          slug: expect.stringContaining('new-release'),
          createdBy: 'user-001',
        }),
      );
    });
  });

  describe('updatePressRelease', () => {
    it('should update without changing slug if title unchanged', async () => {
      const item = mockModelInstance(mockRelease({ title: 'Same Title' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressRelease('pr-001', { contentEn: 'Updated body' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ contentEn: 'Updated body' }));
    });

    it('should regenerate slug if title changed', async () => {
      const item = mockModelInstance(mockRelease({ title: 'Old Title' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressRelease('pr-001', { title: 'New Title' });
      expect(item.update).toHaveBeenCalledWith(
        expect.objectContaining({ slug: expect.stringContaining('new-title') }),
      );
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.updatePressRelease('bad', { title: 'x' })).rejects.toThrow('Press release not found');
    });
  });

  describe('updatePressReleaseStatus', () => {
    it('should allow draft → review', async () => {
      const item = mockModelInstance(mockRelease({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressReleaseStatus('pr-001', { status: 'review' }, 'user-001');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'review' }));
    });

    it('should allow review → approved and set approvedBy', async () => {
      const item = mockModelInstance(mockRelease({ status: 'review' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressReleaseStatus('pr-001', { status: 'approved' }, 'user-001');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', approvedBy: 'user-001' }));
    });

    it('should allow approved → published and set publishedAt', async () => {
      const item = mockModelInstance(mockRelease({ status: 'approved' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressReleaseStatus('pr-001', { status: 'published' }, 'user-001');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', publishedAt: expect.any(Date) }));
    });

    it('should allow published → archived', async () => {
      const item = mockModelInstance(mockRelease({ status: 'published' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressReleaseStatus('pr-001', { status: 'archived' }, 'user-001');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'archived' }));
    });

    it('should allow archived → draft', async () => {
      const item = mockModelInstance(mockRelease({ status: 'archived' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updatePressReleaseStatus('pr-001', { status: 'draft' }, 'user-001');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    });

    it('should reject draft → published', async () => {
      const item = mockModelInstance(mockRelease({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(item);
      await expect(svc.updatePressReleaseStatus('pr-001', { status: 'published' }, 'user-001')).rejects.toThrow("Cannot transition from 'draft' to 'published'");
    });

    it('should reject draft → approved', async () => {
      const item = mockModelInstance(mockRelease({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(item);
      await expect(svc.updatePressReleaseStatus('pr-001', { status: 'approved' }, 'user-001')).rejects.toThrow("Cannot transition from 'draft' to 'approved'");
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.updatePressReleaseStatus('bad', { status: 'review' }, 'user-001')).rejects.toThrow('Press release not found');
    });
  });

  describe('deletePressRelease', () => {
    it('should delete the release', async () => {
      const item = mockModelInstance(mockRelease());
      mockFindByPk.mockResolvedValue(item);
      const result = await svc.deletePressRelease('pr-001');
      expect(item.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'pr-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.deletePressRelease('bad')).rejects.toThrow('Press release not found');
    });
  });
});
