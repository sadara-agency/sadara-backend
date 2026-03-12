/// <reference types="jest" />
import { mockNotification, mockUser, mockModelInstance } from '../../setup/test-helpers';

const mockNotifCreate = jest.fn();
const mockNotifFindAndCountAll = jest.fn();
const mockNotifCount = jest.fn();
const mockNotifUpdate = jest.fn();
const mockNotifDestroy = jest.fn();
const mockNotifBulkCreate = jest.fn();
const mockUserFindAll = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/notifications/notification.model', () => ({
  Notification: {
    create: (...a: unknown[]) => mockNotifCreate(...a),
    findAndCountAll: (...a: unknown[]) => mockNotifFindAndCountAll(...a),
    count: (...a: unknown[]) => mockNotifCount(...a),
    update: (...a: unknown[]) => mockNotifUpdate(...a),
    destroy: (...a: unknown[]) => mockNotifDestroy(...a),
    bulkCreate: (...a: unknown[]) => mockNotifBulkCreate(...a),
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findAll: (...a: unknown[]) => mockUserFindAll(...a),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/modules/notifications/notification.sse', () => ({
  publishNotification: jest.fn().mockResolvedValue(undefined),
}));

import * as notifService from '../../../src/modules/notifications/notification.service';

describe('Notification Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      mockNotifCreate.mockResolvedValue(mockModelInstance(mockNotification()));
      const result = await notifService.createNotification({ userId: 'user-001', type: 'offer', title: 'Test', body: 'Body' } as any);
      expect(result).toBeDefined();
    });

    it('should return null on duplicate', async () => {
      const err = new Error('Duplicate');
      (err as any).name = 'SequelizeUniqueConstraintError';
      mockNotifCreate.mockRejectedValue(err);
      const result = await notifService.createNotification({ userId: 'user-001', type: 'offer', title: 'Test', body: 'Body' } as any);
      expect(result).toBeNull();
    });
  });

  describe('notifyByRole', () => {
    it('should notify eligible users', async () => {
      mockUserFindAll.mockResolvedValue([
        mockModelInstance(mockUser({ id: 'u1', notificationPreferences: { offers: true } })),
        mockModelInstance(mockUser({ id: 'u2', notificationPreferences: { offers: true } })),
      ]);
      mockNotifBulkCreate.mockResolvedValue([{}, {}]);
      const result = await notifService.notifyByRole(['Admin', 'Manager'], { type: 'offer', title: 'Test', body: 'Body' } as any);
      expect(result).toBeDefined();
    });

    it('should handle no eligible users', async () => {
      mockUserFindAll.mockResolvedValue([]);
      const result = await notifService.notifyByRole(['Admin'], { type: 'offer', title: 'Test', body: 'Body' } as any);
      expect(result).toBe(0);
    });
  });

  describe('notifyUser', () => {
    it('should create notification for user', async () => {
      mockNotifCreate.mockResolvedValue(mockModelInstance(mockNotification()));
      const result = await notifService.notifyUser('user-001', { type: 'offer', title: 'Test', body: 'Body' } as any);
      expect(result).toBeDefined();
    });
  });

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      mockNotifFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockNotification())] });
      const result = await notifService.listNotifications('user-001', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by unread only', async () => {
      mockNotifFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await notifService.listNotifications('user-001', { unreadOnly: true, page: 1, limit: 10 });
      expect(mockNotifFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      mockNotifFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await notifService.listNotifications('user-001', { type: 'offer', page: 1, limit: 10 });
      expect(mockNotifFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count', async () => {
      mockNotifCount.mockResolvedValue(5);
      const result = await notifService.getUnreadCount('user-001');
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockNotifUpdate.mockResolvedValue([1]);
      const result = await notifService.markAsRead('user-001', 'notif-001');
      expect(result).toBe(true);
    });

    it('should return false if not found', async () => {
      mockNotifUpdate.mockResolvedValue([0]);
      const result = await notifService.markAsRead('user-001', 'bad');
      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockNotifUpdate.mockResolvedValue([10]);
      const result = await notifService.markAllAsRead('user-001');
      expect(result).toBe(10);
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      mockNotifUpdate.mockResolvedValue([1]);
      const result = await notifService.dismissNotification('user-001', 'notif-001');
      expect(result).toBe(true);
    });

    it('should return false if not found', async () => {
      mockNotifUpdate.mockResolvedValue([0]);
      const result = await notifService.dismissNotification('user-001', 'bad');
      expect(result).toBe(false);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old notifications', async () => {
      mockNotifDestroy.mockResolvedValue(5);
      const result = await notifService.cleanupOldNotifications(90);
      expect(result).toBe(5);
    });

    it('should handle no notifications to delete', async () => {
      mockNotifDestroy.mockResolvedValue(0);
      const result = await notifService.cleanupOldNotifications(90);
      expect(result).toBe(0);
    });
  });
});
