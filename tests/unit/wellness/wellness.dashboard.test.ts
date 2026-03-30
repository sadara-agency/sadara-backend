/// <reference types="jest" />
jest.mock('../../../src/modules/wellness/wellness.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Coach', userRole: 'Coach' }),
}));
jest.mock('../../../src/shared/utils/cache', () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: 'wellness', DASHBOARD: 'dash' },
}));

import * as controller from '../../../src/modules/wellness/wellness.controller';
import * as svc from '../../../src/modules/wellness/wellness.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Coach', role: 'Coach', playerId: 'player-001' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Wellness Dashboard Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('playerDashboard', () => {
    it('should return player dashboard data', async () => {
      const dashData = {
        today: {
          totalCalories: 2100,
          totalProteinG: 150,
          calorieAdherencePct: 85,
          proteinAdherencePct: 90,
          workoutCompleted: true,
          ringScore: 87,
        },
        history: [],
        profile: { targetCalories: 2500, targetProteinG: 170 },
      };
      (svc.getPlayerDashboard as jest.Mock).mockResolvedValue(dashData);
      const res = mockRes();
      await controller.playerDashboard(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getPlayerDashboard).toHaveBeenCalledWith('p1', 7);
    });
  });

  describe('coachOverview', () => {
    it('should return traffic light overview', async () => {
      const overview = {
        players: [
          { playerId: 'p1', firstName: 'Test', lastName: 'Player', status: 'green', avgRingScore: 85, lastRingScore: 90, missedWorkouts: 0, weightChange7d: 0.5 },
        ],
        summary: { green: 1, yellow: 0, red: 0, total: 1 },
      };
      (svc.getCoachOverview as jest.Mock).mockResolvedValue(overview);
      const res = mockRes();
      await controller.coachOverview(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getCoachOverview).toHaveBeenCalled();
    });
  });

  describe('myDashboard', () => {
    it('should return own dashboard', async () => {
      const dashData = {
        today: { totalCalories: 1800, totalProteinG: 130, calorieAdherencePct: 72, proteinAdherencePct: 76, workoutCompleted: false, ringScore: 45 },
        history: [],
        profile: { targetCalories: 2500, targetProteinG: 170 },
      };
      (svc.getPlayerDashboard as jest.Mock).mockResolvedValue(dashData);
      const res = mockRes();
      await controller.myDashboard(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getPlayerDashboard).toHaveBeenCalledWith('player-001', 7);
    });

    it('should handle missing playerId', async () => {
      const res = mockRes();
      await controller.myDashboard(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
