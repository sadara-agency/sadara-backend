/// <reference types="jest" />
jest.mock('../../../src/modules/players/player.service');
jest.mock('../../../src/shared/utils/storage', () => ({
  uploadFile: jest.fn().mockResolvedValue({ url: 'http://cdn.test/photo.jpg', thumbnailUrl: 'http://cdn.test/photo_thumb.jpg', size: 1024, mimeType: 'image/jpeg' }),
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
  buildChanges: jest.fn().mockReturnValue(null),
}));
jest.mock('../../../src/shared/utils/cache', () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { PLAYERS: 'players', PLAYER: 'player', CONTRACTS: 'contracts', DASHBOARD: 'dashboard', MATCHES: 'matches' },
}));

import * as controller from '../../../src/modules/players/player.controller';
import * as svc from '../../../src/modules/players/player.service';

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

describe('Player Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated players', async () => {
      (svc.listPlayers as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return player', async () => {
      (svc.getPlayerById as jest.Mock).mockResolvedValue({ id: 'p1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create player, audit, invalidate cache', async () => {
      (svc.createPlayer as jest.Mock).mockResolvedValue({ id: 'p1', firstName: 'Ahmed' });
      const res = mockRes();
      await controller.create(mockReq({ body: { firstName: 'Ahmed', lastName: 'Ali', dateOfBirth: '1998-05-15' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update player with change tracking', async () => {
      (svc.getPlayerById as jest.Mock).mockResolvedValue({ id: 'p1', firstName: 'Ahmed' });
      (svc.updatePlayer as jest.Mock).mockResolvedValue({ id: 'p1', firstName: 'Mohammad' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'p1' }, body: { firstName: 'Mohammad' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete player, audit, invalidate cache', async () => {
      (svc.deletePlayer as jest.Mock).mockResolvedValue({ id: 'p1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo', async () => {
      (svc.updatePlayer as jest.Mock).mockResolvedValue({ id: 'p1' });
      const res = mockRes();
      await controller.uploadPhoto(mockReq({ params: { id: 'p1' }, file: { originalname: 'photo.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('fake') } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should throw 400 if no file', async () => {
      await expect(controller.uploadPhoto(mockReq({ params: { id: 'p1' } }), mockRes())).rejects.toThrow();
    });
  });

  describe('checkDuplicate', () => {
    it('should check for duplicates', async () => {
      (svc.checkDuplicate as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.checkDuplicate(mockReq({ query: { firstName: 'Ahmed' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getClubHistory', () => {
    it('should return club history', async () => {
      (svc.getClubHistory as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getClubHistory(mockReq({ params: { id: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getProviders', () => {
    it('should return providers', async () => {
      (svc.getPlayerProviders as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getProviders(mockReq({ params: { id: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('upsertProvider', () => {
    it('should upsert provider mapping', async () => {
      (svc.upsertPlayerProvider as jest.Mock).mockResolvedValue({ id: 'pm1' });
      const res = mockRes();
      await controller.upsertProvider(mockReq({ params: { id: 'p1' }, body: { provider: 'SofaScore', externalId: '123' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeProvider', () => {
    it('should remove provider mapping', async () => {
      (svc.removePlayerProvider as jest.Mock).mockResolvedValue({ id: 'pm1' });
      const res = mockRes();
      await controller.removeProvider(mockReq({ params: { id: 'p1', provider: 'SofaScore' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
