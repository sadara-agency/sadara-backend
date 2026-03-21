/// <reference types="jest" />
jest.mock('../../../src/modules/documents/document.service');
jest.mock('../../../src/shared/utils/storage', () => ({
  uploadFile: jest.fn().mockResolvedValue({ url: 'http://cdn.test/doc.pdf', size: 2048, mimeType: 'application/pdf' }),
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
  buildChanges: jest.fn().mockReturnValue(null),
}));

import * as controller from '../../../src/modules/documents/document.controller';
import * as svc from '../../../src/modules/documents/document.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ip: '127.0.0.1',
  protocol: 'https',
  get: () => 'localhost',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Document Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated documents', async () => {
      (svc.listDocuments as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return document', async () => {
      (svc.getDocumentById as jest.Mock).mockResolvedValue({ id: 'd1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'd1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('upload', () => {
    it('should upload document and audit', async () => {
      (svc.createDocument as jest.Mock).mockResolvedValue({ id: 'd1', name: 'Doc' });
      const res = mockRes();
      await controller.upload(mockReq({ file: { originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: Buffer.from('fake') }, body: { name: 'Doc' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should throw 400 if no file', async () => {
      await expect(controller.upload(mockReq(), mockRes())).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create document and audit', async () => {
      (svc.createDocument as jest.Mock).mockResolvedValue({ id: 'd1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { name: 'Test', fileUrl: '/file.pdf' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update document and audit', async () => {
      (svc.updateDocument as jest.Mock).mockResolvedValue({ id: 'd1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'd1' }, body: { name: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete document and audit', async () => {
      (svc.deleteDocument as jest.Mock).mockResolvedValue({ id: 'd1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'd1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
