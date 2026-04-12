/// <reference types="jest" />
jest.mock('../../../src/modules/wellness/wellness.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Coach', userRole: 'GymCoach' }),
}));
jest.mock('../../../src/shared/utils/cache', () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: 'wellness', DASHBOARD: 'dash' },
}));

import * as controller from '../../../src/modules/wellness/wellness.controller';
import * as svc from '../../../src/modules/wellness/wellness.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Coach', role: 'GymCoach', playerId: 'player-001' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Wellness Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ══════════════════════════════════════════
  // PROFILES
  // ══════════════════════════════════════════

  describe('getProfile', () => {
    it('should return profile', async () => {
      (svc.getProfile as jest.Mock).mockResolvedValue({ id: 'wp1', playerId: 'p1' });
      const res = mockRes();
      await controller.getProfile(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getProfile).toHaveBeenCalledWith('p1', expect.anything());
    });
  });

  describe('createProfile', () => {
    it('should create profile and return 201', async () => {
      (svc.createProfile as jest.Mock).mockResolvedValue({ id: 'wp1', playerId: 'p1' });
      const res = mockRes();
      await controller.createProfile(
        mockReq({ body: { playerId: 'p1', sex: 'male' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateProfile', () => {
    it('should update profile', async () => {
      (svc.updateProfile as jest.Mock).mockResolvedValue({ id: 'wp1', goal: 'cut' });
      const res = mockRes();
      await controller.updateProfile(
        mockReq({ params: { playerId: 'p1' }, body: { goal: 'cut' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('computeMacros', () => {
    it('should return computed macros', async () => {
      (svc.computeMacros as jest.Mock).mockResolvedValue({
        bmr: 1800, tdee: 2790, macros: { calories: 2790, proteinG: 160, fatG: 70, carbsG: 300 },
        bmi: 24.7, inputs: {},
      });
      const res = mockRes();
      await controller.computeMacros(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('recalculateTargets', () => {
    it('should recalculate and return result', async () => {
      (svc.recalculateTargets as jest.Mock).mockResolvedValue({
        profile: { id: 'wp1' },
        computed: { bmr: 1800 },
      });
      const res = mockRes();
      await controller.recalculateTargets(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ══════════════════════════════════════════
  // WEIGHT LOGS
  // ══════════════════════════════════════════

  describe('listWeightLogs', () => {
    it('should return paginated weight logs', async () => {
      (svc.listWeightLogs as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.listWeightLogs(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createWeightLog', () => {
    it('should create weight log', async () => {
      (svc.createWeightLog as jest.Mock).mockResolvedValue({ id: 'wl1', weightKg: 75 });
      const res = mockRes();
      await controller.createWeightLog(
        mockReq({ body: { playerId: 'p1', weightKg: 75, loggedAt: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getWeightTrend', () => {
    it('should return weight trend', async () => {
      (svc.getWeightTrend as jest.Mock).mockResolvedValue({
        logs: [], currentBmi: 24.7, weightChange4Weeks: -1.2, latestWeight: 75,
      });
      const res = mockRes();
      await controller.getWeightTrend(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ══════════════════════════════════════════
  // PLAYER SELF-SERVICE
  // ══════════════════════════════════════════

  describe('myWeightLogs', () => {
    it('should return player weight logs', async () => {
      (svc.listWeightLogs as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.myWeightLogs(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listWeightLogs).toHaveBeenCalledWith('player-001', {});
    });

    it('should handle missing playerId', async () => {
      const res = mockRes();
      await controller.myWeightLogs(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createMyWeightLog', () => {
    it('should create with player ID from auth', async () => {
      (svc.createWeightLog as jest.Mock).mockResolvedValue({ id: 'wl1' });
      const res = mockRes();
      await controller.createMyWeightLog(
        mockReq({ body: { weightKg: 75, loggedAt: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.createWeightLog).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001' }),
      );
    });

    it('should return 403 if no playerId', async () => {
      const res = mockRes();
      await controller.createMyWeightLog(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('myProfile', () => {
    it('should return profile for linked player', async () => {
      (svc.getProfile as jest.Mock).mockResolvedValue({ id: 'wp1' });
      const res = mockRes();
      await controller.myProfile(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getProfile).toHaveBeenCalledWith('player-001');
    });

    it('should handle missing playerId', async () => {
      const res = mockRes();
      await controller.myProfile(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('myMacros', () => {
    it('should return macros for linked player', async () => {
      (svc.computeMacros as jest.Mock).mockResolvedValue({ bmr: 1800 });
      const res = mockRes();
      await controller.myMacros(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ══════════════════════════════════════════
  // FOOD SEARCH
  // ══════════════════════════════════════════

  describe('searchFoods', () => {
    it('should return food results', async () => {
      (svc.searchFoods as jest.Mock).mockResolvedValue([{ name: 'Apple' }]);
      const res = mockRes();
      await controller.searchFoods(mockReq({ query: { q: 'apple' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.searchFoods).toHaveBeenCalledWith('apple');
    });
  });

  describe('createFoodItem', () => {
    it('should create custom food item', async () => {
      (svc.createFoodItem as jest.Mock).mockResolvedValue({ id: 'f1', name: 'Custom' });
      const res = mockRes();
      await controller.createFoodItem(
        mockReq({ body: { name: 'Custom', calories: 100, proteinG: 10, carbsG: 10, fatG: 5 } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ══════════════════════════════════════════
  // MEAL LOGS
  // ══════════════════════════════════════════

  describe('listMealLogs', () => {
    it('should return meal logs for player', async () => {
      (svc.listMealLogs as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.listMealLogs(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createMealLog', () => {
    it('should create meal log', async () => {
      (svc.createMealLog as jest.Mock).mockResolvedValue({ id: 'ml1' });
      const res = mockRes();
      await controller.createMealLog(
        mockReq({ body: { playerId: 'p1', mealType: 'lunch', calories: 500, proteinG: 30, carbsG: 50, fatG: 15, loggedDate: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateMealLog', () => {
    it('should update meal log', async () => {
      (svc.updateMealLog as jest.Mock).mockResolvedValue({ id: 'ml1', calories: 600 });
      const res = mockRes();
      await controller.updateMealLog(
        mockReq({ params: { id: 'ml1' }, body: { calories: 600 } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteMealLog', () => {
    it('should delete meal log', async () => {
      (svc.deleteMealLog as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.deleteMealLog(mockReq({ params: { id: 'ml1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getDailyTotals', () => {
    it('should return daily totals', async () => {
      (svc.getDailyTotals as jest.Mock).mockResolvedValue({
        date: '2026-03-23', totalCalories: 2000, meals: [],
      });
      const res = mockRes();
      await controller.getDailyTotals(
        mockReq({ params: { playerId: 'p1' }, query: { date: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('copyDay', () => {
    it('should copy day meals', async () => {
      (svc.copyDay as jest.Mock).mockResolvedValue([{ id: 'ml2' }]);
      const res = mockRes();
      await controller.copyDay(
        mockReq({ body: { playerId: 'p1', fromDate: '2026-03-22', toDate: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ══════════════════════════════════════════
  // PLAYER MEAL SELF-SERVICE
  // ══════════════════════════════════════════

  describe('myMealLogs', () => {
    it('should return player meal logs', async () => {
      (svc.listMealLogs as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.myMealLogs(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listMealLogs).toHaveBeenCalledWith('player-001', {});
    });
  });

  describe('createMyMealLog', () => {
    it('should create meal with player ID from auth', async () => {
      (svc.createMealLog as jest.Mock).mockResolvedValue({ id: 'ml1' });
      const res = mockRes();
      await controller.createMyMealLog(
        mockReq({ body: { mealType: 'lunch', calories: 500, proteinG: 30, carbsG: 50, fatG: 15, loggedDate: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.createMealLog).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001' }),
      );
    });

    it('should return 403 if no playerId', async () => {
      const res = mockRes();
      await controller.createMyMealLog(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('myDailyTotals', () => {
    it('should return daily totals for player', async () => {
      (svc.getDailyTotals as jest.Mock).mockResolvedValue({
        date: '2026-03-23', totalCalories: 1800, meals: [],
      });
      const res = mockRes();
      await controller.myDailyTotals(
        mockReq({ query: { date: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle missing playerId', async () => {
      const res = mockRes();
      await controller.myDailyTotals(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
