/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock fns ──

const mockExerciseFindAndCountAll = jest.fn();
const mockExerciseFindByPk = jest.fn();
const mockExerciseCreate = jest.fn();

const mockBodyMetricFindAndCountAll = jest.fn();
const mockBodyMetricFindByPk = jest.fn();
const mockBodyMetricFindOne = jest.fn();
const mockBodyMetricFindAll = jest.fn();
const mockBodyMetricCreate = jest.fn();

const mockMetricTargetFindOne = jest.fn();
const mockMetricTargetFindByPk = jest.fn();
const mockMetricTargetCreate = jest.fn();
const mockMetricTargetUpdate = jest.fn();

const mockBmrCreate = jest.fn();
const mockBmrFindAll = jest.fn();

const mockWorkoutPlanFindAndCountAll = jest.fn();
const mockWorkoutPlanFindByPk = jest.fn();
const mockWorkoutPlanCreate = jest.fn();

const mockWorkoutSessionFindByPk = jest.fn();
const mockWorkoutSessionCreate = jest.fn();
const mockWorkoutSessionCount = jest.fn();

const mockWorkoutExerciseFindByPk = jest.fn();
const mockWorkoutExerciseCreate = jest.fn();

const mockAssignmentFindByPk = jest.fn();
const mockAssignmentFindAll = jest.fn();
const mockAssignmentBulkCreate = jest.fn();

const mockWorkoutLogCreate = jest.fn();
const mockWorkoutLogFindAll = jest.fn();
const mockWorkoutLogCount = jest.fn();

const mockFoodFindAndCountAll = jest.fn();
const mockFoodFindByPk = jest.fn();
const mockFoodCreate = jest.fn();

const mockDietPlanFindAndCountAll = jest.fn();
const mockDietPlanFindByPk = jest.fn();
const mockDietPlanCreate = jest.fn();

const mockDietMealFindByPk = jest.fn();
const mockDietMealCreate = jest.fn();

const mockDietMealItemFindByPk = jest.fn();
const mockDietMealItemCreate = jest.fn();
const mockDietMealItemBulkCreate = jest.fn();

const mockDietAdherenceCreate = jest.fn();
const mockDietAdherenceFindAll = jest.fn();

const mockCoachAlertFindAll = jest.fn();
const mockCoachAlertFindByPk = jest.fn();

const mockPlayerFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/gym/gym.model', () => ({
  ExerciseLibrary: {
    findAndCountAll: (...a: unknown[]) => mockExerciseFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockExerciseFindByPk(...a),
    create: (...a: unknown[]) => mockExerciseCreate(...a),
  },
  BodyMetric: {
    findAndCountAll: (...a: unknown[]) => mockBodyMetricFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockBodyMetricFindByPk(...a),
    findOne: (...a: unknown[]) => mockBodyMetricFindOne(...a),
    findAll: (...a: unknown[]) => mockBodyMetricFindAll(...a),
    create: (...a: unknown[]) => mockBodyMetricCreate(...a),
  },
  MetricTarget: {
    findOne: (...a: unknown[]) => mockMetricTargetFindOne(...a),
    findByPk: (...a: unknown[]) => mockMetricTargetFindByPk(...a),
    create: (...a: unknown[]) => mockMetricTargetCreate(...a),
    update: (...a: unknown[]) => mockMetricTargetUpdate(...a),
  },
  BmrCalculation: {
    create: (...a: unknown[]) => mockBmrCreate(...a),
    findAll: (...a: unknown[]) => mockBmrFindAll(...a),
  },
  WorkoutPlan: {
    findAndCountAll: (...a: unknown[]) => mockWorkoutPlanFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockWorkoutPlanFindByPk(...a),
    create: (...a: unknown[]) => mockWorkoutPlanCreate(...a),
  },
  WorkoutSession: {
    findByPk: (...a: unknown[]) => mockWorkoutSessionFindByPk(...a),
    create: (...a: unknown[]) => mockWorkoutSessionCreate(...a),
    count: (...a: unknown[]) => mockWorkoutSessionCount(...a),
  },
  WorkoutExercise: {
    findByPk: (...a: unknown[]) => mockWorkoutExerciseFindByPk(...a),
    create: (...a: unknown[]) => mockWorkoutExerciseCreate(...a),
  },
  WorkoutAssignment: {
    findByPk: (...a: unknown[]) => mockAssignmentFindByPk(...a),
    findAll: (...a: unknown[]) => mockAssignmentFindAll(...a),
    bulkCreate: (...a: unknown[]) => mockAssignmentBulkCreate(...a),
  },
  WorkoutLog: {
    create: (...a: unknown[]) => mockWorkoutLogCreate(...a),
    findAll: (...a: unknown[]) => mockWorkoutLogFindAll(...a),
    count: (...a: unknown[]) => mockWorkoutLogCount(...a),
  },
  FoodItem: {
    findAndCountAll: (...a: unknown[]) => mockFoodFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFoodFindByPk(...a),
    create: (...a: unknown[]) => mockFoodCreate(...a),
  },
  DietPlan: {
    findAndCountAll: (...a: unknown[]) => mockDietPlanFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockDietPlanFindByPk(...a),
    create: (...a: unknown[]) => mockDietPlanCreate(...a),
  },
  DietMeal: {
    findByPk: (...a: unknown[]) => mockDietMealFindByPk(...a),
    create: (...a: unknown[]) => mockDietMealCreate(...a),
  },
  DietMealItem: {
    findByPk: (...a: unknown[]) => mockDietMealItemFindByPk(...a),
    create: (...a: unknown[]) => mockDietMealItemCreate(...a),
    bulkCreate: (...a: unknown[]) => mockDietMealItemBulkCreate(...a),
  },
  DietAdherence: {
    create: (...a: unknown[]) => mockDietAdherenceCreate(...a),
    findAll: (...a: unknown[]) => mockDietAdherenceFindAll(...a),
  },
  CoachAlert: {
    findAll: (...a: unknown[]) => mockCoachAlertFindAll(...a),
    findByPk: (...a: unknown[]) => mockCoachAlertFindByPk(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    name: 'Player',
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from '../../../src/modules/gym/gym.service';

// ── Helpers ──

const mockExercise = (overrides = {}) => ({
  id: 'ex-001', nameEn: 'Bench Press', nameAr: 'ضغط', muscleGroup: 'Chest',
  equipment: 'Barbell', movementType: 'Push', difficulty: 'Intermediate',
  isCustom: false, createdBy: null, ...overrides,
});

const mockMetric = (overrides = {}) => ({
  id: 'met-001', playerId: 'player-001', date: '2026-01-15',
  weight: 80, height: 180, bodyFatPct: 15, bmi: 24.7, ...overrides,
});

const mockPlan = (overrides = {}) => ({
  id: 'plan-001', nameEn: 'PPL Routine', nameAr: 'تمرين PPL',
  durationWeeks: 4, daysPerWeek: 5, type: 'individual', status: 'active',
  createdBy: 'user-001', sessions: [], assignments: [], ...overrides,
});

const mockSession = (overrides = {}) => ({
  id: 'session-001', planId: 'plan-001', weekNumber: 1, dayNumber: 1,
  sessionName: 'Push Day', exercises: [], ...overrides,
});

const mockFood = (overrides = {}) => ({
  id: 'food-001', nameEn: 'Chicken Breast', nameAr: 'صدر دجاج',
  category: 'Protein', caloriesPer100g: 165, proteinPer100g: 31,
  carbsPer100g: 0, fatPer100g: 3.6, ...overrides,
});

const mockDietPlan = (overrides = {}) => ({
  id: 'diet-001', nameEn: 'Cutting Plan', nameAr: 'خطة تنشيف',
  type: 'weekly', status: 'active', targetCalories: 2500,
  createdBy: 'user-001', meals: [], ...overrides,
});

const mockAssignment = (overrides = {}) => ({
  id: 'assign-001', planId: 'plan-001', playerId: 'player-001',
  assignedBy: 'user-001', status: 'active', completionPct: 0, ...overrides,
});

describe('Gym Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ═══════════════════════════════════════════
  // EXERCISE LIBRARY
  // ═══════════════════════════════════════════

  describe('listExercises', () => {
    it('should return paginated exercises', async () => {
      mockExerciseFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockExercise())] });
      const result = await svc.listExercises({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('should filter by muscleGroup', async () => {
      mockExerciseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listExercises({ muscleGroup: 'Chest', page: 1, limit: 10 });
      expect(mockExerciseFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by equipment', async () => {
      mockExerciseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listExercises({ equipment: 'Barbell', page: 1, limit: 10 });
      expect(mockExerciseFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by difficulty', async () => {
      mockExerciseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listExercises({ difficulty: 'Beginner', page: 1, limit: 10 });
      expect(mockExerciseFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockExerciseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listExercises({ search: 'bench', page: 1, limit: 10 });
      expect(mockExerciseFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getExercise', () => {
    it('should return exercise', async () => {
      mockExerciseFindByPk.mockResolvedValue(mockModelInstance(mockExercise()));
      const result = await svc.getExercise('ex-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockExerciseFindByPk.mockResolvedValue(null);
      await expect(svc.getExercise('bad')).rejects.toThrow('Exercise not found');
    });
  });

  describe('createExercise', () => {
    it('should create exercise with createdBy', async () => {
      mockExerciseCreate.mockResolvedValue(mockModelInstance(mockExercise({ isCustom: true })));
      const result = await svc.createExercise({ nameEn: 'New Ex', muscleGroup: 'Back' } as any, 'user-001');
      expect(result).toBeDefined();
      expect(mockExerciseCreate).toHaveBeenCalledWith(expect.objectContaining({ isCustom: true, createdBy: 'user-001' }));
    });
  });

  describe('updateExercise', () => {
    it('should update exercise', async () => {
      const ex = mockModelInstance(mockExercise());
      mockExerciseFindByPk.mockResolvedValue(ex);
      await svc.updateExercise('ex-001', { nameEn: 'Updated' } as any);
      expect(ex.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockExerciseFindByPk.mockResolvedValue(null);
      await expect(svc.updateExercise('bad', {} as any)).rejects.toThrow('Exercise not found');
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise', async () => {
      const ex = mockModelInstance(mockExercise());
      mockExerciseFindByPk.mockResolvedValue(ex);
      const result = await svc.deleteExercise('ex-001');
      expect(ex.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'ex-001' });
    });

    it('should throw 404 if not found', async () => {
      mockExerciseFindByPk.mockResolvedValue(null);
      await expect(svc.deleteExercise('bad')).rejects.toThrow('Exercise not found');
    });
  });

  // ═══════════════════════════════════════════
  // BODY METRICS
  // ═══════════════════════════════════════════

  describe('listBodyMetrics', () => {
    it('should return paginated metrics', async () => {
      mockBodyMetricFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockMetric())] });
      const result = await svc.listBodyMetrics('player-001', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      mockBodyMetricFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listBodyMetrics('player-001', { from: '2026-01-01', to: '2026-03-01', page: 1, limit: 10 });
      expect(mockBodyMetricFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('createBodyMetric', () => {
    it('should auto-calculate BMI', async () => {
      mockBodyMetricCreate.mockResolvedValue(mockModelInstance(mockMetric()));
      await svc.createBodyMetric({ playerId: 'player-001', weight: 80, height: 180 } as any, 'user-001');
      expect(mockBodyMetricCreate).toHaveBeenCalledWith(expect.objectContaining({ bmi: 24.7 }));
    });

    it('should not set BMI if weight/height missing', async () => {
      mockBodyMetricCreate.mockResolvedValue(mockModelInstance(mockMetric()));
      await svc.createBodyMetric({ playerId: 'player-001', weight: 80 } as any, 'user-001');
      const callArg = mockBodyMetricCreate.mock.calls[0][0];
      expect(callArg.bmi).toBeUndefined();
    });
  });

  describe('updateBodyMetric', () => {
    it('should update metric', async () => {
      const m = mockModelInstance(mockMetric());
      mockBodyMetricFindByPk.mockResolvedValue(m);
      await svc.updateBodyMetric('met-001', { weight: 82 } as any);
      expect(m.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockBodyMetricFindByPk.mockResolvedValue(null);
      await expect(svc.updateBodyMetric('bad', {} as any)).rejects.toThrow('Body metric not found');
    });
  });

  describe('deleteBodyMetric', () => {
    it('should delete metric', async () => {
      const m = mockModelInstance(mockMetric());
      mockBodyMetricFindByPk.mockResolvedValue(m);
      const result = await svc.deleteBodyMetric('met-001');
      expect(m.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'met-001' });
    });

    it('should throw 404 if not found', async () => {
      mockBodyMetricFindByPk.mockResolvedValue(null);
      await expect(svc.deleteBodyMetric('bad')).rejects.toThrow('Body metric not found');
    });
  });

  describe('getLatestBodyMetric', () => {
    it('should return latest metric', async () => {
      mockBodyMetricFindOne.mockResolvedValue(mockModelInstance(mockMetric()));
      const result = await svc.getLatestBodyMetric('player-001');
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // METRIC TARGETS
  // ═══════════════════════════════════════════

  describe('getMetricTarget', () => {
    it('should return active target', async () => {
      mockMetricTargetFindOne.mockResolvedValue(mockModelInstance({ id: 'tgt-001', playerId: 'player-001', status: 'active' }));
      const result = await svc.getMetricTarget('player-001');
      expect(result).toBeDefined();
    });
  });

  describe('createMetricTarget', () => {
    it('should deactivate existing and create new', async () => {
      mockMetricTargetUpdate.mockResolvedValue([1]);
      mockMetricTargetCreate.mockResolvedValue(mockModelInstance({ id: 'tgt-002' }));
      await svc.createMetricTarget({ playerId: 'player-001', targetWeight: 75 } as any, 'user-001');
      expect(mockMetricTargetUpdate).toHaveBeenCalledWith(
        { status: 'cancelled' },
        expect.objectContaining({ where: expect.objectContaining({ playerId: 'player-001', status: 'active' }) }),
      );
      expect(mockMetricTargetCreate).toHaveBeenCalled();
    });
  });

  describe('updateMetricTarget', () => {
    it('should update target', async () => {
      const t = mockModelInstance({ id: 'tgt-001' });
      mockMetricTargetFindByPk.mockResolvedValue(t);
      await svc.updateMetricTarget('tgt-001', { targetWeight: 72 } as any);
      expect(t.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockMetricTargetFindByPk.mockResolvedValue(null);
      await expect(svc.updateMetricTarget('bad', {} as any)).rejects.toThrow('Metric target not found');
    });
  });

  // ═══════════════════════════════════════════
  // BMR CALCULATOR
  // ═══════════════════════════════════════════

  describe('calculateAndSaveBmr', () => {
    it('should calculate BMR for male', async () => {
      mockBmrCreate.mockImplementation(async (data: any) => mockModelInstance(data));
      const result = await svc.calculateAndSaveBmr(
        { playerId: 'p1', weight: 80, height: 180, age: 25, gender: 'male', activityLevel: 'moderate', goal: 'maintain' },
        'user-001',
      );
      expect(result.bmr).toBeDefined();
      expect(result.tdee).toBeDefined();
      expect(result.proteinG).toBeDefined();
    });

    it('should calculate BMR for female', async () => {
      mockBmrCreate.mockImplementation(async (data: any) => mockModelInstance(data));
      const result = await svc.calculateAndSaveBmr(
        { playerId: 'p1', weight: 60, height: 165, age: 22, gender: 'female', activityLevel: 'light', goal: 'cut' },
        'user-001',
      );
      expect(result.bmr).toBeDefined();
      // Female: 10*60 + 6.25*165 - 5*22 - 161 = 1360.25
      expect(result.bmr).toBe(1360.3);
    });

    it('should apply bulk goal adjustment', async () => {
      mockBmrCreate.mockImplementation(async (data: any) => mockModelInstance(data));
      const result = await svc.calculateAndSaveBmr(
        { playerId: 'p1', weight: 80, height: 180, age: 25, gender: 'male', activityLevel: 'sedentary', goal: 'bulk' },
        'user-001',
      );
      // BMR male: 10*80 + 6.25*180 - 5*25 + 5 = 1805, TDEE = 1805*1.2 = 2166, bulk = 2166+300
      expect(result.targetCalories).toBe(2466);
    });
  });

  describe('getBmrHistory', () => {
    it('should return BMR history', async () => {
      mockBmrFindAll.mockResolvedValue([mockModelInstance({ id: 'bmr-001' })]);
      const result = await svc.getBmrHistory('player-001');
      expect(result).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════
  // WORKOUT PLANS
  // ═══════════════════════════════════════════

  describe('listWorkoutPlans', () => {
    it('should return paginated plans', async () => {
      mockWorkoutPlanFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockPlan())] });
      const result = await svc.listWorkoutPlans({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockWorkoutPlanFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listWorkoutPlans({ status: 'active', page: 1, limit: 10 });
      expect(mockWorkoutPlanFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      mockWorkoutPlanFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listWorkoutPlans({ type: 'individual', page: 1, limit: 10 });
      expect(mockWorkoutPlanFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockWorkoutPlanFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listWorkoutPlans({ search: 'PPL', page: 1, limit: 10 });
      expect(mockWorkoutPlanFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getWorkoutPlan', () => {
    it('should return plan with sessions and assignments', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(mockModelInstance(mockPlan()));
      const result = await svc.getWorkoutPlan('plan-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(null);
      await expect(svc.getWorkoutPlan('bad')).rejects.toThrow('Workout plan not found');
    });
  });

  describe('createWorkoutPlan', () => {
    it('should create plan', async () => {
      mockWorkoutPlanCreate.mockResolvedValue(mockModelInstance(mockPlan()));
      const result = await svc.createWorkoutPlan({ nameEn: 'New Plan', durationWeeks: 4, daysPerWeek: 5 } as any, 'user-001');
      expect(result).toBeDefined();
    });
  });

  describe('updateWorkoutPlan', () => {
    it('should update plan', async () => {
      const plan = mockModelInstance(mockPlan());
      mockWorkoutPlanFindByPk.mockResolvedValue(plan);
      await svc.updateWorkoutPlan('plan-001', { nameEn: 'Updated' } as any);
      expect(plan.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(null);
      await expect(svc.updateWorkoutPlan('bad', {} as any)).rejects.toThrow('Workout plan not found');
    });
  });

  describe('deleteWorkoutPlan', () => {
    it('should delete plan', async () => {
      const plan = mockModelInstance(mockPlan());
      mockWorkoutPlanFindByPk.mockResolvedValue(plan);
      const result = await svc.deleteWorkoutPlan('plan-001');
      expect(plan.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'plan-001' });
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(null);
      await expect(svc.deleteWorkoutPlan('bad')).rejects.toThrow('Workout plan not found');
    });
  });

  // ── Sessions ──

  describe('addSession', () => {
    it('should add session to plan', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(mockModelInstance(mockPlan()));
      mockWorkoutSessionCreate.mockResolvedValue(mockModelInstance(mockSession()));
      const result = await svc.addSession('plan-001', { weekNumber: 1, dayNumber: 1 } as any);
      expect(result).toBeDefined();
    });

    it('should throw 404 if plan not found', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(null);
      await expect(svc.addSession('bad', { weekNumber: 1, dayNumber: 1 } as any)).rejects.toThrow('Workout plan not found');
    });
  });

  describe('updateSession', () => {
    it('should update session', async () => {
      const session = mockModelInstance(mockSession());
      mockWorkoutSessionFindByPk.mockResolvedValue(session);
      await svc.updateSession('session-001', { sessionName: 'Updated' } as any);
      expect(session.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutSessionFindByPk.mockResolvedValue(null);
      await expect(svc.updateSession('bad', {} as any)).rejects.toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete session', async () => {
      const session = mockModelInstance(mockSession());
      mockWorkoutSessionFindByPk.mockResolvedValue(session);
      const result = await svc.deleteSession('session-001');
      expect(session.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'session-001' });
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutSessionFindByPk.mockResolvedValue(null);
      await expect(svc.deleteSession('bad')).rejects.toThrow('Session not found');
    });
  });

  // ── Session Exercises ──

  describe('addExerciseToSession', () => {
    it('should add exercise to session', async () => {
      mockWorkoutSessionFindByPk.mockResolvedValue(mockModelInstance(mockSession()));
      mockWorkoutExerciseCreate.mockResolvedValue(mockModelInstance({ id: 'wex-001' }));
      const result = await svc.addExerciseToSession('session-001', { exerciseId: 'ex-001', sets: 3, reps: '10' } as any);
      expect(result).toBeDefined();
    });

    it('should throw 404 if session not found', async () => {
      mockWorkoutSessionFindByPk.mockResolvedValue(null);
      await expect(svc.addExerciseToSession('bad', {} as any)).rejects.toThrow('Session not found');
    });
  });

  describe('updateWorkoutExercise', () => {
    it('should update workout exercise', async () => {
      const ex = mockModelInstance({ id: 'wex-001', sets: 3 });
      mockWorkoutExerciseFindByPk.mockResolvedValue(ex);
      await svc.updateWorkoutExercise('wex-001', { sets: 4 });
      expect(ex.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutExerciseFindByPk.mockResolvedValue(null);
      await expect(svc.updateWorkoutExercise('bad', {})).rejects.toThrow('Exercise not found');
    });
  });

  describe('deleteWorkoutExercise', () => {
    it('should delete workout exercise', async () => {
      const ex = mockModelInstance({ id: 'wex-001' });
      mockWorkoutExerciseFindByPk.mockResolvedValue(ex);
      const result = await svc.deleteWorkoutExercise('wex-001');
      expect(ex.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'wex-001' });
    });

    it('should throw 404 if not found', async () => {
      mockWorkoutExerciseFindByPk.mockResolvedValue(null);
      await expect(svc.deleteWorkoutExercise('bad')).rejects.toThrow('Exercise not found');
    });
  });

  // ── Assignments ──

  describe('assignWorkout', () => {
    it('should assign workout to players', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(mockModelInstance(mockPlan()));
      mockAssignmentBulkCreate.mockResolvedValue([{}]);
      // getWorkoutPlan refetch
      mockWorkoutPlanFindByPk.mockResolvedValue(mockModelInstance(mockPlan()));
      const result = await svc.assignWorkout('plan-001', { playerIds: ['p1', 'p2'] } as any, 'user-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if plan not found', async () => {
      mockWorkoutPlanFindByPk.mockResolvedValue(null);
      await expect(svc.assignWorkout('bad', { playerIds: ['p1'] } as any, 'user-001')).rejects.toThrow('Workout plan not found');
    });
  });

  describe('removeAssignment', () => {
    it('should remove assignment', async () => {
      const a = mockModelInstance(mockAssignment());
      mockAssignmentFindByPk.mockResolvedValue(a);
      const result = await svc.removeAssignment('assign-001');
      expect(a.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'assign-001' });
    });

    it('should throw 404 if not found', async () => {
      mockAssignmentFindByPk.mockResolvedValue(null);
      await expect(svc.removeAssignment('bad')).rejects.toThrow('Assignment not found');
    });
  });

  // ── Workout Logs ──

  describe('logWorkoutSession', () => {
    it('should log session and update completion', async () => {
      const assignment = mockModelInstance(mockAssignment());
      mockAssignmentFindByPk.mockResolvedValue(assignment);
      mockWorkoutLogCreate.mockResolvedValue(mockModelInstance({ id: 'log-001' }));
      mockWorkoutSessionCount.mockResolvedValue(4);
      mockWorkoutLogCount.mockResolvedValue(2);
      const result = await svc.logWorkoutSession('assign-001', 'player-001', { sessionId: 'session-001' } as any);
      expect(result).toBeDefined();
      expect(assignment.update).toHaveBeenCalledWith(expect.objectContaining({ completionPct: 50, status: 'active' }));
    });

    it('should mark as completed at 100%', async () => {
      const assignment = mockModelInstance(mockAssignment());
      mockAssignmentFindByPk.mockResolvedValue(assignment);
      mockWorkoutLogCreate.mockResolvedValue(mockModelInstance({ id: 'log-001' }));
      mockWorkoutSessionCount.mockResolvedValue(4);
      mockWorkoutLogCount.mockResolvedValue(4);
      await svc.logWorkoutSession('assign-001', 'player-001', { sessionId: 'session-001' } as any);
      expect(assignment.update).toHaveBeenCalledWith(expect.objectContaining({ completionPct: 100, status: 'completed' }));
    });

    it('should throw 403 if not own assignment', async () => {
      mockAssignmentFindByPk.mockResolvedValue(mockModelInstance(mockAssignment({ playerId: 'other-player' })));
      await expect(svc.logWorkoutSession('assign-001', 'player-001', { sessionId: 's1' } as any)).rejects.toThrow('Forbidden');
    });

    it('should throw 404 if assignment not found', async () => {
      mockAssignmentFindByPk.mockResolvedValue(null);
      await expect(svc.logWorkoutSession('bad', 'player-001', { sessionId: 's1' } as any)).rejects.toThrow('Assignment not found');
    });
  });

  describe('getPlayerWorkouts', () => {
    it('should return player workouts', async () => {
      mockAssignmentFindAll.mockResolvedValue([mockModelInstance(mockAssignment())]);
      const result = await svc.getPlayerWorkouts('player-001');
      expect(result).toHaveLength(1);
    });
  });

  describe('getWorkoutLogs', () => {
    it('should return logs', async () => {
      mockWorkoutLogFindAll.mockResolvedValue([mockModelInstance({ id: 'log-001' })]);
      const result = await svc.getWorkoutLogs('assign-001');
      expect(result).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════
  // FOOD DATABASE
  // ═══════════════════════════════════════════

  describe('listFoods', () => {
    it('should return paginated foods', async () => {
      mockFoodFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockFood())] });
      const result = await svc.listFoods({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by category', async () => {
      mockFoodFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listFoods({ category: 'Protein', page: 1, limit: 10 });
      expect(mockFoodFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockFoodFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listFoods({ search: 'chicken', page: 1, limit: 10 });
      expect(mockFoodFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getFood', () => {
    it('should return food', async () => {
      mockFoodFindByPk.mockResolvedValue(mockModelInstance(mockFood()));
      const result = await svc.getFood('food-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockFoodFindByPk.mockResolvedValue(null);
      await expect(svc.getFood('bad')).rejects.toThrow('Food item not found');
    });
  });

  describe('createFood', () => {
    it('should create food', async () => {
      mockFoodCreate.mockResolvedValue(mockModelInstance(mockFood()));
      const result = await svc.createFood({ nameEn: 'Rice' } as any, 'user-001');
      expect(result).toBeDefined();
    });
  });

  describe('updateFood', () => {
    it('should update food', async () => {
      const food = mockModelInstance(mockFood());
      mockFoodFindByPk.mockResolvedValue(food);
      await svc.updateFood('food-001', { nameEn: 'Updated' } as any);
      expect(food.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockFoodFindByPk.mockResolvedValue(null);
      await expect(svc.updateFood('bad', {} as any)).rejects.toThrow('Food item not found');
    });
  });

  describe('deleteFood', () => {
    it('should delete food', async () => {
      const food = mockModelInstance(mockFood());
      mockFoodFindByPk.mockResolvedValue(food);
      const result = await svc.deleteFood('food-001');
      expect(food.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'food-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFoodFindByPk.mockResolvedValue(null);
      await expect(svc.deleteFood('bad')).rejects.toThrow('Food item not found');
    });
  });

  // ═══════════════════════════════════════════
  // DIET PLANS
  // ═══════════════════════════════════════════

  describe('listDietPlans', () => {
    it('should return paginated diet plans', async () => {
      mockDietPlanFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockDietPlan())] });
      const result = await svc.listDietPlans({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockDietPlanFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listDietPlans({ status: 'active', page: 1, limit: 10 });
      expect(mockDietPlanFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by isTemplate', async () => {
      mockDietPlanFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listDietPlans({ isTemplate: 'true', page: 1, limit: 10 });
      expect(mockDietPlanFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by playerId', async () => {
      mockDietPlanFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listDietPlans({ playerId: 'player-001', page: 1, limit: 10 });
      expect(mockDietPlanFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getDietPlan', () => {
    it('should return diet plan with meals', async () => {
      mockDietPlanFindByPk.mockResolvedValue(mockModelInstance(mockDietPlan()));
      const result = await svc.getDietPlan('diet-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockDietPlanFindByPk.mockResolvedValue(null);
      await expect(svc.getDietPlan('bad')).rejects.toThrow('Diet plan not found');
    });
  });

  describe('createDietPlan', () => {
    it('should create diet plan', async () => {
      mockDietPlanCreate.mockResolvedValue(mockModelInstance(mockDietPlan()));
      const result = await svc.createDietPlan({ nameEn: 'New Diet' } as any, 'user-001');
      expect(result).toBeDefined();
    });
  });

  describe('updateDietPlan', () => {
    it('should update diet plan', async () => {
      const plan = mockModelInstance(mockDietPlan());
      mockDietPlanFindByPk.mockResolvedValue(plan);
      await svc.updateDietPlan('diet-001', { nameEn: 'Updated' } as any);
      expect(plan.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockDietPlanFindByPk.mockResolvedValue(null);
      await expect(svc.updateDietPlan('bad', {} as any)).rejects.toThrow('Diet plan not found');
    });
  });

  describe('deleteDietPlan', () => {
    it('should delete diet plan', async () => {
      const plan = mockModelInstance(mockDietPlan());
      mockDietPlanFindByPk.mockResolvedValue(plan);
      const result = await svc.deleteDietPlan('diet-001');
      expect(plan.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'diet-001' });
    });

    it('should throw 404 if not found', async () => {
      mockDietPlanFindByPk.mockResolvedValue(null);
      await expect(svc.deleteDietPlan('bad')).rejects.toThrow('Diet plan not found');
    });
  });

  // ── Diet Meals ──

  describe('addMealToPlan', () => {
    it('should add meal and return plan', async () => {
      mockDietPlanFindByPk.mockResolvedValue(mockModelInstance(mockDietPlan()));
      mockDietMealCreate.mockResolvedValue(mockModelInstance({ id: 'meal-001' }));
      // getDietPlan refetch
      mockDietPlanFindByPk.mockResolvedValue(mockModelInstance(mockDietPlan()));
      const result = await svc.addMealToPlan('diet-001', { dayNumber: 1, mealType: 'breakfast' } as any);
      expect(result).toBeDefined();
    });

    it('should add meal with items', async () => {
      mockDietPlanFindByPk.mockResolvedValue(mockModelInstance(mockDietPlan()));
      mockDietMealCreate.mockResolvedValue(mockModelInstance({ id: 'meal-001' }));
      mockDietMealItemBulkCreate.mockResolvedValue([mockModelInstance({ id: 'item-001' })]);
      // getDietPlan refetch
      mockDietPlanFindByPk.mockResolvedValue(mockModelInstance(mockDietPlan()));
      await svc.addMealToPlan('diet-001', {
        dayNumber: 1, mealType: 'lunch',
        items: [{ foodId: 'food-001', servingSize: 200, servingUnit: 'g' }],
      } as any);
      expect(mockDietMealItemBulkCreate).toHaveBeenCalled();
    });

    it('should throw 404 if plan not found', async () => {
      mockDietPlanFindByPk.mockResolvedValue(null);
      await expect(svc.addMealToPlan('bad', { dayNumber: 1, mealType: 'lunch' } as any)).rejects.toThrow('Diet plan not found');
    });
  });

  describe('deleteMeal', () => {
    it('should delete meal', async () => {
      const meal = mockModelInstance({ id: 'meal-001' });
      mockDietMealFindByPk.mockResolvedValue(meal);
      const result = await svc.deleteMeal('meal-001');
      expect(meal.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'meal-001' });
    });

    it('should throw 404 if not found', async () => {
      mockDietMealFindByPk.mockResolvedValue(null);
      await expect(svc.deleteMeal('bad')).rejects.toThrow('Meal not found');
    });
  });

  describe('addItemToMeal', () => {
    it('should add item to meal', async () => {
      mockDietMealFindByPk.mockResolvedValue(mockModelInstance({ id: 'meal-001' }));
      mockDietMealItemCreate.mockResolvedValue(mockModelInstance({ id: 'item-001' }));
      const result = await svc.addItemToMeal('meal-001', { foodId: 'food-001' });
      expect(result).toBeDefined();
    });

    it('should throw 404 if meal not found', async () => {
      mockDietMealFindByPk.mockResolvedValue(null);
      await expect(svc.addItemToMeal('bad', {})).rejects.toThrow('Meal not found');
    });
  });

  describe('deleteItemFromMeal', () => {
    it('should delete item', async () => {
      const item = mockModelInstance({ id: 'item-001' });
      mockDietMealItemFindByPk.mockResolvedValue(item);
      const result = await svc.deleteItemFromMeal('item-001');
      expect(item.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'item-001' });
    });

    it('should throw 404 if not found', async () => {
      mockDietMealItemFindByPk.mockResolvedValue(null);
      await expect(svc.deleteItemFromMeal('bad')).rejects.toThrow('Meal item not found');
    });
  });

  // ── Diet Adherence ──

  describe('logDietAdherence', () => {
    it('should log adherence', async () => {
      mockDietAdherenceCreate.mockResolvedValue(mockModelInstance({ id: 'adh-001' }));
      const result = await svc.logDietAdherence('diet-001', 'player-001', { status: 'consumed' } as any);
      expect(result).toBeDefined();
    });
  });

  describe('getPlayerDietAdherence', () => {
    it('should return adherence records', async () => {
      mockDietAdherenceFindAll.mockResolvedValue([mockModelInstance({ id: 'adh-001' })]);
      const result = await svc.getPlayerDietAdherence('player-001', {});
      expect(result).toHaveLength(1);
    });

    it('should filter by planId and date range', async () => {
      mockDietAdherenceFindAll.mockResolvedValue([]);
      await svc.getPlayerDietAdherence('player-001', { planId: 'diet-001', from: '2026-01-01', to: '2026-03-01' });
      expect(mockDietAdherenceFindAll).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════
  // COACH DASHBOARD
  // ═══════════════════════════════════════════

  describe('getCoachDashboard', () => {
    it('should return dashboard data', async () => {
      mockAssignmentFindAll.mockResolvedValue([
        mockModelInstance(mockAssignment({ playerId: 'p1' })),
        mockModelInstance(mockAssignment({ playerId: 'p2' })),
      ]);
      mockBodyMetricFindAll.mockResolvedValue([]);
      mockCoachAlertFindAll.mockResolvedValue([]);
      const result = await svc.getCoachDashboard('user-001');
      expect(result.totalPlayers).toBe(2);
      expect(result.totalActivePlans).toBe(2);
      expect(result.unreadAlerts).toBe(0);
    });

    it('should skip metrics query if no players', async () => {
      mockAssignmentFindAll.mockResolvedValue([]);
      mockCoachAlertFindAll.mockResolvedValue([]);
      const result = await svc.getCoachDashboard('user-001');
      expect(result.totalPlayers).toBe(0);
      expect(mockBodyMetricFindAll).not.toHaveBeenCalled();
    });
  });

  describe('markAlertRead', () => {
    it('should mark alert as read', async () => {
      const alert = mockModelInstance({ id: 'alert-001', coachId: 'user-001', isRead: false });
      mockCoachAlertFindByPk.mockResolvedValue(alert);
      await svc.markAlertRead('alert-001', 'user-001');
      expect(alert.update).toHaveBeenCalledWith({ isRead: true });
    });

    it('should throw 403 if not own alert', async () => {
      mockCoachAlertFindByPk.mockResolvedValue(mockModelInstance({ id: 'alert-001', coachId: 'other-coach' }));
      await expect(svc.markAlertRead('alert-001', 'user-001')).rejects.toThrow('Forbidden');
    });

    it('should throw 404 if not found', async () => {
      mockCoachAlertFindByPk.mockResolvedValue(null);
      await expect(svc.markAlertRead('bad', 'user-001')).rejects.toThrow('Alert not found');
    });
  });
});
