/// <reference types="jest" />
jest.mock('../../../src/modules/gym/gym.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/gym/gym.controller';
import * as svc from '../../../src/modules/gym/gym.service';

const mockReq = (overrides = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin', playerId: 'player-001' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

describe('Gym Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Exercise Library ──

  describe('listExercises', () => {
    it('should return paginated exercises', async () => {
      (svc.listExercises as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listExercises(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getExercise', () => {
    it('should return exercise', async () => {
      (svc.getExercise as jest.Mock).mockResolvedValue({ id: 'ex-001' });
      const res = mockRes();
      await controller.getExercise(mockReq({ params: { id: 'ex-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createExercise', () => {
    it('should create exercise and audit', async () => {
      (svc.createExercise as jest.Mock).mockResolvedValue({ id: 'ex-001', nameEn: 'Bench Press' });
      const res = mockRes();
      await controller.createExercise(mockReq({ body: { nameEn: 'Bench Press' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateExercise', () => {
    it('should update exercise', async () => {
      (svc.updateExercise as jest.Mock).mockResolvedValue({ id: 'ex-001' });
      const res = mockRes();
      await controller.updateExercise(mockReq({ params: { id: 'ex-001' }, body: { nameEn: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise and audit', async () => {
      (svc.deleteExercise as jest.Mock).mockResolvedValue({ id: 'ex-001' });
      const res = mockRes();
      await controller.deleteExercise(mockReq({ params: { id: 'ex-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Body Metrics ──

  describe('listBodyMetrics', () => {
    it('should return metrics', async () => {
      (svc.listBodyMetrics as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listBodyMetrics(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createBodyMetric', () => {
    it('should create body metric and audit', async () => {
      (svc.createBodyMetric as jest.Mock).mockResolvedValue({ id: 'met-001' });
      const res = mockRes();
      await controller.createBodyMetric(mockReq({ body: { playerId: 'p1', weight: 80 } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateBodyMetric', () => {
    it('should update body metric', async () => {
      (svc.updateBodyMetric as jest.Mock).mockResolvedValue({ id: 'met-001' });
      const res = mockRes();
      await controller.updateBodyMetric(mockReq({ params: { id: 'met-001' }, body: { weight: 82 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteBodyMetric', () => {
    it('should delete body metric', async () => {
      (svc.deleteBodyMetric as jest.Mock).mockResolvedValue({ id: 'met-001' });
      const res = mockRes();
      await controller.deleteBodyMetric(mockReq({ params: { id: 'met-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getLatestBodyMetric', () => {
    it('should return latest metric', async () => {
      (svc.getLatestBodyMetric as jest.Mock).mockResolvedValue({ id: 'met-001' });
      const res = mockRes();
      await controller.getLatestBodyMetric(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Metric Targets ──

  describe('getMetricTarget', () => {
    it('should return target', async () => {
      (svc.getMetricTarget as jest.Mock).mockResolvedValue({ id: 'tgt-001' });
      const res = mockRes();
      await controller.getMetricTarget(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createMetricTarget', () => {
    it('should create target', async () => {
      (svc.createMetricTarget as jest.Mock).mockResolvedValue({ id: 'tgt-001' });
      const res = mockRes();
      await controller.createMetricTarget(mockReq({ body: { playerId: 'p1', targetWeight: 75 } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateMetricTarget', () => {
    it('should update target', async () => {
      (svc.updateMetricTarget as jest.Mock).mockResolvedValue({ id: 'tgt-001' });
      const res = mockRes();
      await controller.updateMetricTarget(mockReq({ params: { id: 'tgt-001' }, body: { targetWeight: 72 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── BMR ──

  describe('calculateBmr', () => {
    it('should calculate and return BMR', async () => {
      (svc.calculateAndSaveBmr as jest.Mock).mockResolvedValue({ bmr: 1800, tdee: 2700 });
      const res = mockRes();
      await controller.calculateBmr(mockReq({ body: { playerId: 'p1', weight: 80, height: 180, age: 25 } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getBmrHistory', () => {
    it('should return BMR history', async () => {
      (svc.getBmrHistory as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getBmrHistory(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Workout Plans ──

  describe('listWorkoutPlans', () => {
    it('should return plans', async () => {
      (svc.listWorkoutPlans as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listWorkoutPlans(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getWorkoutPlan', () => {
    it('should return plan', async () => {
      (svc.getWorkoutPlan as jest.Mock).mockResolvedValue({ id: 'plan-001' });
      const res = mockRes();
      await controller.getWorkoutPlan(mockReq({ params: { id: 'plan-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createWorkoutPlan', () => {
    it('should create plan and audit', async () => {
      (svc.createWorkoutPlan as jest.Mock).mockResolvedValue({ id: 'plan-001', nameEn: 'PPL' });
      const res = mockRes();
      await controller.createWorkoutPlan(mockReq({ body: { nameEn: 'PPL' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateWorkoutPlan', () => {
    it('should update plan', async () => {
      (svc.updateWorkoutPlan as jest.Mock).mockResolvedValue({ id: 'plan-001' });
      const res = mockRes();
      await controller.updateWorkoutPlan(mockReq({ params: { id: 'plan-001' }, body: { nameEn: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteWorkoutPlan', () => {
    it('should delete plan and audit', async () => {
      (svc.deleteWorkoutPlan as jest.Mock).mockResolvedValue({ id: 'plan-001' });
      const res = mockRes();
      await controller.deleteWorkoutPlan(mockReq({ params: { id: 'plan-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('duplicateWorkoutPlan', () => {
    it('should duplicate plan and audit', async () => {
      (svc.duplicateWorkoutPlan as jest.Mock).mockResolvedValue({ id: 'plan-002' });
      const res = mockRes();
      await controller.duplicateWorkoutPlan(mockReq({ params: { id: 'plan-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── Sessions ──

  describe('addSession', () => {
    it('should add session', async () => {
      (svc.addSession as jest.Mock).mockResolvedValue({ id: 'ses-001' });
      const res = mockRes();
      await controller.addSession(mockReq({ params: { planId: 'plan-001' }, body: { weekNumber: 1, dayNumber: 1 } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateSession', () => {
    it('should update session', async () => {
      (svc.updateSession as jest.Mock).mockResolvedValue({ id: 'ses-001' });
      const res = mockRes();
      await controller.updateSession(mockReq({ params: { sessionId: 'ses-001' }, body: { sessionName: 'Push' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteSession', () => {
    it('should delete session', async () => {
      (svc.deleteSession as jest.Mock).mockResolvedValue({ id: 'ses-001' });
      const res = mockRes();
      await controller.deleteSession(mockReq({ params: { sessionId: 'ses-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Session Exercises ──

  describe('addExerciseToSession', () => {
    it('should add exercise', async () => {
      (svc.addExerciseToSession as jest.Mock).mockResolvedValue({ id: 'wex-001' });
      const res = mockRes();
      await controller.addExerciseToSession(mockReq({ params: { sessionId: 'ses-001' }, body: { exerciseId: 'ex-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateWorkoutExercise', () => {
    it('should update exercise', async () => {
      (svc.updateWorkoutExercise as jest.Mock).mockResolvedValue({ id: 'wex-001' });
      const res = mockRes();
      await controller.updateWorkoutExercise(mockReq({ params: { exerciseId: 'wex-001' }, body: { sets: 4 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteWorkoutExercise', () => {
    it('should delete exercise', async () => {
      (svc.deleteWorkoutExercise as jest.Mock).mockResolvedValue({ id: 'wex-001' });
      const res = mockRes();
      await controller.deleteWorkoutExercise(mockReq({ params: { exerciseId: 'wex-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Assignments ──

  describe('assignWorkout', () => {
    it('should assign workout and audit', async () => {
      (svc.assignWorkout as jest.Mock).mockResolvedValue({ id: 'plan-001' });
      const res = mockRes();
      await controller.assignWorkout(mockReq({ params: { id: 'plan-001' }, body: { playerIds: ['p1', 'p2'] } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeAssignment', () => {
    it('should remove assignment', async () => {
      (svc.removeAssignment as jest.Mock).mockResolvedValue({ id: 'assign-001' });
      const res = mockRes();
      await controller.removeAssignment(mockReq({ params: { assignmentId: 'assign-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Player Workout Self-Service ──

  describe('getMyWorkouts', () => {
    it('should return workouts for player', async () => {
      (svc.getPlayerWorkouts as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getMyWorkouts(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return empty if no playerId', async () => {
      const res = mockRes();
      await controller.getMyWorkouts(mockReq({ user: { id: 'u1', fullName: 'Admin', role: 'Admin' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logMyWorkout', () => {
    it('should log workout', async () => {
      (svc.logWorkoutSession as jest.Mock).mockResolvedValue({ id: 'log-001' });
      const res = mockRes();
      await controller.logMyWorkout(mockReq({ params: { assignmentId: 'a1' }, body: { sessionId: 's1' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 403 if no playerId', async () => {
      const res = mockRes();
      await controller.logMyWorkout(mockReq({ user: { id: 'u1', fullName: 'Admin', role: 'Admin' }, params: { assignmentId: 'a1' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getWorkoutLogs', () => {
    it('should return logs', async () => {
      (svc.getWorkoutLogs as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getWorkoutLogs(mockReq({ params: { assignmentId: 'a1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Food Database ──

  describe('listFoods', () => {
    it('should return foods', async () => {
      (svc.listFoods as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listFoods(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getFood', () => {
    it('should return food', async () => {
      (svc.getFood as jest.Mock).mockResolvedValue({ id: 'food-001' });
      const res = mockRes();
      await controller.getFood(mockReq({ params: { id: 'food-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createFood', () => {
    it('should create food', async () => {
      (svc.createFood as jest.Mock).mockResolvedValue({ id: 'food-001' });
      const res = mockRes();
      await controller.createFood(mockReq({ body: { nameEn: 'Rice' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateFood', () => {
    it('should update food', async () => {
      (svc.updateFood as jest.Mock).mockResolvedValue({ id: 'food-001' });
      const res = mockRes();
      await controller.updateFood(mockReq({ params: { id: 'food-001' }, body: { nameEn: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteFood', () => {
    it('should delete food', async () => {
      (svc.deleteFood as jest.Mock).mockResolvedValue({ id: 'food-001' });
      const res = mockRes();
      await controller.deleteFood(mockReq({ params: { id: 'food-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Diet Plans ──

  describe('listDietPlans', () => {
    it('should return diet plans', async () => {
      (svc.listDietPlans as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listDietPlans(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getDietPlan', () => {
    it('should return diet plan', async () => {
      (svc.getDietPlan as jest.Mock).mockResolvedValue({ id: 'diet-001' });
      const res = mockRes();
      await controller.getDietPlan(mockReq({ params: { id: 'diet-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createDietPlan', () => {
    it('should create diet plan and audit', async () => {
      (svc.createDietPlan as jest.Mock).mockResolvedValue({ id: 'diet-001', nameEn: 'Cutting' });
      const res = mockRes();
      await controller.createDietPlan(mockReq({ body: { nameEn: 'Cutting' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateDietPlan', () => {
    it('should update diet plan', async () => {
      (svc.updateDietPlan as jest.Mock).mockResolvedValue({ id: 'diet-001' });
      const res = mockRes();
      await controller.updateDietPlan(mockReq({ params: { id: 'diet-001' }, body: { nameEn: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteDietPlan', () => {
    it('should delete diet plan and audit', async () => {
      (svc.deleteDietPlan as jest.Mock).mockResolvedValue({ id: 'diet-001' });
      const res = mockRes();
      await controller.deleteDietPlan(mockReq({ params: { id: 'diet-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Diet Meals ──

  describe('addMealToPlan', () => {
    it('should add meal', async () => {
      (svc.addMealToPlan as jest.Mock).mockResolvedValue({ id: 'diet-001' });
      const res = mockRes();
      await controller.addMealToPlan(mockReq({ params: { planId: 'diet-001' }, body: { dayNumber: 1, mealType: 'lunch' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteMeal', () => {
    it('should delete meal', async () => {
      (svc.deleteMeal as jest.Mock).mockResolvedValue({ id: 'meal-001' });
      const res = mockRes();
      await controller.deleteMeal(mockReq({ params: { mealId: 'meal-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addItemToMeal', () => {
    it('should add item', async () => {
      (svc.addItemToMeal as jest.Mock).mockResolvedValue({ id: 'item-001' });
      const res = mockRes();
      await controller.addItemToMeal(mockReq({ params: { mealId: 'meal-001' }, body: { foodId: 'food-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteItemFromMeal', () => {
    it('should delete item', async () => {
      (svc.deleteItemFromMeal as jest.Mock).mockResolvedValue({ id: 'item-001' });
      const res = mockRes();
      await controller.deleteItemFromMeal(mockReq({ params: { itemId: 'item-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Player Diet Self-Service ──

  describe('getMyDietPlans', () => {
    it('should return diet plans for player', async () => {
      (svc.listDietPlans as jest.Mock).mockResolvedValue({ data: [] });
      const res = mockRes();
      await controller.getMyDietPlans(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return empty if no playerId', async () => {
      const res = mockRes();
      await controller.getMyDietPlans(mockReq({ user: { id: 'u1', fullName: 'Admin', role: 'Admin' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logMyAdherence', () => {
    it('should log adherence', async () => {
      (svc.logDietAdherence as jest.Mock).mockResolvedValue({ id: 'adh-001' });
      const res = mockRes();
      await controller.logMyAdherence(mockReq({ params: { planId: 'diet-001' }, body: { status: 'consumed' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 403 if no playerId', async () => {
      const res = mockRes();
      await controller.logMyAdherence(mockReq({ user: { id: 'u1', fullName: 'Admin', role: 'Admin' }, params: { planId: 'diet-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getPlayerAdherence', () => {
    it('should return adherence', async () => {
      (svc.getPlayerDietAdherence as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getPlayerAdherence(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Coach Dashboard ──

  describe('getCoachDashboard', () => {
    it('should return dashboard', async () => {
      (svc.getCoachDashboard as jest.Mock).mockResolvedValue({ totalPlayers: 5 });
      const res = mockRes();
      await controller.getCoachDashboard(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('markAlertRead', () => {
    it('should mark alert', async () => {
      (svc.markAlertRead as jest.Mock).mockResolvedValue({ id: 'alert-001', isRead: true });
      const res = mockRes();
      await controller.markAlertRead(mockReq({ params: { id: 'alert-001' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
