/// <reference types="jest" />
jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));
jest.mock('../../../src/config/env', () => ({
  env: {
    db: { host: 'localhost', port: 5432, name: 'test', user: 'u', password: 'p' },
    redis: { url: 'redis://localhost:6379' },
  },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../src/modules/saff/saff.model', () => ({
  SaffTournament: { findAll: jest.fn(), findByPk: jest.fn(), upsert: jest.fn(), name: 'SaffTournament' },
  SaffStanding: { findAll: jest.fn(), name: 'SaffStanding' },
  SaffFixture: { findAll: jest.fn(), name: 'SaffFixture' },
  SaffTeamMap: { findAll: jest.fn(), findOne: jest.fn(), upsert: jest.fn(), name: 'SaffTeamMap' },
}));
jest.mock('../../../src/modules/saff/importSession.model', () => ({
  SaffImportSession: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn(), destroy: jest.fn(), name: 'SaffImportSession' },
}));
jest.mock('../../../src/modules/saff/importSession.service', () => ({
  createSession: jest.fn(),
  getSession: jest.fn(),
  listActiveSessionsForUser: jest.fn(),
  uploadStaging: jest.fn(),
  updateDecisions: jest.fn(),
  previewSession: jest.fn(),
  applySession: jest.fn(),
  abortSession: jest.fn(),
  reapExpiredSessions: jest.fn(),
}));
jest.mock('../../../src/modules/saff/saff.scheduler', () => ({
  getSyncStatus: jest.fn().mockReturnValue({}),
  runSync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/modules/saff/saff.scraper', () => ({
  scrapeChampionship: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../src/modules/saff/saff.service', () => ({
  getCurrentSeason: jest.fn().mockReturnValue('2024-2025'),
  seedTournaments: jest.fn(),
  syncTournamentsFromSaff: jest.fn(),
  listTournaments: jest.fn(),
  fetchFromSaff: jest.fn(),
  listStandings: jest.fn(),
  listFixtures: jest.fn(),
  listTeamMaps: jest.fn(),
  mapTeamToClub: jest.fn(),
  importToSadara: jest.fn(),
  fetchTeamLogos: jest.fn(),
  bulkFetchMenLeagues: jest.fn(),
  getStats: jest.fn(),
  getPlayerUpcomingMatches: jest.fn(),
  getPlayerCompetitionStats: jest.fn(),
  getWatchlistMatches: jest.fn(),
  projectFixturesToMatches: jest.fn(),
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));
jest.mock('../../../src/modules/queues/queues', () => ({
  enqueue: jest.fn().mockResolvedValue('mock-job-id'),
  getQueue: jest.fn().mockReturnValue({
    getJob: jest.fn().mockResolvedValue(null),
  }),
  QueueName: { SaffFetch: 'saff-fetch' },
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
      expect(res.status).toHaveBeenCalledWith(202);
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
