/// <reference types="jest" />
jest.mock('../../../src/modules/saff/saff.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/saff/saff.controller';
import * as svc from '../../../src/modules/saff/saff.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin', email: 'admin@test.com' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('SAFF Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listTournaments', () => {
    it('should return paginated tournaments', async () => {
      (svc.listTournaments as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50 } });
      const res = mockRes();
      await controller.listTournaments(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('seedTournaments', () => {
    it('should seed tournaments and audit', async () => {
      (svc.seedTournaments as jest.Mock).mockResolvedValue({ count: 10 });
      const res = mockRes();
      await controller.seedTournaments(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('fetchFromSaff', () => {
    it('should fetch data and audit', async () => {
      (svc.fetchFromSaff as jest.Mock).mockResolvedValue({ fetched: 5 });
      const res = mockRes();
      await controller.fetchFromSaff(mockReq({ body: { tournamentIds: [1], season: '2024-2025' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listStandings', () => {
    it('should return paginated standings', async () => {
      (svc.listStandings as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listStandings(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listFixtures', () => {
    it('should return paginated fixtures', async () => {
      (svc.listFixtures as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listFixtures(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listTeamMaps', () => {
    it('should return team maps', async () => {
      (svc.listTeamMaps as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50 } });
      const res = mockRes();
      await controller.listTeamMaps(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('mapTeam', () => {
    it('should map team and audit', async () => {
      (svc.mapTeamToClub as jest.Mock).mockResolvedValue({ id: 'tm1' });
      const res = mockRes();
      await controller.mapTeam(mockReq({ body: { saffTeamId: 42, season: '2024-2025', clubId: 'c1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStats', () => {
    it('should return stats', async () => {
      (svc.getStats as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.getStats(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
