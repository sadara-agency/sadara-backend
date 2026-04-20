/// <reference types="jest" />
jest.mock('../../../src/modules/documents/document.service');
jest.mock('../../../src/shared/utils/storage', () => ({
  uploadFile: jest.fn().mockResolvedValue({ url: 'http://cdn.test/doc.pdf', size: 2048, mimeType: 'application/pdf' }),
  resolveFileUrl: jest.fn().mockImplementation((url) => Promise.resolve(url)),
  streamFileBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
  isPrivateKey: jest.fn().mockReturnValue(false),
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
  const res = { 
    status: jest.fn().mockReturnThis(), 
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    sendFile: jest.fn()
  };
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

  describe('preview', () => {
    it('should set correct headers for local file preview', async () => {
      (svc.getDocumentById as jest.Mock).mockResolvedValue({
        id: 'd1',
        fileUrl: '/uploads/documents/test.pdf',
        mimeType: 'application/pdf',
        name: 'test.pdf'
      });
      
      const res = mockRes();
      // Mock sendFile to avoid actual file system access
      res.sendFile = jest.fn();
      
      // Mock the path and fs imports inside the function
      // The controller does: path.resolve(url.slice(1)) where url starts with "/uploads/"
      // So we need to mock path.resolve to return the expected path
      const pathMock = { 
        resolve: (path: string) => {
          // Simulate path.resolve behavior for our test case
          if (path === 'uploads/documents/test.pdf') {
            return '/absolute/path/uploads/documents/test.pdf';
          }
          return path; // fallback
        }
      };
      jest.doMock('path', () => pathMock);
      
      const fsMock = { existsSync: () => true };
      jest.doMock('fs', () => fsMock);
      
      await controller.preview(mockReq({ params: { id: 'd1' } }), res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="test.pdf"');
      // Check that sendFile was called with the resolved path
      expect(res.sendFile).toHaveBeenCalledWith('/absolute/path/uploads/documents/test.pdf');
      
      // Cleanup mocks
      jest.unmock('path');
      jest.unmock('fs');
    });

    it('should handle missing file gracefully', async () => {
      (svc.getDocumentById as jest.Mock).mockResolvedValue({
        id: 'd1',
        fileUrl: '/uploads/documents/missing.pdf',
        mimeType: 'application/pdf',
        name: 'missing.pdf'
      });

      const res = mockRes();
      res.status = jest.fn().mockReturnThis();
      res.json = jest.fn().mockReturnThis();

      // Spy on the real cached fs instance so dynamic import() picks up the override
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const existsSpy = jest.spyOn(require('fs'), 'existsSync').mockReturnValueOnce(false);

      await expect(controller.preview(mockReq({ params: { id: 'd1' } }), res))
        .rejects.toThrow();

      existsSpy.mockRestore();
    });
  });
});
