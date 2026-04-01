/// <reference types="jest" />
jest.mock('../../../src/modules/messaging/messaging.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/messaging/messaging.controller';
import * as svc from '../../../src/modules/messaging/messaging.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Messaging Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listConversations', () => {
    it('should return paginated conversations', async () => {
      (svc.listConversations as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      const res = mockRes();
      await controller.listConversations(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createConversation', () => {
    it('should create and return 201', async () => {
      (svc.createConversation as jest.Mock).mockResolvedValue({ id: 'c1', type: 'direct' });
      const res = mockRes();
      await controller.createConversation(mockReq({ body: { type: 'direct', participantIds: ['u2'] } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      (svc.getMessages as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });
      const res = mockRes();
      await controller.getMessages(mockReq({ params: { conversationId: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('sendMessage', () => {
    it('should send and return 201', async () => {
      (svc.sendMessage as jest.Mock).mockResolvedValue({ id: 'm1', content: 'Hi' });
      const res = mockRes();
      await controller.sendMessage(mockReq({ params: { conversationId: 'c1' }, body: { content: 'Hi' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('markRead', () => {
    it('should mark as read', async () => {
      (svc.markConversationRead as jest.Mock).mockResolvedValue({ lastReadAt: new Date().toISOString() });
      const res = mockRes();
      await controller.markRead(mockReq({ params: { conversationId: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
