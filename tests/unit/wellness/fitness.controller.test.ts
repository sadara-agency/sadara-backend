/// <reference types="jest" />
jest.mock('../../../src/modules/wellness/fitness.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Coach', userRole: 'GymCoach' }),
}));
jest.mock('../../../src/shared/utils/cache', () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: 'wellness', DASHBOARD: 'dash' },
}));

import * as controller from '../../../src/modules/wellness/fitness.controller';
import * as fitSvc from '../../../src/modules/wellness/fitness.service';

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

describe('Fitness Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ══════════════════════════════════════════
  // EXERCISES
  // ══════════════════════════════════════════

  describe('listExercises', () => {
    it('should return paginated exercises', async () => {
      (fitSvc.listExercises as jest.Mock).mockResolvedValue({
        data: [{ id: 'e1' }], meta: { total: 1, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.listExercises(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getExercise', () => {
    it('should return exercise', async () => {
      (fitSvc.getExercise as jest.Mock).mockResolvedValue({ id: 'e1', name: 'Bench' });
      const res = mockRes();
      await controller.getExercise(mockReq({ params: { id: 'e1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createExercise', () => {
    it('should create and return 201', async () => {
      (fitSvc.createExercise as jest.Mock).mockResolvedValue({ id: 'e1', name: 'Squat' });
      const res = mockRes();
      await controller.createExercise(
        mockReq({ body: { name: 'Squat', muscleGroup: 'quads' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateExercise', () => {
    it('should update exercise', async () => {
      (fitSvc.updateExercise as jest.Mock).mockResolvedValue({ id: 'e1', name: 'Updated' });
      const res = mockRes();
      await controller.updateExercise(
        mockReq({ params: { id: 'e1' }, body: { name: 'Updated' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteExercise', () => {
    it('should deactivate exercise', async () => {
      (fitSvc.deleteExercise as jest.Mock).mockResolvedValue(undefined);
      const res = mockRes();
      await controller.deleteExercise(mockReq({ params: { id: 'e1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ══════════════════════════════════════════
  // TEMPLATES
  // ══════════════════════════════════════════

  describe('listTemplates', () => {
    it('should return templates', async () => {
      (fitSvc.listTemplates as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.listTemplates(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createTemplate', () => {
    it('should create template', async () => {
      (fitSvc.createTemplate as jest.Mock).mockResolvedValue({ id: 't1', name: 'Push Day' });
      const res = mockRes();
      await controller.createTemplate(
        mockReq({ body: { name: 'Push Day', exercises: [{ exerciseId: 'e1', orderIndex: 0 }] } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      (fitSvc.updateTemplate as jest.Mock).mockResolvedValue({ id: 't1' });
      const res = mockRes();
      await controller.updateTemplate(
        mockReq({ params: { id: 't1' }, body: { name: 'Updated' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ══════════════════════════════════════════
  // ASSIGNMENTS
  // ══════════════════════════════════════════

  describe('listAssignments', () => {
    it('should return assignments', async () => {
      (fitSvc.listAssignments as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.listAssignments(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createAssignment', () => {
    it('should create assignment', async () => {
      (fitSvc.createAssignment as jest.Mock).mockResolvedValue({ id: 'a1' });
      const res = mockRes();
      await controller.createAssignment(
        mockReq({ body: { playerId: 'p1', templateId: 't1', assignedDate: '2026-03-23' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAssignment', () => {
    it('should return assignment detail', async () => {
      (fitSvc.getAssignment as jest.Mock).mockResolvedValue({
        id: 'a1',
      });
      const res = mockRes();
      await controller.getAssignment(mockReq({ params: { id: 'a1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('completeAssignment', () => {
    it('should mark assignment complete', async () => {
      (fitSvc.completeAssignment as jest.Mock).mockResolvedValue({ id: 'a1', status: 'completed' });
      const res = mockRes();
      await controller.completeAssignment(
        mockReq({ params: { assignmentId: 'a1' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ══════════════════════════════════════════
  // PLAYER SELF-SERVICE
  // ══════════════════════════════════════════

  describe('myWorkouts', () => {
    it('should return player workouts', async () => {
      (fitSvc.getPlayerWorkouts as jest.Mock).mockResolvedValue({
        data: [], meta: { total: 0, page: 1, limit: 20 },
      });
      const res = mockRes();
      await controller.myWorkouts(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(fitSvc.getPlayerWorkouts).toHaveBeenCalledWith('player-001', {});
    });

    it('should handle missing playerId', async () => {
      const res = mockRes();
      await controller.myWorkouts(
        mockReq({ user: { id: 'u1', role: 'Player', playerId: null } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('myCompleteWorkout', () => {
    it('should complete own assignment', async () => {
      (fitSvc.getAssignment as jest.Mock).mockResolvedValue({ playerId: 'player-001' });
      (fitSvc.completeAssignment as jest.Mock).mockResolvedValue({ id: 'a1', status: 'completed' });
      const res = mockRes();
      await controller.myCompleteWorkout(
        mockReq({ params: { assignmentId: 'a1' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if no playerId', async () => {
      const res = mockRes();
      await controller.myCompleteWorkout(
        mockReq({
          user: { id: 'u1', role: 'Player', playerId: null },
          params: { assignmentId: 'a1' },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
