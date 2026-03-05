/// <reference types="jest" />
jest.mock('../../../src/modules/spl/spl.sync');
jest.mock('../../../src/modules/spl/spl.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/spl/spl.controller';
import * as splSync from '../../../src/modules/spl/spl.sync';
import * as splService from '../../../src/modules/spl/spl.service';

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

describe('SPL Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('syncPlayer', () => {
    it('should sync player and audit', async () => {
      (splSync.syncPlayer as jest.Mock).mockResolvedValue({ player: { id: 'p1' } });
      const res = mockRes();
      await controller.syncPlayer(mockReq({ body: { splPlayerId: '12345' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('syncTeam', () => {
    it('should sync team and audit', async () => {
      (splSync.syncTeam as jest.Mock).mockResolvedValue({ club: { id: 'c1' }, players: 25 });
      const res = mockRes();
      await controller.syncTeam(mockReq({ body: { splTeamId: '42' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('seedClubIds', () => {
    it('should seed club IDs and audit', async () => {
      (splService.seedClubExternalIds as jest.Mock).mockResolvedValue({ seeded: 18 });
      const res = mockRes();
      await controller.seedClubIds(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getRegistry', () => {
    it('should return club registry', async () => {
      const res = mockRes();
      await controller.getRegistry(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStatus', () => {
    it('should return sync state', async () => {
      (splService.getSyncState as jest.Mock).mockResolvedValue({ lastSync: null });
      const res = mockRes();
      await controller.getStatus(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
