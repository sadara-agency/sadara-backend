/// <reference types="jest" />
jest.mock('../../../src/modules/gates/gate.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/gates/gate.controller';
import * as svc from '../../../src/modules/gates/gate.service';

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

describe('Gate Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated gates', async () => {
      (svc.listGates as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return gate', async () => {
      (svc.getGateById as jest.Mock).mockResolvedValue({ id: 'g1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'g1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPlayerGates', () => {
    it('should return player gates', async () => {
      (svc.getPlayerGates as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getPlayerGates(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create gate and audit', async () => {
      (svc.createGate as jest.Mock).mockResolvedValue({ id: 'g1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { playerId: 'p1', gateNumber: '1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('initialize', () => {
    it('should initialize gate and audit', async () => {
      (svc.initializeGate as jest.Mock).mockResolvedValue({ id: 'g1' });
      const res = mockRes();
      await controller.initialize(mockReq({ body: { playerId: 'p1', gateNumber: '0' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('advance', () => {
    it('should advance gate and audit', async () => {
      (svc.advanceGate as jest.Mock).mockResolvedValue({ id: 'g1', status: 'InProgress' });
      const res = mockRes();
      await controller.advance(mockReq({ params: { id: 'g1' }, body: { action: 'start' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('update', () => {
    it('should update gate and audit', async () => {
      (svc.updateGate as jest.Mock).mockResolvedValue({ id: 'g1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'g1' }, body: { notes: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete gate and audit', async () => {
      (svc.deleteGate as jest.Mock).mockResolvedValue({ id: 'g1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'g1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addChecklistItem', () => {
    it('should add checklist item and audit', async () => {
      (svc.addChecklistItem as jest.Mock).mockResolvedValue({ id: 'ci1', item: 'Medical' });
      const res = mockRes();
      await controller.addChecklistItem(mockReq({ params: { gateId: 'g1' }, body: { item: 'Medical' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('toggleChecklistItem', () => {
    it('should toggle item and audit', async () => {
      (svc.toggleChecklistItem as jest.Mock).mockResolvedValue({ id: 'ci1', isCompleted: true });
      const res = mockRes();
      await controller.toggleChecklistItem(mockReq({ params: { itemId: 'ci1' }, body: { isCompleted: true } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteChecklistItem', () => {
    it('should delete checklist item and audit', async () => {
      (svc.deleteChecklistItem as jest.Mock).mockResolvedValue({ id: 'ci1' });
      const res = mockRes();
      await controller.deleteChecklistItem(mockReq({ params: { itemId: 'ci1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
