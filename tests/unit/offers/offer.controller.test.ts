/// <reference types="jest" />
jest.mock('../../../src/modules/offers/offer.service');
jest.mock('../../../src/modules/approvals/approval.service', () => ({
  createApprovalRequest: jest.fn().mockResolvedValue({}),
  resolveApprovalByEntity: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/offers/offer.controller';
import * as svc from '../../../src/modules/offers/offer.service';

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

describe('Offer Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated offers', async () => {
      (svc.listOffers as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return offer', async () => {
      (svc.getOfferById as jest.Mock).mockResolvedValue({ id: 'o1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'o1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getByPlayer', () => {
    it('should return player offers', async () => {
      (svc.getOffersByPlayer as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getByPlayer(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create offer and audit', async () => {
      (svc.createOffer as jest.Mock).mockResolvedValue({ id: 'o1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update offer and audit', async () => {
      (svc.updateOffer as jest.Mock).mockResolvedValue({ id: 'o1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'o1' }, body: { transferFee: 5000000 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateStatus', () => {
    it('should update status and audit', async () => {
      (svc.updateOfferStatus as jest.Mock).mockResolvedValue({ id: 'o1', status: 'Under Review' });
      const res = mockRes();
      await controller.updateStatus(mockReq({ params: { id: 'o1' }, body: { status: 'Under Review' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete offer and audit', async () => {
      (svc.deleteOffer as jest.Mock).mockResolvedValue({ id: 'o1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'o1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('convertToContract', () => {
    it('should convert offer to contract and audit', async () => {
      (svc.convertOfferToContract as jest.Mock).mockResolvedValue({ contract: { id: 'c1' } });
      const res = mockRes();
      await controller.convertToContract(mockReq({ params: { id: 'o1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
