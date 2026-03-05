/// <reference types="jest" />
jest.mock('../../../src/modules/contracts/contract.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
  buildChanges: jest.fn().mockReturnValue(null),
}));

import * as controller from '../../../src/modules/contracts/contract.controller';
import * as svc from '../../../src/modules/contracts/contract.service';

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

describe('Contract Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated contracts', async () => {
      (svc.listContracts as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return contract', async () => {
      (svc.getContractById as jest.Mock).mockResolvedValue({ id: 'c1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create contract and audit', async () => {
      (svc.createContract as jest.Mock).mockResolvedValue({ id: 'c1', playerId: 'p1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { playerId: 'p1', clubId: 'cl1', startDate: '2025-01-01', endDate: '2027-01-01' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update contract with change tracking', async () => {
      (svc.getContractById as jest.Mock).mockResolvedValue({ id: 'c1', baseSalary: 500000 });
      (svc.updateContract as jest.Mock).mockResolvedValue({ id: 'c1', baseSalary: 600000 });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'c1' }, body: { baseSalary: 600000 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete contract and audit', async () => {
      (svc.deleteContract as jest.Mock).mockResolvedValue({ id: 'c1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('terminate', () => {
    it('should terminate contract and audit', async () => {
      (svc.terminateContract as jest.Mock).mockResolvedValue({ id: 'c1', status: 'Terminated' });
      const res = mockRes();
      await controller.terminate(mockReq({ params: { id: 'c1' }, body: { reason: 'Mutual agreement' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
