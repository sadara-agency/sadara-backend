/// <reference types="jest" />
jest.mock('../../../src/modules/clearances/clearance.service');

import * as controller from '../../../src/modules/clearances/clearance.controller';
import * as svc from '../../../src/modules/clearances/clearance.service';

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

describe('Clearance Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated clearances', async () => {
      (svc.listClearances as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq({ query: { limit: 20 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return clearance', async () => {
      (svc.getClearanceById as jest.Mock).mockResolvedValue({ id: 'cl1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'cl1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw 404 if not found', async () => {
      (svc.getClearanceById as jest.Mock).mockResolvedValue(null);
      await expect(controller.getById(mockReq({ params: { id: 'bad' } }), mockRes())).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create clearance', async () => {
      (svc.createClearance as jest.Mock).mockResolvedValue({ id: 'cl1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { contractId: 'c1', reason: 'End' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update clearance', async () => {
      (svc.updateClearance as jest.Mock).mockResolvedValue({ id: 'cl1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'cl1' }, body: { reason: 'New' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('complete', () => {
    it('should complete clearance', async () => {
      (svc.completeClearance as jest.Mock).mockResolvedValue({ id: 'cl1', status: 'Completed' });
      const res = mockRes();
      await controller.complete(mockReq({ params: { id: 'cl1' }, body: { action: 'complete' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete clearance', async () => {
      (svc.deleteClearance as jest.Mock).mockResolvedValue({ id: 'cl1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'cl1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getByContract', () => {
    it('should return clearances for contract', async () => {
      (svc.getClearancesByContract as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getByContract(mockReq({ params: { contractId: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
