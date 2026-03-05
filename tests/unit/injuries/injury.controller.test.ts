/// <reference types="jest" />
jest.mock('../../../src/modules/injuries/injury.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/injuries/injury.controller';
import * as svc from '../../../src/modules/injuries/injury.service';

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

describe('Injury Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated injuries', async () => {
      (svc.listInjuries as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return injury', async () => {
      (svc.getInjuryById as jest.Mock).mockResolvedValue({ id: 'i1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'i1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getByPlayer', () => {
    it('should return player injuries', async () => {
      (svc.getPlayerInjuries as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getByPlayer(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create injury and audit', async () => {
      (svc.createInjury as jest.Mock).mockResolvedValue({ id: 'i1', injuryType: 'ACL', playerId: 'p1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { injuryType: 'ACL', playerId: 'p1', bodyPart: 'Knee', injuryDate: '2025-01-01' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update injury and audit', async () => {
      (svc.updateInjury as jest.Mock).mockResolvedValue({ id: 'i1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'i1' }, body: { severity: 'Severe' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addUpdate', () => {
    it('should add injury update and audit', async () => {
      (svc.addInjuryUpdate as jest.Mock).mockResolvedValue({ id: 'u1', notes: 'Improving' });
      const res = mockRes();
      await controller.addUpdate(mockReq({ params: { id: 'i1' }, body: { notes: 'Improving' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('remove', () => {
    it('should delete injury and audit', async () => {
      (svc.deleteInjury as jest.Mock).mockResolvedValue({ id: 'i1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'i1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('stats', () => {
    it('should return injury stats', async () => {
      (svc.getInjuryStats as jest.Mock).mockResolvedValue({ total: 5 });
      const res = mockRes();
      await controller.stats(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
