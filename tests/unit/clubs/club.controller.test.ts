/// <reference types="jest" />
jest.mock('../../../src/modules/clubs/club.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
  buildChanges: jest.fn().mockReturnValue(null),
}));

import * as controller from '../../../src/modules/clubs/club.controller';
import * as clubService from '../../../src/modules/clubs/club.service';

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

describe('Club Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated clubs', async () => {
      (clubService.listClubs as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return club', async () => {
      (clubService.getClubById as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Al-Hilal' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create club and audit', async () => {
      (clubService.createClub as jest.Mock).mockResolvedValue({ id: 'c1', name: 'New Club' });
      const res = mockRes();
      await controller.create(mockReq({ body: { name: 'New Club' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update club and audit', async () => {
      (clubService.updateClub as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Updated' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'c1' }, body: { name: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete club and audit', async () => {
      (clubService.deleteClub as jest.Mock).mockResolvedValue({ id: 'c1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('bulkRemove', () => {
    it('should bulk delete clubs', async () => {
      (clubService.deleteClubs as jest.Mock).mockResolvedValue({ count: 2 });
      const res = mockRes();
      await controller.bulkRemove(mockReq({ body: { ids: ['c1', 'c2'] } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw 400 for empty ids', async () => {
      await expect(controller.bulkRemove(mockReq({ body: { ids: [] } }), mockRes())).rejects.toThrow();
    });

    it('should throw 400 for > 100 ids', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `c${i}`);
      await expect(controller.bulkRemove(mockReq({ body: { ids } }), mockRes())).rejects.toThrow();
    });
  });

  describe('uploadLogo', () => {
    it('should upload logo', async () => {
      (clubService.updateClubLogo as jest.Mock).mockResolvedValue({ id: 'c1' });
      const res = mockRes();
      await controller.uploadLogo(mockReq({ params: { id: 'c1' }, file: { filename: 'logo.png' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw 400 if no file', async () => {
      await expect(controller.uploadLogo(mockReq({ params: { id: 'c1' } }), mockRes())).rejects.toThrow();
    });
  });

  describe('createContact', () => {
    it('should create contact and audit', async () => {
      (clubService.createContact as jest.Mock).mockResolvedValue({ id: 'ct1', name: 'John' });
      const res = mockRes();
      await controller.createContact(mockReq({ params: { id: 'c1' }, body: { name: 'John', role: 'Agent' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateContact', () => {
    it('should update contact and audit', async () => {
      (clubService.updateContact as jest.Mock).mockResolvedValue({ id: 'ct1', name: 'Updated' });
      const res = mockRes();
      await controller.updateContact(mockReq({ params: { id: 'c1', contactId: 'ct1' }, body: { name: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteContact', () => {
    it('should delete contact and audit', async () => {
      (clubService.deleteContact as jest.Mock).mockResolvedValue({ id: 'ct1' });
      const res = mockRes();
      await controller.deleteContact(mockReq({ params: { id: 'c1', contactId: 'ct1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
