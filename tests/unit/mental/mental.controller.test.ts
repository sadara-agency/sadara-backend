/// <reference types="jest" />
jest.mock('../../../src/modules/mental/mental.service');
jest.mock('../../../src/shared/utils/cache', () => ({
  invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
  CachePrefix: {
    MENTAL: 'mental',
    MENTAL_TEMPLATES: 'mental-templates',
  },
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({ userId: 'u1', userName: 'Admin', userRole: 'Admin' }),
  buildChanges: jest.fn().mockReturnValue(null),
}));

import * as controller from '../../../src/modules/mental/mental.controller';
import * as svc from '../../../src/modules/mental/mental.service';

const mockReq = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  user: { id: 'user-001', fullName: 'Admin', role: 'Admin' },
  ip: '127.0.0.1',
  ...overrides,
}) as any;

const mockRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res as any;
};

const mockNext = jest.fn();

describe('Mental Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNext.mockReset();
  });

  // ── Templates ──

  describe('listTemplates', () => {
    it('returns all templates with 200', async () => {
      (svc.listTemplates as jest.Mock).mockResolvedValue([{ id: 't1', name: 'GAD-7' }]);
      const res = mockRes();
      await controller.listTemplates(mockReq(), res, mockNext);
      expect(svc.listTemplates).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('filters by active=true when query param provided', async () => {
      (svc.listTemplates as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.listTemplates(mockReq({ query: { active: 'true' } }), res, mockNext);
      expect(svc.listTemplates).toHaveBeenCalledWith(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('DB error');
      (svc.listTemplates as jest.Mock).mockRejectedValue(err);
      await controller.listTemplates(mockReq(), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('getTemplate', () => {
    it('returns a single template with 200', async () => {
      (svc.getTemplateById as jest.Mock).mockResolvedValue({ id: 't1', name: 'GAD-7' });
      const res = mockRes();
      await controller.getTemplate(mockReq({ params: { id: 't1' } }), res, mockNext);
      expect(svc.getTemplateById).toHaveBeenCalledWith('t1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) when template not found', async () => {
      const err = new Error('Template not found');
      (svc.getTemplateById as jest.Mock).mockRejectedValue(err);
      await controller.getTemplate(mockReq({ params: { id: 'missing' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('createTemplate', () => {
    it('creates template and returns 201', async () => {
      const created = { id: 't1', name: 'PHQ-9' };
      (svc.createTemplate as jest.Mock).mockResolvedValue(created);
      const res = mockRes();
      const body = { name: 'PHQ-9', questions: [] };
      await controller.createTemplate(mockReq({ body }), res, mockNext);
      expect(svc.createTemplate).toHaveBeenCalledWith(body, 'user-001');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Validation error');
      (svc.createTemplate as jest.Mock).mockRejectedValue(err);
      await controller.createTemplate(mockReq({ body: {} }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('updateTemplate', () => {
    it('updates template and returns 200', async () => {
      const updated = { id: 't1', name: 'PHQ-9 Updated' };
      (svc.updateTemplate as jest.Mock).mockResolvedValue(updated);
      const res = mockRes();
      const body = { name: 'PHQ-9 Updated' };
      await controller.updateTemplate(mockReq({ params: { id: 't1' }, body }), res, mockNext);
      expect(svc.updateTemplate).toHaveBeenCalledWith('t1', body);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Not found');
      (svc.updateTemplate as jest.Mock).mockRejectedValue(err);
      await controller.updateTemplate(mockReq({ params: { id: 't1' }, body: {} }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template and returns 200', async () => {
      (svc.deleteTemplate as jest.Mock).mockResolvedValue({ id: 't1' });
      const res = mockRes();
      await controller.deleteTemplate(mockReq({ params: { id: 't1' } }), res, mockNext);
      expect(svc.deleteTemplate).toHaveBeenCalledWith('t1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Not found');
      (svc.deleteTemplate as jest.Mock).mockRejectedValue(err);
      await controller.deleteTemplate(mockReq({ params: { id: 't1' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── Assessments ──

  describe('listAssessments', () => {
    it('returns paginated assessments with 200', async () => {
      (svc.listAssessments as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      const res = mockRes();
      await controller.listAssessments(mockReq({ query: { page: '1', limit: '20' } }), res, mockNext);
      expect(svc.listAssessments).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('DB error');
      (svc.listAssessments as jest.Mock).mockRejectedValue(err);
      await controller.listAssessments(mockReq(), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('getAssessment', () => {
    it('returns a single assessment with 200', async () => {
      (svc.getAssessmentById as jest.Mock).mockResolvedValue({ id: 'a1', score: 14 });
      const res = mockRes();
      await controller.getAssessment(mockReq({ params: { id: 'a1' } }), res, mockNext);
      expect(svc.getAssessmentById).toHaveBeenCalledWith('a1', expect.objectContaining({ id: 'user-001' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) when assessment not found', async () => {
      const err = new Error('Not found');
      (svc.getAssessmentById as jest.Mock).mockRejectedValue(err);
      await controller.getAssessment(mockReq({ params: { id: 'missing' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('createAssessment', () => {
    it('creates assessment and returns 201', async () => {
      const created = { id: 'a1', score: 10 };
      (svc.createAssessment as jest.Mock).mockResolvedValue(created);
      const res = mockRes();
      const body = { playerId: 'p1', templateId: 't1', responses: [] };
      await controller.createAssessment(mockReq({ body }), res, mockNext);
      expect(svc.createAssessment).toHaveBeenCalledWith(body, 'user-001');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Invalid payload');
      (svc.createAssessment as jest.Mock).mockRejectedValue(err);
      await controller.createAssessment(mockReq({ body: {} }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('updateAssessment', () => {
    it('updates assessment and returns 200', async () => {
      const updated = { id: 'a1', score: 12 };
      (svc.updateAssessment as jest.Mock).mockResolvedValue(updated);
      const res = mockRes();
      const body = { notes: 'Improving' };
      await controller.updateAssessment(mockReq({ params: { id: 'a1' }, body }), res, mockNext);
      expect(svc.updateAssessment).toHaveBeenCalledWith('a1', body, expect.objectContaining({ id: 'user-001' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Forbidden');
      (svc.updateAssessment as jest.Mock).mockRejectedValue(err);
      await controller.updateAssessment(mockReq({ params: { id: 'a1' }, body: {} }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('deleteAssessment', () => {
    it('deletes assessment and returns 200', async () => {
      (svc.deleteAssessment as jest.Mock).mockResolvedValue({ id: 'a1' });
      const res = mockRes();
      await controller.deleteAssessment(mockReq({ params: { id: 'a1' } }), res, mockNext);
      expect(svc.deleteAssessment).toHaveBeenCalledWith('a1', expect.objectContaining({ id: 'user-001' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Not found');
      (svc.deleteAssessment as jest.Mock).mockRejectedValue(err);
      await controller.deleteAssessment(mockReq({ params: { id: 'a1' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── Analytics ──

  describe('getTrend', () => {
    it('returns trend data for player with 200', async () => {
      (svc.getTrendForPlayer as jest.Mock).mockResolvedValue([{ date: '2025-01-01', score: 8 }]);
      const res = mockRes();
      await controller.getTrend(mockReq({ params: { playerId: 'p1' }, query: { limit: '5' } }), res, mockNext);
      expect(svc.getTrendForPlayer).toHaveBeenCalledWith('p1', expect.objectContaining({ id: 'user-001' }), 5);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('defaults limit to 10 when not provided', async () => {
      (svc.getTrendForPlayer as jest.Mock).mockResolvedValue([]);
      const res = mockRes();
      await controller.getTrend(mockReq({ params: { playerId: 'p1' } }), res, mockNext);
      expect(svc.getTrendForPlayer).toHaveBeenCalledWith('p1', expect.anything(), 10);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Forbidden');
      (svc.getTrendForPlayer as jest.Mock).mockRejectedValue(err);
      await controller.getTrend(mockReq({ params: { playerId: 'p1' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('getAlerts', () => {
    it('returns alerts with 200', async () => {
      (svc.getAlerts as jest.Mock).mockResolvedValue([{ playerId: 'p1', severity: 'High' }]);
      const res = mockRes();
      await controller.getAlerts(mockReq(), res, mockNext);
      expect(svc.getAlerts).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-001' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next(error) on service failure', async () => {
      const err = new Error('Forbidden');
      (svc.getAlerts as jest.Mock).mockRejectedValue(err);
      await controller.getAlerts(mockReq(), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
