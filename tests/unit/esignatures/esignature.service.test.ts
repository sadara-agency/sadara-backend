/// <reference types="jest" />

// ── Mock database ──
const mockTransaction = {
  afterCommit: jest.fn((cb: () => Promise<void>) => cb()),
};
jest.mock('../../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn((cb: (t: any) => Promise<any>) => cb(mockTransaction)),
  },
}));

// ── Mock models ──
const mockSRCreate = jest.fn();
const mockSRFindByPk = jest.fn();
const mockSRFindAndCountAll = jest.fn();
const mockSRFindAll = jest.fn();
const mockSSCreate = jest.fn();
const mockSSFindByPk = jest.fn();
const mockSSFindAll = jest.fn();
const mockSSFindOne = jest.fn();
const mockSSCount = jest.fn();
const mockSSUpdate = jest.fn();
const mockSACreate = jest.fn();
const mockSAFindAll = jest.fn();

jest.mock('../../../src/modules/esignatures/esignature.model', () => ({
  SignatureRequest: {
    create: (...args: any[]) => mockSRCreate(...args),
    findByPk: (...args: any[]) => mockSRFindByPk(...args),
    findAndCountAll: (...args: any[]) => mockSRFindAndCountAll(...args),
    findAll: (...args: any[]) => mockSRFindAll(...args),
  },
  SignatureSigner: {
    create: (...args: any[]) => mockSSCreate(...args),
    findByPk: (...args: any[]) => mockSSFindByPk(...args),
    findAll: (...args: any[]) => mockSSFindAll(...args),
    findOne: (...args: any[]) => mockSSFindOne(...args),
    count: (...args: any[]) => mockSSCount(...args),
    update: (...args: any[]) => mockSSUpdate(...args),
  },
  SignatureAuditTrail: {
    create: (...args: any[]) => mockSACreate(...args),
    findAll: (...args: any[]) => mockSAFindAll(...args),
  },
}));

// ── Mock Document ──
const mockDocFindByPk = jest.fn();
jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: {
    findByPk: (...args: any[]) => mockDocFindByPk(...args),
  },
}));

// ── Mock User ──
const mockUserFindByPk = jest.fn();
jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findByPk: (...args: any[]) => mockUserFindByPk(...args),
  },
}));

// ── Mock notifications ──
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock mail ──
jest.mock('../../../src/shared/utils/mail', () => ({
  sendSignatureRequestEmail: jest.fn().mockResolvedValue(undefined),
  sendSignatureCompletedEmail: jest.fn().mockResolvedValue(undefined),
  sendSignatureDeclinedEmail: jest.fn().mockResolvedValue(undefined),
  sendSignatureReminderEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock env ──
jest.mock('../../../src/config/env', () => ({
  env: {
    frontend: { url: 'https://app.test' },
    jwt: { secret: 'test-secret' },
  },
}));

// ── Mock pagination ──
jest.mock('../../../src/shared/utils/pagination', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 20, offset: 0, page: 1 }),
  buildMeta: jest.fn().mockReturnValue({ total: 0, page: 1, totalPages: 1 }),
}));

// ── Mock middleware ──
jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(msg: string, code: number) {
      super(msg);
      this.statusCode = code;
    }
  },
}));

import * as svc from '../../../src/modules/esignatures/esignature.service';
import { mockModelInstance } from '../../setup/test-helpers';

describe('E-Signature Service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Helpers ──
  const mockDoc = { id: 'doc-1', name: 'Contract.pdf', fileUrl: '/uploads/contract.pdf', mimeType: 'application/pdf' };
  const mockUser = { id: 'user-1', fullName: 'Admin', fullNameAr: 'مدير', email: 'admin@test.com' };
  const mockRequest = (overrides = {}) =>
    mockModelInstance({
      id: 'req-1',
      documentId: 'doc-1',
      title: 'Sign NDA',
      status: 'Pending',
      signingOrder: 'sequential',
      createdBy: 'user-1',
      dueDate: null,
      ...overrides,
    });

  const mockSigner = (overrides = {}) =>
    mockModelInstance({
      id: 'signer-1',
      signatureRequestId: 'req-1',
      signerType: 'internal',
      userId: 'user-2',
      status: 'Active',
      stepOrder: 1,
      externalName: null,
      externalEmail: null,
      token: null,
      tokenExpiresAt: null,
      request: {
        id: 'req-1',
        status: 'Pending',
        signingOrder: 'sequential',
        createdBy: 'user-1',
        title: 'Sign NDA',
        document: mockDoc,
      },
      ...overrides,
    });

  // ══════════════════════════════════════════
  // createSignatureRequest
  // ══════════════════════════════════════════

  describe('createSignatureRequest', () => {
    const input = {
      documentId: 'doc-1',
      title: 'Sign NDA',
      signingOrder: 'sequential' as const,
      signers: [
        { signerType: 'internal' as const, userId: 'user-2', stepOrder: 1 },
      ],
    };

    it('should create request and signers', async () => {
      mockDocFindByPk.mockResolvedValue(mockDoc);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSRCreate.mockResolvedValue({ id: 'req-1' });
      mockSSCreate.mockResolvedValue({});
      mockSACreate.mockResolvedValue({});
      mockSSFindAll.mockResolvedValue([]);
      mockSRFindByPk.mockResolvedValue(mockRequest());

      const result = await svc.createSignatureRequest(input, 'user-1');
      expect(mockSRCreate).toHaveBeenCalled();
      expect(mockSSCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw 404 if document not found', async () => {
      mockDocFindByPk.mockResolvedValue(null);
      await expect(svc.createSignatureRequest(input, 'user-1')).rejects.toThrow('Document not found');
    });

    it('should throw 404 if user not found', async () => {
      mockDocFindByPk.mockResolvedValue(mockDoc);
      mockUserFindByPk.mockResolvedValue(null);
      await expect(svc.createSignatureRequest(input, 'user-1')).rejects.toThrow('User not found');
    });

    it('should set first signer as Active for sequential order', async () => {
      mockDocFindByPk.mockResolvedValue(mockDoc);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSRCreate.mockResolvedValue({ id: 'req-1' });
      mockSSCreate.mockResolvedValue({});
      mockSACreate.mockResolvedValue({});
      mockSSFindAll.mockResolvedValue([]);
      mockSRFindByPk.mockResolvedValue(mockRequest());

      await svc.createSignatureRequest(input, 'user-1');

      const createCall = mockSSCreate.mock.calls[0][0];
      expect(createCall.status).toBe('Active');
    });

    it('should set all signers Active for parallel order', async () => {
      mockDocFindByPk.mockResolvedValue(mockDoc);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSRCreate.mockResolvedValue({ id: 'req-1' });
      mockSSCreate.mockResolvedValue({});
      mockSACreate.mockResolvedValue({});
      mockSSFindAll.mockResolvedValue([]);
      mockSRFindByPk.mockResolvedValue(mockRequest());

      const parallelInput = {
        ...input,
        signingOrder: 'parallel',
        signers: [
          { signerType: 'internal' as const, userId: 'user-2', stepOrder: 1 },
          { signerType: 'internal' as const, userId: 'user-3', stepOrder: 2 },
        ],
      };

      await svc.createSignatureRequest(parallelInput as any, 'user-1');

      expect(mockSSCreate).toHaveBeenCalledTimes(2);
      expect(mockSSCreate.mock.calls[0][0].status).toBe('Active');
      expect(mockSSCreate.mock.calls[1][0].status).toBe('Active');
    });

    it('should generate token for external signers', async () => {
      mockDocFindByPk.mockResolvedValue(mockDoc);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSRCreate.mockResolvedValue({ id: 'req-1' });
      mockSSCreate.mockResolvedValue({});
      mockSACreate.mockResolvedValue({});
      mockSSFindAll.mockResolvedValue([]);
      mockSRFindByPk.mockResolvedValue(mockRequest());

      const extInput = {
        ...input,
        signers: [
          {
            signerType: 'external' as const,
            externalName: 'John',
            externalEmail: 'john@ext.com',
            stepOrder: 1,
          },
        ],
      };

      await svc.createSignatureRequest(extInput, 'user-1');

      const createCall = mockSSCreate.mock.calls[0][0];
      expect(createCall.token).toBeTruthy();
      expect(createCall.tokenExpiresAt).toBeInstanceOf(Date);
    });

    it('should log audit entry on creation', async () => {
      mockDocFindByPk.mockResolvedValue(mockDoc);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSRCreate.mockResolvedValue({ id: 'req-1' });
      mockSSCreate.mockResolvedValue({});
      mockSACreate.mockResolvedValue({});
      mockSSFindAll.mockResolvedValue([]);
      mockSRFindByPk.mockResolvedValue(mockRequest());

      await svc.createSignatureRequest(input, 'user-1');
      expect(mockSACreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'created', signatureRequestId: 'req-1' }),
      );
    });
  });

  // ══════════════════════════════════════════
  // cancelRequest
  // ══════════════════════════════════════════

  describe('cancelRequest', () => {
    it('should cancel a pending request', async () => {
      const req = mockRequest();
      mockSRFindByPk.mockResolvedValue(req);
      mockSSUpdate.mockResolvedValue([1]);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSACreate.mockResolvedValue({});

      const result = await svc.cancelRequest('req-1', 'user-1');
      expect(req.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Cancelled' }),
        expect.anything(),
      );
    });

    it('should throw 404 if request not found', async () => {
      mockSRFindByPk.mockResolvedValue(null);
      await expect(svc.cancelRequest('x', 'user-1')).rejects.toThrow('Signature request not found');
    });

    it('should throw 400 if not pending', async () => {
      mockSRFindByPk.mockResolvedValue(mockRequest({ status: 'Completed' }));
      await expect(svc.cancelRequest('req-1', 'user-1')).rejects.toThrow(
        'Only pending requests can be cancelled',
      );
    });

    it('should throw 403 if not the creator', async () => {
      mockSRFindByPk.mockResolvedValue(mockRequest({ createdBy: 'other-user' }));
      await expect(svc.cancelRequest('req-1', 'user-1')).rejects.toThrow(
        'Only the creator can cancel this request',
      );
    });

    it('should expire remaining signers', async () => {
      const req = mockRequest();
      mockSRFindByPk.mockResolvedValue(req);
      mockSSUpdate.mockResolvedValue([2]);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSACreate.mockResolvedValue({});

      await svc.cancelRequest('req-1', 'user-1');
      expect(mockSSUpdate).toHaveBeenCalledWith(
        { status: 'Expired' },
        expect.objectContaining({ where: expect.objectContaining({ signatureRequestId: 'req-1' }) }),
      );
    });
  });

  // ══════════════════════════════════════════
  // getRequestById
  // ══════════════════════════════════════════

  describe('getRequestById', () => {
    it('should return request with includes', async () => {
      mockSRFindByPk.mockResolvedValue(mockRequest());
      const result = await svc.getRequestById('req-1');
      expect(result).toBeDefined();
      expect(mockSRFindByPk).toHaveBeenCalledWith('req-1', expect.objectContaining({ include: expect.any(Array) }));
    });

    it('should throw 404 if not found', async () => {
      mockSRFindByPk.mockResolvedValue(null);
      await expect(svc.getRequestById('x')).rejects.toThrow('Signature request not found');
    });
  });

  // ══════════════════════════════════════════
  // getAuditTrail
  // ══════════════════════════════════════════

  describe('getAuditTrail', () => {
    it('should return audit entries ordered by createdAt', async () => {
      const entries = [{ id: 'a1', action: 'created' }, { id: 'a2', action: 'signed' }];
      mockSAFindAll.mockResolvedValue(entries);
      const result = await svc.getAuditTrail('req-1');
      expect(result).toEqual(entries);
      expect(mockSAFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { signatureRequestId: 'req-1' },
          order: [['createdAt', 'ASC']],
        }),
      );
    });
  });

  // ══════════════════════════════════════════
  // getMyPendingSignatures
  // ══════════════════════════════════════════

  describe('getMyPendingSignatures', () => {
    it('should return active signers for user', async () => {
      const signers = [{ id: 's1', status: 'Active' }];
      mockSSFindAll.mockResolvedValue(signers);
      const result = await svc.getMyPendingSignatures('user-2');
      expect(result).toEqual({ count: 1, items: signers });
    });

    it('should return empty when no pending', async () => {
      mockSSFindAll.mockResolvedValue([]);
      const result = await svc.getMyPendingSignatures('user-2');
      expect(result).toEqual({ count: 0, items: [] });
    });
  });

  // ══════════════════════════════════════════
  // listRequests
  // ══════════════════════════════════════════

  describe('listRequests', () => {
    it('should return paginated results for admin', async () => {
      mockSRFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const result = await svc.listRequests({} as any, 'user-1', 'Admin');
      expect(result.data).toEqual([]);
      expect(result.meta).toBeDefined();
    });

    it('should filter by signer access for non-admin users', async () => {
      mockSSFindAll.mockResolvedValue([{ signatureRequestId: 'req-1' }]);
      mockSRFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await svc.listRequests({} as any, 'user-2', 'Agent');
      expect(mockSSFindAll).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════
  // verifySigningToken
  // ══════════════════════════════════════════

  describe('verifySigningToken', () => {
    it('should throw 404 for invalid token', async () => {
      mockSSFindOne.mockResolvedValue(null);
      await expect(svc.verifySigningToken('bad-token')).rejects.toThrow('Invalid or expired signing link');
    });

    it('should throw 410 for expired token', async () => {
      const expired = mockSigner({
        tokenExpiresAt: new Date(Date.now() - 86400000),
        request: { id: 'req-1', status: 'Pending' },
      });
      mockSSFindOne.mockResolvedValue(expired);
      await expect(svc.verifySigningToken('some-token')).rejects.toThrow('expired');
    });

    it('should throw 400 if signer not active', async () => {
      const signed = mockSigner({
        status: 'Signed',
        tokenExpiresAt: new Date(Date.now() + 86400000),
        request: { id: 'req-1', status: 'Pending' },
      });
      mockSSFindOne.mockResolvedValue(signed);
      await expect(svc.verifySigningToken('some-token')).rejects.toThrow('no longer active');
    });

    it('should return signer and request for valid token', async () => {
      const signer = mockSigner({
        tokenExpiresAt: new Date(Date.now() + 86400000),
        request: { id: 'req-1', status: 'Pending' },
      });
      mockSSFindOne.mockResolvedValue(signer);
      mockSACreate.mockResolvedValue({});

      const result = await svc.verifySigningToken('valid-token');
      expect(result.signer).toBeDefined();
      expect(result.request).toBeDefined();
    });

    it('should log view audit entry', async () => {
      const signer = mockSigner({
        tokenExpiresAt: new Date(Date.now() + 86400000),
        request: { id: 'req-1', status: 'Pending' },
      });
      mockSSFindOne.mockResolvedValue(signer);
      mockSACreate.mockResolvedValue({});

      await svc.verifySigningToken('valid-token');
      expect(mockSACreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'viewed' }),
      );
    });
  });

  // ══════════════════════════════════════════
  // expireOverdueSignatureRequests
  // ══════════════════════════════════════════

  describe('expireOverdueSignatureRequests', () => {
    it('should expire overdue requests', async () => {
      const overdueReq = mockRequest({ dueDate: '2025-01-01' });
      mockSRFindAll.mockResolvedValue([overdueReq]);
      mockSSUpdate.mockResolvedValue([1]);
      mockSACreate.mockResolvedValue({});

      const result = await svc.expireOverdueSignatureRequests();
      expect(result.expiredCount).toBe(1);
      expect(overdueReq.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Expired' }),
        expect.anything(),
      );
    });

    it('should return 0 when no overdue requests', async () => {
      mockSRFindAll.mockResolvedValue([]);
      const result = await svc.expireOverdueSignatureRequests();
      expect(result.expiredCount).toBe(0);
    });

    it('should log expired audit entries', async () => {
      const overdueReq = mockRequest({ dueDate: '2025-01-01' });
      mockSRFindAll.mockResolvedValue([overdueReq]);
      mockSSUpdate.mockResolvedValue([1]);
      mockSACreate.mockResolvedValue({});

      await svc.expireOverdueSignatureRequests();
      expect(mockSACreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expired' }),
      );
    });
  });

  // ══════════════════════════════════════════
  // submitSignature
  // ══════════════════════════════════════════

  describe('submitSignature', () => {
    const input = { signatureData: 'data:image/png;base64,...', signingMethod: 'digital' as const };

    it('should throw 404 if signer not found', async () => {
      mockSSFindByPk.mockResolvedValue(null);
      await expect(svc.submitSignature('x', input, '1.2.3.4', 'ua')).rejects.toThrow('Signer not found');
    });

    it('should throw 400 if signer not active', async () => {
      mockSSFindByPk.mockResolvedValue(mockSigner({ status: 'Signed' }));
      await expect(svc.submitSignature('signer-1', input, '1.2.3.4', 'ua')).rejects.toThrow('not currently active');
    });

    it('should throw 400 if request not pending', async () => {
      const s = mockSigner();
      (s as any).request = { id: 'req-1', status: 'Cancelled', signingOrder: 'sequential', createdBy: 'user-1', title: 'Sign NDA', document: mockDoc };
      mockSSFindByPk.mockResolvedValue(s);
      await expect(svc.submitSignature('signer-1', input, '1.2.3.4', 'ua')).rejects.toThrow('not pending');
    });

    it('should update signer status to Signed', async () => {
      const signer = mockSigner();
      mockSSFindByPk.mockResolvedValue(signer);
      mockSSCount.mockResolvedValue(0);
      mockSRFindByPk.mockResolvedValue(null); // finalizeRequest early return
      mockSACreate.mockResolvedValue({});

      await svc.submitSignature('signer-1', input, '1.2.3.4', 'ua');
      expect(signer.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Signed', signatureData: input.signatureData }),
        expect.anything(),
      );
    });

    it('should log signed audit entry', async () => {
      const signer = mockSigner();
      mockSSFindByPk.mockResolvedValue(signer);
      mockSSCount.mockResolvedValue(0);
      mockSRFindByPk.mockResolvedValue(null);
      mockSACreate.mockResolvedValue({});

      await svc.submitSignature('signer-1', input, '1.2.3.4', 'ua');
      expect(mockSACreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'signed', signerId: 'signer-1' }),
      );
    });

    it('should activate next signer for sequential when remaining > 0', async () => {
      const signer = mockSigner();
      const nextSigner = mockSigner({ id: 'signer-2', status: 'Pending', stepOrder: 2, signerType: 'internal' });
      mockSSFindByPk.mockResolvedValue(signer);
      mockSSCount.mockResolvedValue(1); // 1 remaining
      mockSSFindOne.mockResolvedValue(nextSigner);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSSFindAll.mockResolvedValue([]); // sendSignerNotifications
      mockSACreate.mockResolvedValue({});

      await svc.submitSignature('signer-1', input, '1.2.3.4', 'ua');
      expect(nextSigner.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Active' }),
        expect.anything(),
      );
    });
  });

  // ══════════════════════════════════════════
  // declineSignature
  // ══════════════════════════════════════════

  describe('declineSignature', () => {
    it('should throw 404 if signer not found', async () => {
      mockSSFindByPk.mockResolvedValue(null);
      await expect(svc.declineSignature('x', 'reason', '1.2.3.4', 'ua')).rejects.toThrow('Signer not found');
    });

    it('should throw 400 if signer not active', async () => {
      mockSSFindByPk.mockResolvedValue(mockSigner({ status: 'Pending' }));
      await expect(svc.declineSignature('signer-1', 'reason', '1.2.3.4', 'ua')).rejects.toThrow(
        'not currently active',
      );
    });

    it('should decline signer and cancel request', async () => {
      const signer = mockSigner();
      const request = mockRequest();
      (signer as any).request = request;
      mockSSFindByPk.mockResolvedValue(signer);
      mockSSUpdate.mockResolvedValue([1]);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSACreate.mockResolvedValue({});

      await svc.declineSignature('signer-1', 'Not authorized', '1.2.3.4', 'ua');

      expect(signer.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Declined', declinedReason: 'Not authorized' }),
        expect.anything(),
      );
      expect(request.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Cancelled' }),
        expect.anything(),
      );
    });

    it('should expire remaining signers on decline', async () => {
      const signer = mockSigner();
      const request = mockRequest();
      (signer as any).request = request;
      mockSSFindByPk.mockResolvedValue(signer);
      mockSSUpdate.mockResolvedValue([1]);
      mockUserFindByPk.mockResolvedValue(mockUser);
      mockSACreate.mockResolvedValue({});

      await svc.declineSignature('signer-1', undefined, '1.2.3.4', 'ua');

      expect(mockSSUpdate).toHaveBeenCalledWith(
        { status: 'Expired' },
        expect.objectContaining({
          where: expect.objectContaining({ signatureRequestId: 'req-1' }),
        }),
      );
    });
  });
});
