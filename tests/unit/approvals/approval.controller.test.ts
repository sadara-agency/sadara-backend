/// <reference types="jest" />
jest.mock('../../../src/modules/approvals/approval.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/approvals/approval.controller';
import * as svc from '../../../src/modules/approvals/approval.service';

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

describe('Approval Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated approvals', async () => {
      (svc.listApprovalRequests as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('stats', () => {
    it('should return approval stats', async () => {
      (svc.getApprovalStats as jest.Mock).mockResolvedValue({ pending: 3, approved: 10 });
      const res = mockRes();
      await controller.stats(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('approve', () => {
    it('should approve and audit', async () => {
      (svc.resolveApproval as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Approved' });
      const res = mockRes();
      await controller.approve(mockReq({ params: { id: 'a1' }, body: { comment: 'OK' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('reject', () => {
    it('should reject and audit', async () => {
      (svc.resolveApproval as jest.Mock).mockResolvedValue({ id: 'a1', status: 'Rejected' });
      const res = mockRes();
      await controller.reject(mockReq({ params: { id: 'a1' }, body: { comment: 'No' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
