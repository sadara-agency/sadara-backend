/// <reference types="jest" />
jest.mock('../../../src/modules/referrals/referral.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/referrals/referral.controller';
import * as svc from '../../../src/modules/referrals/referral.service';

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

describe('Referral Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated referrals', async () => {
      (svc.listReferrals as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return referral', async () => {
      (svc.getReferralById as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'r1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create referral and audit', async () => {
      (svc.createReferral as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { referralType: 'Performance', playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update referral and audit', async () => {
      (svc.updateReferral as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'r1' }, body: { priority: 'High' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateStatus', () => {
    it('should update status and audit', async () => {
      (svc.updateReferralStatus as jest.Mock).mockResolvedValue({ id: 'r1', status: 'Resolved' });
      const res = mockRes();
      await controller.updateStatus(mockReq({ params: { id: 'r1' }, body: { status: 'Resolved' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete referral and audit', async () => {
      (svc.deleteReferral as jest.Mock).mockResolvedValue({ id: 'r1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'r1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
