/// <reference types="jest" />
import { mockTrainingCourse, mockTrainingEnrollment, mockModelInstance } from '../../setup/test-helpers';

const mockCourseFindAndCountAll = jest.fn();
const mockCourseFindByPk = jest.fn();
const mockCourseFindAll = jest.fn();
const mockCourseCreate = jest.fn();

const mockEnrollmentFindByPk = jest.fn();
const mockEnrollmentFindAll = jest.fn();
const mockEnrollmentBulkCreate = jest.fn();

const mockActivityCreate = jest.fn();

const mockPlayerFindByPk = jest.fn();
const mockPlayerFindAll = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/training/training.model', () => ({
  TrainingCourse: {
    findAndCountAll: (...a: unknown[]) => mockCourseFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockCourseFindByPk(...a),
    findAll: (...a: unknown[]) => mockCourseFindAll(...a),
    create: (...a: unknown[]) => mockCourseCreate(...a),
  },
  TrainingEnrollment: {
    findByPk: (...a: unknown[]) => mockEnrollmentFindByPk(...a),
    findAll: (...a: unknown[]) => mockEnrollmentFindAll(...a),
    bulkCreate: (...a: unknown[]) => mockEnrollmentBulkCreate(...a),
  },
  TrainingActivity: {
    create: (...a: unknown[]) => mockActivityCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    findAll: (...a: unknown[]) => mockPlayerFindAll(...a),
    name: 'Player',
  },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as trainingService from '../../../src/modules/training/training.service';

describe('Training Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ── COURSES ──

  describe('listCourses', () => {
    it('should return paginated courses', async () => {
      mockCourseFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockTrainingCourse())] });
      const result = await trainingService.listCourses({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by category', async () => {
      mockCourseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await trainingService.listCourses({ category: 'Fitness', page: 1, limit: 10 });
      expect(mockCourseFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by isActive', async () => {
      mockCourseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await trainingService.listCourses({ isActive: 'true', page: 1, limit: 10 });
      expect(mockCourseFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockCourseFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await trainingService.listCourses({ search: 'Nutrition', page: 1, limit: 10 });
      expect(mockCourseFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getCourseById', () => {
    it('should return course with enrollments', async () => {
      mockCourseFindByPk.mockResolvedValue(mockModelInstance(mockTrainingCourse()));
      const result = await trainingService.getCourseById('course-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockCourseFindByPk.mockResolvedValue(null);
      await expect(trainingService.getCourseById('bad')).rejects.toThrow('Course not found');
    });
  });

  describe('createCourse', () => {
    it('should create course', async () => {
      mockCourseCreate.mockResolvedValue(mockModelInstance(mockTrainingCourse()));
      const result = await trainingService.createCourse({ title: 'Fitness Basics', contentType: 'Video' } as any, 'user-001');
      expect(result).toBeDefined();
    });
  });

  describe('updateCourse', () => {
    it('should update course', async () => {
      const course = mockModelInstance(mockTrainingCourse());
      mockCourseFindByPk.mockResolvedValue(course);
      await trainingService.updateCourse('course-001', { title: 'Updated' } as any);
      expect(course.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockCourseFindByPk.mockResolvedValue(null);
      await expect(trainingService.updateCourse('bad', {} as any)).rejects.toThrow('Course not found');
    });
  });

  describe('deleteCourse', () => {
    it('should delete course', async () => {
      const course = mockModelInstance(mockTrainingCourse());
      mockCourseFindByPk.mockResolvedValue(course);
      const result = await trainingService.deleteCourse('course-001');
      expect(course.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'course-001' });
    });

    it('should throw 404 if not found', async () => {
      mockCourseFindByPk.mockResolvedValue(null);
      await expect(trainingService.deleteCourse('bad')).rejects.toThrow('Course not found');
    });
  });

  // ── ENROLLMENTS ──

  describe('enrollPlayers', () => {
    it('should enroll players in course', async () => {
      mockCourseFindByPk.mockResolvedValue(mockModelInstance(mockTrainingCourse()));
      mockPlayerFindAll.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      mockEnrollmentBulkCreate.mockResolvedValue([{}, {}]);
      // getCourseById refetch
      mockCourseFindByPk.mockResolvedValue(mockModelInstance(mockTrainingCourse()));
      const result = await trainingService.enrollPlayers('course-001', ['p1', 'p2'], 'user-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if course not found', async () => {
      mockCourseFindByPk.mockResolvedValue(null);
      await expect(trainingService.enrollPlayers('bad', ['p1'], 'user-001')).rejects.toThrow('Course not found');
    });

    it('should throw 404 if some players not found', async () => {
      mockCourseFindByPk.mockResolvedValue(mockModelInstance(mockTrainingCourse()));
      mockPlayerFindAll.mockResolvedValue([{ id: 'p1' }]); // only 1 of 2
      await expect(trainingService.enrollPlayers('course-001', ['p1', 'p2'], 'user-001')).rejects.toThrow('Some players not found');
    });
  });

  describe('updateEnrollment', () => {
    it('should update enrollment', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment());
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      await trainingService.updateEnrollment('enr-001', { status: 'InProgress' } as any);
      expect(enrollment.update).toHaveBeenCalled();
    });

    it('should set completedAt when status is Completed', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment());
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      await trainingService.updateEnrollment('enr-001', { status: 'Completed' } as any);
      expect(enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ completedAt: expect.any(Date), progressPct: 100 }));
    });

    it('should throw 404 if not found', async () => {
      mockEnrollmentFindByPk.mockResolvedValue(null);
      await expect(trainingService.updateEnrollment('bad', {} as any)).rejects.toThrow('Enrollment not found');
    });
  });

  describe('removeEnrollment', () => {
    it('should remove enrollment', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment());
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      const result = await trainingService.removeEnrollment('enr-001');
      expect(enrollment.destroy).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockEnrollmentFindByPk.mockResolvedValue(null);
      await expect(trainingService.removeEnrollment('bad')).rejects.toThrow('Enrollment not found');
    });
  });

  describe('getPlayerEnrollments', () => {
    it('should return player enrollments', async () => {
      mockEnrollmentFindAll.mockResolvedValue([mockModelInstance(mockTrainingEnrollment())]);
      const result = await trainingService.getPlayerEnrollments('player-001');
      expect(result).toHaveLength(1);
    });
  });

  // ── PLAYER SELF-SERVICE ──

  describe('getMyEnrollments', () => {
    it('should return player enrollments with course data', async () => {
      mockEnrollmentFindAll.mockResolvedValue([mockModelInstance(mockTrainingEnrollment())]);
      const result = await trainingService.getMyEnrollments('player-001');
      expect(result).toHaveLength(1);
    });

    it('should throw 403 if no playerId', async () => {
      await expect(trainingService.getMyEnrollments('')).rejects.toThrow('Player account not linked');
    });
  });

  describe('trackActivity', () => {
    it('should track activity and auto-start enrollment', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment({ status: 'NotStarted', playerId: 'player-001', courseId: 'course-001' })) as any;
      enrollment.reload = jest.fn().mockResolvedValue(enrollment);
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      mockActivityCreate.mockResolvedValue({ id: 'act-001' });
      const result = await trainingService.trackActivity('enr-001', 'player-001', { action: 'Clicked' } as any);
      expect(result).toHaveProperty('activity');
      expect(enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'InProgress' }));
    });

    it('should auto-complete on VideoCompleted', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment({ status: 'InProgress', playerId: 'player-001', courseId: 'course-001' })) as any;
      enrollment.reload = jest.fn().mockResolvedValue(enrollment);
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      mockActivityCreate.mockResolvedValue({ id: 'act-001' });
      const result = await trainingService.trackActivity('enr-001', 'player-001', { action: 'VideoCompleted' } as any);
      expect(enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed', progressPct: 100 }));
    });

    it('should throw 403 if not own enrollment', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment({ playerId: 'other-player' }));
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      await expect(trainingService.trackActivity('enr-001', 'player-001', { action: 'Clicked' } as any)).rejects.toThrow('Forbidden');
    });

    it('should throw 404 if enrollment not found', async () => {
      mockEnrollmentFindByPk.mockResolvedValue(null);
      await expect(trainingService.trackActivity('bad', 'player-001', { action: 'Clicked' } as any)).rejects.toThrow('Enrollment not found');
    });
  });

  describe('selfUpdateProgress', () => {
    it('should update progress and auto-start', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment({ status: 'NotStarted', playerId: 'player-001' }));
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      await trainingService.selfUpdateProgress('enr-001', 'player-001', { progressPct: 50 } as any);
      expect(enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ progressPct: 50, status: 'InProgress' }));
    });

    it('should auto-complete at 100%', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment({ status: 'InProgress', playerId: 'player-001' }));
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      await trainingService.selfUpdateProgress('enr-001', 'player-001', { progressPct: 100 } as any);
      expect(enrollment.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed' }));
    });

    it('should throw 403 if not own enrollment', async () => {
      const enrollment = mockModelInstance(mockTrainingEnrollment({ playerId: 'other' }));
      mockEnrollmentFindByPk.mockResolvedValue(enrollment);
      await expect(trainingService.selfUpdateProgress('enr-001', 'player-001', { progressPct: 50 } as any)).rejects.toThrow('Forbidden');
    });

    it('should throw 404 if not found', async () => {
      mockEnrollmentFindByPk.mockResolvedValue(null);
      await expect(trainingService.selfUpdateProgress('bad', 'player-001', {} as any)).rejects.toThrow('Enrollment not found');
    });
  });

  // ── COMPLETION MATRIX ──

  describe('getCompletionMatrix', () => {
    it('should return courses and player completions', async () => {
      mockCourseFindAll.mockResolvedValue([mockModelInstance(mockTrainingCourse())]);
      mockEnrollmentFindAll.mockResolvedValue([]);
      const result = await trainingService.getCompletionMatrix({});
      expect(result).toHaveProperty('courses');
      expect(result).toHaveProperty('players');
    });
  });
});
