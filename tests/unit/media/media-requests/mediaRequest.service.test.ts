/// <reference types="jest" />
import { mockModelInstance } from '../../../setup/test-helpers';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../../src/modules/media/media-requests/mediaRequest.model', () => ({
  MediaRequest: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

jest.mock('../../../../src/modules/players/player.model', () => ({ Player: {} }));
jest.mock('../../../../src/modules/clubs/club.model', () => ({ Club: {} }));
jest.mock('../../../../src/modules/users/user.model', () => ({ User: {} }));
jest.mock('../../../../src/modules/media/media-contacts/mediaContact.model', () => ({
  MediaContact: { findByPk: jest.fn() },
}));
jest.mock('../../../../src/modules/notifications/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
  notifyByRole: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../../../src/modules/calendar/event.service', () => ({
  createEvent: jest.fn().mockResolvedValue({ id: 'evt-001' }),
}));
jest.mock('../../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from '../../../../src/modules/media/media-requests/mediaRequest.service';

const mockRequest = (overrides: Record<string, any> = {}) => ({
  id: 'req-001',
  journalistName: 'John Doe',
  outlet: 'BBC Sport',
  subject: 'Transfer update',
  requestType: 'interview',
  status: 'pending',
  priority: 'normal',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Media Request Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listMediaRequests', () => {
    it('should return paginated results', async () => {
      const item = mockModelInstance(mockRequest());
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [item] });
      const result = await svc.listMediaRequests({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should return empty when no results', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const result = await svc.listMediaRequests({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(0);
    });

    it('should pass status filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listMediaRequests({ status: 'pending', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'pending' }) }),
      );
    });

    it('should pass priority filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listMediaRequests({ priority: 'high', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ priority: 'high' }) }),
      );
    });
  });

  describe('getMediaRequestById', () => {
    it('should return the request', async () => {
      const item = mockModelInstance(mockRequest());
      mockFindByPk.mockResolvedValue(item);
      const result = await svc.getMediaRequestById('req-001');
      expect(result.id).toBe('req-001');
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.getMediaRequestById('bad')).rejects.toThrow('Media request not found');
    });
  });

  describe('createMediaRequest', () => {
    it('should create with createdBy', async () => {
      const data = { journalistName: 'John', outlet: 'BBC', subject: 'Test', requestType: 'interview' as const, priority: 'normal' as const };
      mockCreate.mockResolvedValue(mockModelInstance(mockRequest()));
      await svc.createMediaRequest(data, 'user-001');
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'user-001' }));
    });

    it('should convert deadline string to Date', async () => {
      const data = { journalistName: 'John', outlet: 'BBC', subject: 'Test', requestType: 'interview' as const, priority: 'normal' as const, deadline: '2026-04-01T12:00:00+00:00' };
      mockCreate.mockResolvedValue(mockModelInstance(mockRequest()));
      await svc.createMediaRequest(data, 'user-001');
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ deadline: expect.any(Date) }));
    });
  });

  describe('updateMediaRequest', () => {
    it('should update the request', async () => {
      const item = mockModelInstance(mockRequest());
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaRequest('req-001', { subject: 'Updated' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Updated' }));
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.updateMediaRequest('bad', { subject: 'x' })).rejects.toThrow('Media request not found');
    });
  });

  describe('updateMediaRequestStatus', () => {
    it('should allow pending → approved', async () => {
      const item = mockModelInstance(mockRequest({ status: 'pending' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaRequestStatus('req-001', { status: 'approved' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('should allow pending → declined', async () => {
      const item = mockModelInstance(mockRequest({ status: 'pending' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaRequestStatus('req-001', { status: 'declined', declineReason: 'Not available' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'declined', declineReason: 'Not available' }));
    });

    it('should allow approved → scheduled', async () => {
      const item = mockModelInstance(mockRequest({ status: 'approved' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaRequestStatus('req-001', { status: 'scheduled' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }));
    });

    it('should allow scheduled → completed', async () => {
      const item = mockModelInstance(mockRequest({ status: 'scheduled' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaRequestStatus('req-001', { status: 'completed' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    });

    it('should allow declined → pending', async () => {
      const item = mockModelInstance(mockRequest({ status: 'declined' }));
      mockFindByPk.mockResolvedValue(item);
      await svc.updateMediaRequestStatus('req-001', { status: 'pending' });
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });

    it('should reject invalid transition pending → completed', async () => {
      const item = mockModelInstance(mockRequest({ status: 'pending' }));
      mockFindByPk.mockResolvedValue(item);
      await expect(svc.updateMediaRequestStatus('req-001', { status: 'completed' })).rejects.toThrow("Cannot transition from 'pending' to 'completed'");
    });

    it('should reject transition from completed', async () => {
      const item = mockModelInstance(mockRequest({ status: 'completed' }));
      mockFindByPk.mockResolvedValue(item);
      await expect(svc.updateMediaRequestStatus('req-001', { status: 'pending' })).rejects.toThrow("Cannot transition from 'completed' to 'pending'");
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.updateMediaRequestStatus('bad', { status: 'approved' })).rejects.toThrow('Media request not found');
    });
  });

  describe('deleteMediaRequest', () => {
    it('should delete the request', async () => {
      const item = mockModelInstance(mockRequest());
      mockFindByPk.mockResolvedValue(item);
      const result = await svc.deleteMediaRequest('req-001');
      expect(item.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'req-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.deleteMediaRequest('bad')).rejects.toThrow('Media request not found');
    });
  });
});
