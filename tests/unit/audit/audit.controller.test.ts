/// <reference types="jest" />
jest.mock('../../../src/modules/audit/audit.service');

import * as controller from '../../../src/modules/audit/audit.controller';
import * as auditService from '../../../src/modules/audit/audit.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Audit Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated audit logs', async () => {
      (auditService.listAuditLogs as jest.Mock).mockResolvedValue({
        data: [{ id: 'a1', action: 'CREATE', entity: 'players', entityId: 'p1', userId: 'u1', userName: 'Admin', userRole: 'Admin', createdAt: new Date(), detail: 'test' }],
        meta: { total: 1, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.list(mockReq({ query: { page: 1, limit: 20 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
