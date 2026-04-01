/// <reference types="jest" />
jest.mock('../../../src/modules/sessions/session.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/sessions/session.controller';
import * as svc from '../../../src/modules/sessions/session.service';

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

describe('Session Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated sessions', async () => {
      (svc.listSessions as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return session', async () => {
      (svc.getSessionById as jest.Mock).mockResolvedValue({ id: 's1', sessionType: 'Physical' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 's1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create and return 201', async () => {
      (svc.createSession as jest.Mock).mockResolvedValue({ id: 's1', sessionType: 'Physical', playerId: 'p1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { sessionType: 'Physical' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update session', async () => {
      (svc.updateSession as jest.Mock).mockResolvedValue({ id: 's1', notes: 'updated' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 's1' }, body: { notes: 'updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete session', async () => {
      (svc.deleteSession as jest.Mock).mockResolvedValue({ id: 's1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 's1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('stats', () => {
    it('should return stats', async () => {
      (svc.getSessionStats as jest.Mock).mockResolvedValue({ byType: [], byStatus: [], byOwner: [] });
      const res = mockRes();
      await controller.stats(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listByReferral', () => {
    it('should return sessions by referral', async () => {
      (svc.listByReferral as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      const res = mockRes();
      await controller.listByReferral(mockReq({ params: { referralId: 'r1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listByPlayer', () => {
    it('should return sessions by player', async () => {
      (svc.listByPlayer as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      const res = mockRes();
      await controller.listByPlayer(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
