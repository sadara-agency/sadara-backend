/// <reference types="jest" />
jest.mock('../../../src/modules/esignatures/esignature.service');

import * as controller from '../../../src/modules/esignatures/esignature.controller';
import * as svc from '../../../src/modules/esignatures/esignature.service';

const mockReq = (overrides = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest', 'x-forwarded-for': '10.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  }) as any;

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as any;
};

describe('E-Signature Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create signature request and return 201', async () => {
      (svc.createSignatureRequest as jest.Mock).mockResolvedValue({ id: 'req-1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { title: 'Test' } }), res);
      expect(svc.createSignatureRequest).toHaveBeenCalledWith({ title: 'Test' }, 'user-001');
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('list', () => {
    it('should list requests with pagination', async () => {
      (svc.listRequests as jest.Mock).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, totalPages: 1 },
      });
      const res = mockRes();
      await controller.list(mockReq({ query: { page: 1 } }), res);
      expect(svc.listRequests).toHaveBeenCalledWith({ page: 1 }, 'user-001', 'Admin');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return request by id', async () => {
      (svc.getRequestById as jest.Mock).mockResolvedValue({ id: 'req-1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'req-1' } }), res);
      expect(svc.getRequestById).toHaveBeenCalledWith('req-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancel', () => {
    it('should cancel request', async () => {
      (svc.cancelRequest as jest.Mock).mockResolvedValue({ id: 'req-1', status: 'Cancelled' });
      const res = mockRes();
      await controller.cancel(mockReq({ params: { id: 'req-1' } }), res);
      expect(svc.cancelRequest).toHaveBeenCalledWith('req-1', 'user-001');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('submitAuth', () => {
    it('should submit signature with IP and user agent', async () => {
      (svc.submitSignature as jest.Mock).mockResolvedValue({ status: 'Signed' });
      const res = mockRes();
      await controller.submitAuth(
        mockReq({
          params: { signerId: 'signer-1' },
          body: { signatureData: 'data', signingMethod: 'digital' },
        }),
        res,
      );
      expect(svc.submitSignature).toHaveBeenCalledWith(
        'signer-1',
        { signatureData: 'data', signingMethod: 'digital' },
        '10.0.0.1',
        'jest',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('declineAuth', () => {
    it('should decline signature with reason', async () => {
      (svc.declineSignature as jest.Mock).mockResolvedValue({ status: 'Declined' });
      const res = mockRes();
      await controller.declineAuth(
        mockReq({
          params: { signerId: 'signer-1' },
          body: { reason: 'Not authorized' },
        }),
        res,
      );
      expect(svc.declineSignature).toHaveBeenCalledWith(
        'signer-1',
        'Not authorized',
        '10.0.0.1',
        'jest',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remind', () => {
    it('should remind signer', async () => {
      (svc.remindSigner as jest.Mock).mockResolvedValue({ sent: true });
      const res = mockRes();
      await controller.remind(mockReq({ params: { signerId: 'signer-1' } }), res);
      expect(svc.remindSigner).toHaveBeenCalledWith('signer-1', 'user-001');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail', async () => {
      (svc.getAuditTrail as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getAuditTrail(mockReq({ params: { id: 'req-1' } }), res);
      expect(svc.getAuditTrail).toHaveBeenCalledWith('req-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyPending', () => {
    it('should return pending signatures for user', async () => {
      (svc.getMyPendingSignatures as jest.Mock).mockResolvedValue({ count: 0, items: [] });
      const res = mockRes();
      await controller.getMyPending(mockReq(), res);
      expect(svc.getMyPendingSignatures).toHaveBeenCalledWith('user-001');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('viewByToken', () => {
    it('should verify token and return signer + request', async () => {
      (svc.verifySigningToken as jest.Mock).mockResolvedValue({
        signer: { id: 's1' },
        request: { id: 'r1' },
      });
      const res = mockRes();
      await controller.viewByToken(mockReq({ params: { token: 'abc123' } }) as any, res);
      expect(svc.verifySigningToken).toHaveBeenCalledWith('abc123');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('submitByToken', () => {
    it('should verify token and submit signature', async () => {
      (svc.verifySigningToken as jest.Mock).mockResolvedValue({
        signer: { id: 'signer-1' },
        request: { id: 'r1' },
      });
      (svc.submitSignature as jest.Mock).mockResolvedValue({ status: 'Signed' });
      const res = mockRes();
      await controller.submitByToken(
        mockReq({
          params: { token: 'abc123' },
          body: { signatureData: 'data', signingMethod: 'digital' },
        }) as any,
        res,
      );
      expect(svc.verifySigningToken).toHaveBeenCalledWith('abc123');
      expect(svc.submitSignature).toHaveBeenCalledWith(
        'signer-1',
        { signatureData: 'data', signingMethod: 'digital' },
        '10.0.0.1',
        'jest',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('declineByToken', () => {
    it('should verify token and decline signature', async () => {
      (svc.verifySigningToken as jest.Mock).mockResolvedValue({
        signer: { id: 'signer-1' },
        request: { id: 'r1' },
      });
      (svc.declineSignature as jest.Mock).mockResolvedValue({ status: 'Declined' });
      const res = mockRes();
      await controller.declineByToken(
        mockReq({
          params: { token: 'abc123' },
          body: { reason: 'Cannot sign' },
        }) as any,
        res,
      );
      expect(svc.verifySigningToken).toHaveBeenCalledWith('abc123');
      expect(svc.declineSignature).toHaveBeenCalledWith(
        'signer-1',
        'Cannot sign',
        '10.0.0.1',
        'jest',
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
