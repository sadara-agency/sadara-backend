/// <reference types="jest" />
import { mockModelInstance } from '../../../setup/test-helpers';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../../src/modules/media/media-contacts/mediaContact.model', () => ({
  MediaContact: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

jest.mock('../../../../src/modules/users/user.model', () => ({ User: {} }));
jest.mock('../../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from '../../../../src/modules/media/media-contacts/mediaContact.service';

const mockContact = (overrides: Record<string, any> = {}) => ({
  id: 'contact-001',
  name: 'Ahmed Ali',
  outlet: 'Al Arabiya',
  email: 'ahmed@alarabiya.net',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Media Contact Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listMediaContacts', () => {
    it('should return paginated results', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockContact())] });
      const result = await svc.listMediaContacts({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('should return empty when no results', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const result = await svc.listMediaContacts({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(0);
    });

    it('should filter by outlet', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listMediaContacts({ outlet: 'BBC', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ outlet: expect.any(Object) }) }),
      );
    });
  });

  describe('getMediaContactById', () => {
    it('should return the contact', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockContact()));
      const result = await svc.getMediaContactById('contact-001');
      expect(result.id).toBe('contact-001');
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.getMediaContactById('bad')).rejects.toThrow('Media contact not found');
    });
  });

  describe('createMediaContact', () => {
    it('should create with createdBy', async () => {
      mockCreate.mockResolvedValue(mockModelInstance(mockContact()));
      await svc.createMediaContact({ name: 'Ahmed', outlet: 'BBC' }, 'user-001');
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'user-001' }));
    });
  });

  describe('updateMediaContact', () => {
    it('should update the contact', async () => {
      const item = mockModelInstance(mockContact());
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaContact('contact-001', { name: 'Updated' });
      expect(item.update).toHaveBeenCalledWith({ name: 'Updated' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.updateMediaContact('bad', { name: 'x' })).rejects.toThrow('Media contact not found');
    });
  });

  describe('deleteMediaContact', () => {
    it('should delete the contact', async () => {
      const item = mockModelInstance(mockContact());
      mockFindByPk.mockResolvedValue(item);
      const result = await svc.deleteMediaContact('contact-001');
      expect(item.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'contact-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.deleteMediaContact('bad')).rejects.toThrow('Media contact not found');
    });
  });
});
