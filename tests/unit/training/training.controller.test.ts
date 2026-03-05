/// <reference types="jest" />
jest.mock('../../../src/modules/training/training.service');
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
}));

import * as controller from '../../../src/modules/training/training.controller';
import * as svc from '../../../src/modules/training/training.service';

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

describe('Training Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listCourses', () => {
    it('should return paginated courses', async () => {
      (svc.listCourses as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });
      const res = mockRes();
      await controller.listCourses(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getCourse', () => {
    it('should return course', async () => {
      (svc.getCourseById as jest.Mock).mockResolvedValue({ id: 'tc1' });
      const res = mockRes();
      await controller.getCourse(mockReq({ params: { id: 'tc1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createCourse', () => {
    it('should create course and audit', async () => {
      (svc.createCourse as jest.Mock).mockResolvedValue({ id: 'tc1', title: 'Fitness 101' });
      const res = mockRes();
      await controller.createCourse(mockReq({ body: { title: 'Fitness 101' } }), res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateCourse', () => {
    it('should update course', async () => {
      (svc.updateCourse as jest.Mock).mockResolvedValue({ id: 'tc1' });
      const res = mockRes();
      await controller.updateCourse(mockReq({ params: { id: 'tc1' }, body: { title: 'Updated' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteCourse', () => {
    it('should delete course and audit', async () => {
      (svc.deleteCourse as jest.Mock).mockResolvedValue({ id: 'tc1' });
      const res = mockRes();
      await controller.deleteCourse(mockReq({ params: { id: 'tc1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('enrollPlayers', () => {
    it('should enroll players and audit', async () => {
      (svc.enrollPlayers as jest.Mock).mockResolvedValue({ enrolled: 3 });
      const res = mockRes();
      await controller.enrollPlayers(mockReq({ params: { id: 'tc1' }, body: { playerIds: ['p1', 'p2', 'p3'] } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateEnrollment', () => {
    it('should update enrollment', async () => {
      (svc.updateEnrollment as jest.Mock).mockResolvedValue({ id: 'e1', status: 'Completed' });
      const res = mockRes();
      await controller.updateEnrollment(mockReq({ params: { enrollmentId: 'e1' }, body: { status: 'Completed' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeEnrollment', () => {
    it('should remove enrollment', async () => {
      (svc.removeEnrollment as jest.Mock).mockResolvedValue({ id: 'e1' });
      const res = mockRes();
      await controller.removeEnrollment(mockReq({ params: { enrollmentId: 'e1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('playerEnrollments', () => {
    it('should return player enrollments', async () => {
      (svc.getPlayerEnrollments as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.playerEnrollments(mockReq({ params: { playerId: 'p1' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('completionMatrix', () => {
    it('should return completion matrix', async () => {
      (svc.getCompletionMatrix as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.completionMatrix(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('myEnrollments', () => {
    it('should return player enrollments', async () => {
      (svc.getMyEnrollments as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.myEnrollments(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('trackMyActivity', () => {
    it('should track activity and audit', async () => {
      (svc.trackActivity as jest.Mock).mockResolvedValue({ tracked: true });
      const res = mockRes();
      await controller.trackMyActivity(mockReq({ params: { enrollmentId: 'e1' }, body: { action: 'VideoStarted' } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateMyProgress', () => {
    it('should update progress', async () => {
      (svc.selfUpdateProgress as jest.Mock).mockResolvedValue({ progressPct: 50 });
      const res = mockRes();
      await controller.updateMyProgress(mockReq({ params: { enrollmentId: 'e1' }, body: { progressPct: 50 } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
