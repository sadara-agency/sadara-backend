/// <reference types="jest" />
jest.mock('../../../src/modules/matches/match.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
  buildChanges: jest.fn().mockReturnValue(null),
}));

import * as controller from '../../../src/modules/matches/match.controller';
import * as svc from '../../../src/modules/matches/match.service';

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

describe('Match Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return paginated matches', async () => {
      (svc.listMatches as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getById', () => {
    it('should return match', async () => {
      (svc.getMatchById as jest.Mock).mockResolvedValue({ id: 'm1' });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: 'm1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('upcoming', () => {
    it('should return upcoming matches', async () => {
      (svc.getUpcomingMatches as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.upcoming(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create match and audit', async () => {
      (svc.createMatch as jest.Mock).mockResolvedValue({ id: 'm1' });
      const res = mockRes();
      await controller.create(mockReq({ body: { matchDate: '2025-06-15' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('update', () => {
    it('should update match and audit', async () => {
      (svc.updateMatch as jest.Mock).mockResolvedValue({ id: 'm1' });
      const res = mockRes();
      await controller.update(mockReq({ params: { id: 'm1' }, body: { venue: 'Stadium' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateScore', () => {
    it('should update score and audit', async () => {
      (svc.updateScore as jest.Mock).mockResolvedValue({ id: 'm1' });
      const res = mockRes();
      await controller.updateScore(mockReq({ params: { id: 'm1' }, body: { homeScore: 2, awayScore: 1 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateStatus', () => {
    it('should update status and audit', async () => {
      (svc.updateMatchStatus as jest.Mock).mockResolvedValue({ id: 'm1', status: 'completed' });
      const res = mockRes();
      await controller.updateStatus(mockReq({ params: { id: 'm1' }, body: { status: 'completed' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should delete match and audit', async () => {
      (svc.deleteMatch as jest.Mock).mockResolvedValue({ id: 'm1' });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: 'm1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('calendar', () => {
    it('should return calendar', async () => {
      (svc.getCalendar as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.calendar(mockReq({ query: { from: '2025-01-01', to: '2025-12-31' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPlayers', () => {
    it('should return match players', async () => {
      (svc.getMatchPlayers as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getPlayers(mockReq({ params: { id: 'm1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('assignPlayers', () => {
    it('should assign players and audit', async () => {
      (svc.assignPlayers as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.assignPlayers(mockReq({ params: { id: 'm1' }, body: { players: [{ playerId: 'p1' }] } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updatePlayer', () => {
    it('should update player assignment', async () => {
      (svc.updateMatchPlayer as jest.Mock).mockResolvedValue({ playerId: 'p1' });
      const res = mockRes();
      await controller.updatePlayer(mockReq({ params: { id: 'm1', playerId: 'p1' }, body: { minutesPlayed: 90 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removePlayer', () => {
    it('should remove player from match', async () => {
      (svc.removePlayerFromMatch as jest.Mock).mockResolvedValue({ id: 'p1' });
      const res = mockRes();
      await controller.removePlayer(mockReq({ params: { id: 'm1', playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStats', () => {
    it('should return match stats', async () => {
      (svc.getMatchStats as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getStats(mockReq({ params: { id: 'm1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('upsertStats', () => {
    it('should upsert stats and audit', async () => {
      (svc.upsertStats as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.upsertStats(mockReq({ params: { id: 'm1' }, body: { stats: [{ playerId: 'p1', goals: 1 }] } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('playerMatches', () => {
    it('should return player matches', async () => {
      (svc.getPlayerMatches as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.playerMatches(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('playerAggregateStats', () => {
    it('should return aggregate stats', async () => {
      (svc.getPlayerAggregateStats as jest.Mock).mockResolvedValue({});
      const res = mockRes();
      await controller.playerAggregateStats(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listAnalyses', () => {
    it('should return match analyses', async () => {
      (svc.getMatchAnalyses as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.listAnalyses(mockReq({ params: { id: 'm1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createAnalysis', () => {
    it('should create analysis and audit', async () => {
      (svc.createMatchAnalysis as jest.Mock).mockResolvedValue({ id: 'a1', type: 'pre-match', title: 'Test' });
      const res = mockRes();
      await controller.createAnalysis(mockReq({ params: { id: 'm1' }, body: { type: 'pre-match', title: 'Test', content: 'Content' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('removeAnalysis', () => {
    it('should delete analysis and audit', async () => {
      (svc.deleteMatchAnalysis as jest.Mock).mockResolvedValue({ id: 'a1' });
      const res = mockRes();
      await controller.removeAnalysis(mockReq({ params: { id: 'm1', analysisId: 'a1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
