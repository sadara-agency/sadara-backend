/// <reference types="jest" />
jest.mock('../../../src/modules/wellness/developmentSession.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Coach', userRole: 'Coach' }),
}));
jest.mock('../../../src/shared/utils/cache', () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: 'wellness' },
}));

import * as controller from '../../../src/modules/wellness/developmentSession.controller';
import * as svc from '../../../src/modules/wellness/developmentSession.service';

const SESSION_ID = 'session-001';
const PLAYER_ID = 'player-001';

const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  user: { id: 'user-001', fullName: 'Coach', role: 'Coach' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

const mockSession = {
  id: SESSION_ID,
  playerId: PLAYER_ID,
  scheduledDate: '2026-04-22',
  sessionType: 'development_gym',
  status: 'pending',
};

describe('DevelopmentSession Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns paginated sessions', async () => {
      (svc.listSessions as jest.Mock).mockResolvedValue({
        data: [mockSession],
        meta: { total: 1, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.list(mockReq({ query: { page: '1', limit: '20' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('returns session detail', async () => {
      (svc.getSessionById as jest.Mock).mockResolvedValue(mockSession);
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: SESSION_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('creates session and returns 201', async () => {
      (svc.createSession as jest.Mock).mockResolvedValue(mockSession);
      const res = mockRes();
      await controller.create(
        mockReq({
          body: {
            playerId: PLAYER_ID,
            scheduledDate: '2026-04-22',
            sessionType: 'development_gym',
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('updates session and returns 200', async () => {
      (svc.updateSession as jest.Mock).mockResolvedValue({
        ...mockSession,
        sessionType: 'rehab',
      });
      const res = mockRes();
      await controller.update(
        mockReq({ params: { id: SESSION_ID }, body: { sessionType: 'rehab' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('deletes session and returns 200', async () => {
      (svc.deleteSession as jest.Mock).mockResolvedValue({ id: SESSION_ID });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: SESSION_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listForPlayer', () => {
    it('returns paginated sessions for player', async () => {
      (svc.listSessionsForPlayer as jest.Mock).mockResolvedValue({
        data: [mockSession],
        meta: { total: 1, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.listForPlayer(
        mockReq({ params: { playerId: PLAYER_ID }, query: {} }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('complete', () => {
    it('completes session and returns 200', async () => {
      (svc.completeSession as jest.Mock).mockResolvedValue({
        ...mockSession,
        status: 'completed',
      });
      const res = mockRes();
      await controller.complete(
        mockReq({
          params: { id: SESSION_ID },
          body: { status: 'completed', overallRpe: 7 },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('propagates 422 when session is already completed', async () => {
      const error = Object.assign(new Error('Session is already completed'), { statusCode: 422 });
      (svc.completeSession as jest.Mock).mockRejectedValue(error);
      const res = mockRes();
      await expect(
        controller.complete(
          mockReq({ params: { id: SESSION_ID }, body: { status: 'completed' } }),
          res,
        ),
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
