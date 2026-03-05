/// <reference types="jest" />
jest.mock('../../../src/modules/notifications/notification.service');

import * as controller from '../../../src/modules/notifications/notification.controller';
import * as svc from '../../../src/modules/notifications/notification.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Notification Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated notifications', async () => {
      (svc.listNotifications as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('unreadCount', () => {
    it('should return unread count', async () => {
      (svc.getUnreadCount as jest.Mock).mockResolvedValue(5);
      const res = mockRes();
      await controller.unreadCount(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      (svc.markAsRead as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.markAsRead(mockReq({ params: { id: 'n1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      (svc.markAllAsRead as jest.Mock).mockResolvedValue(3);
      const res = mockRes();
      await controller.markAllAsRead(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('dismiss', () => {
    it('should dismiss notification', async () => {
      (svc.dismissNotification as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.dismiss(mockReq({ params: { id: 'n1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
