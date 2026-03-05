/// <reference types="jest" />
jest.mock('../../../src/modules/notes/note.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/notes/note.controller';
import * as svc from '../../../src/modules/notes/note.service';

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

describe('Note Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated notes', async () => {
      (svc.listNotes as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create note and audit', async () => {
      (svc.createNote as jest.Mock).mockResolvedValue({ id: 'n1', content: 'Test' });
      const res = mockRes();
      await controller.create(mockReq({ body: { ownerType: 'Player', ownerId: 'p1', content: 'Test' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update note and audit', async () => {
      (svc.updateNote as jest.Mock).mockResolvedValue({ id: 'n1', content: 'Updated' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'n1' }, body: { content: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete note and audit', async () => {
      (svc.deleteNote as jest.Mock).mockResolvedValue({ id: 'n1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'n1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
