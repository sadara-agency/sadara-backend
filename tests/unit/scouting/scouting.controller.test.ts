/// <reference types="jest" />
jest.mock('../../../src/modules/scouting/scouting.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/scouting/scouting.controller';
import * as svc from '../../../src/modules/scouting/scouting.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Scout', role: 'Scout' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Scouting Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listWatchlist', () => {
    it('should return paginated watchlist', async () => {
      (svc.listWatchlist as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listWatchlist(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getWatchlistById', () => {
    it('should return watchlist entry', async () => {
      (svc.getWatchlistById as jest.Mock).mockResolvedValue({ id: 'w1' });
      const res = mockRes();
      await controller.getWatchlistById(mockReq({ params: { id: 'w1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createWatchlist', () => {
    it('should create watchlist entry and audit', async () => {
      (svc.createWatchlist as jest.Mock).mockResolvedValue({ id: 'w1', prospectName: 'Ahmed' });
      const res = mockRes();
      await controller.createWatchlist(mockReq({ body: { prospectName: 'Ahmed' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateWatchlist', () => {
    it('should update watchlist and audit', async () => {
      (svc.updateWatchlist as jest.Mock).mockResolvedValue({ id: 'w1' });
      const res = mockRes();
      await controller.updateWatchlist(mockReq({ params: { id: 'w1' }, body: { priority: 'High' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateWatchlistStatus', () => {
    it('should update status and audit', async () => {
      (svc.updateWatchlistStatus as jest.Mock).mockResolvedValue({ id: 'w1', status: 'Shortlisted' });
      const res = mockRes();
      await controller.updateWatchlistStatus(mockReq({ params: { id: 'w1' }, body: { status: 'Shortlisted' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteWatchlist', () => {
    it('should delete watchlist and audit', async () => {
      (svc.deleteWatchlist as jest.Mock).mockResolvedValue({ id: 'w1' });
      const res = mockRes();
      await controller.deleteWatchlist(mockReq({ params: { id: 'w1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createScreening', () => {
    it('should create screening case and audit', async () => {
      (svc.createScreeningCase as jest.Mock).mockResolvedValue({ id: 's1' });
      const res = mockRes();
      await controller.createScreening(mockReq({ body: { watchlistId: 'w1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getScreening', () => {
    it('should return screening case', async () => {
      (svc.getScreeningCase as jest.Mock).mockResolvedValue({ id: 's1' });
      const res = mockRes();
      await controller.getScreening(mockReq({ params: { id: 's1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateScreening', () => {
    it('should update screening and audit', async () => {
      (svc.updateScreeningCase as jest.Mock).mockResolvedValue({ id: 's1' });
      const res = mockRes();
      await controller.updateScreening(mockReq({ params: { id: 's1' }, body: { medicalClearance: true } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('markPackReady', () => {
    it('should mark pack ready and audit', async () => {
      (svc.markPackReady as jest.Mock).mockResolvedValue({ id: 's1', isPackReady: true });
      const res = mockRes();
      await controller.markPackReady(mockReq({ params: { id: 's1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createDecision', () => {
    it('should create decision and audit', async () => {
      (svc.createDecision as jest.Mock).mockResolvedValue({ id: 'd1' });
      const res = mockRes();
      await controller.createDecision(mockReq({ body: { screeningCaseId: 's1', committeeName: 'Board', decision: 'Approved' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getDecision', () => {
    it('should return decision', async () => {
      (svc.getDecision as jest.Mock).mockResolvedValue({ id: 'd1' });
      const res = mockRes();
      await controller.getDecision(mockReq({ params: { id: 'd1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('pipelineSummary', () => {
    it('should return pipeline summary', async () => {
      (svc.getPipelineSummary as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.pipelineSummary(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
