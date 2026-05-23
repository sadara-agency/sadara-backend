/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies (hoisted before imports) ──

const mockReportFindAndCountAll = jest.fn();
const mockReportFindByPk = jest.fn();
const mockReportCreate = jest.fn();
const mockKpiFindAll = jest.fn();
const mockPlayerFindByPk = jest.fn();

jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

jest.mock('../../../src/modules/tactical/reports/tacticalReport.model', () => ({
  TacticalReport: {
    findAndCountAll: (...a: unknown[]) => mockReportFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockReportFindByPk(...a),
    create: (...a: unknown[]) => mockReportCreate(...a),
  },
}));

jest.mock('../../../src/modules/tactical/kpis/tacticalKpi.model', () => ({
  TacticalKpi: {
    findAll: (...a: unknown[]) => mockKpiFindAll(...a),
    name: 'TacticalKpi',
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    name: 'Player',
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

// The autoGenerateMonthlyReport uses require() for Match inside TacticalKpi.findAll include
jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { name: 'Match' },
}));

import * as reportService from '../../../src/modules/tactical/reports/tacticalReport.service';

// ── Fixtures ──

function mockReportData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-001',
    playerId: 'player-001',
    analystId: 'user-001',
    month: 3,
    year: 2025,
    title: 'Tactical Report — Test Player — March 2025',
    titleAr: 'تقرير تكتيكي — لاعب تجريبي — March 2025',
    summary: 'Auto-generated tactical analysis covering 5 match(es) in March 2025.',
    summaryAr: null,
    tacticalStrengths: ['Strong overall tactical score'],
    tacticalWeaknesses: [],
    recommendations: [],
    kpiSnapshot: { overallTacticalScore: 75 },
    matchesAnalyzed: 5,
    status: 'draft',
    filePath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════
describe('TacticalReport Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default safe return for findByPk (used internally by getTacticalReportById)
    mockReportFindByPk.mockResolvedValue(mockModelInstance(mockReportData()));
  });

  // ── listTacticalReports ───────────────────────────────
  describe('listTacticalReports', () => {
    it('should return paginated report records', async () => {
      const row = mockModelInstance(mockReportData());
      mockReportFindAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await reportService.listTacticalReports({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should pass playerId filter to query', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await reportService.listTacticalReports({ playerId: 'player-001', page: 1, limit: 10 });

      expect(mockReportFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ playerId: 'player-001' }),
        }),
      );
    });

    it('should pass analystId filter to query', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await reportService.listTacticalReports({ analystId: 'user-002', page: 1, limit: 10 });

      expect(mockReportFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ analystId: 'user-002' }),
        }),
      );
    });

    it('should pass status, month, and year filters to query', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await reportService.listTacticalReports({
        status: 'published',
        month: 3,
        year: 2025,
        page: 1,
        limit: 10,
      });

      expect(mockReportFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published', month: 3, year: 2025 }),
        }),
      );
    });

    it('should return empty list when no records exist', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await reportService.listTacticalReports({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  // ── getTacticalReportById ─────────────────────────────
  describe('getTacticalReportById', () => {
    it('should return a report by id', async () => {
      const report = mockModelInstance(mockReportData());
      mockReportFindByPk.mockResolvedValue(report);

      const result = await reportService.getTacticalReportById('report-001');

      expect(result).toBeDefined();
      expect(mockReportFindByPk).toHaveBeenCalledWith('report-001', expect.any(Object));
    });

    it('should throw 404 when report not found', async () => {
      mockReportFindByPk.mockResolvedValue(null);

      await expect(reportService.getTacticalReportById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Tactical report not found',
      });
    });
  });

  // ── createTacticalReport ──────────────────────────────
  describe('createTacticalReport', () => {
    it('should create a new report and return it with includes', async () => {
      const created = mockModelInstance(mockReportData({ id: 'report-new' }));
      mockReportCreate.mockResolvedValue(created);
      mockReportFindByPk.mockResolvedValue(created);

      const result = await reportService.createTacticalReport(
        {
          playerId: 'player-001',
          month: 3,
          year: 2025,
          title: 'March 2025 Tactical Report',
        },
        'user-001',
      );

      expect(mockReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001', month: 3, year: 2025 }),
      );
      expect(result).toBeDefined();
    });

    it('should default analystId to userId when not provided', async () => {
      const created = mockModelInstance(mockReportData());
      mockReportCreate.mockResolvedValue(created);
      mockReportFindByPk.mockResolvedValue(created);

      await reportService.createTacticalReport(
        { playerId: 'player-001', month: 4, year: 2025, title: 'April Report' },
        'user-999',
      );

      expect(mockReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({ analystId: 'user-999' }),
      );
    });
  });

  // ── updateTacticalReport ──────────────────────────────
  describe('updateTacticalReport', () => {
    it('should update an existing report', async () => {
      const report = mockModelInstance(mockReportData());
      mockReportFindByPk
        .mockResolvedValueOnce(report) // first call in updateTacticalReport (no includes)
        .mockResolvedValue(report);     // second call in getTacticalReportById

      const result = await reportService.updateTacticalReport('report-001', {
        summary: 'Updated summary',
      });

      expect(report.update).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Updated summary' }),
      );
    });

    it('should throw 404 when updating non-existent report', async () => {
      mockReportFindByPk.mockResolvedValue(null);

      await expect(
        reportService.updateTacticalReport('nonexistent', { summary: 'x' }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Tactical report not found' });
    });
  });

  // ── deleteTacticalReport ──────────────────────────────
  describe('deleteTacticalReport', () => {
    it('should delete an existing report and return its id', async () => {
      const report = mockModelInstance(mockReportData());
      mockReportFindByPk.mockResolvedValue(report);

      const result = await reportService.deleteTacticalReport('report-001');

      expect(report.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'report-001' });
    });

    it('should throw 404 when deleting non-existent report', async () => {
      mockReportFindByPk.mockResolvedValue(null);

      await expect(reportService.deleteTacticalReport('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── publishTacticalReport ─────────────────────────────
  describe('publishTacticalReport', () => {
    it('should publish a draft report', async () => {
      const report = mockModelInstance(mockReportData({ status: 'draft' }));
      mockReportFindByPk
        .mockResolvedValueOnce(report) // first call (no includes)
        .mockResolvedValue(report);     // second call in getTacticalReportById

      const result = await reportService.publishTacticalReport('report-001');

      expect(report.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' }),
      );
    });

    it('should throw 409 when report is already published', async () => {
      const report = mockModelInstance(mockReportData({ status: 'published' }));
      mockReportFindByPk.mockResolvedValue(report);

      await expect(reportService.publishTacticalReport('report-001')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Report is already published',
      });
    });

    it('should throw 404 when report not found', async () => {
      mockReportFindByPk.mockResolvedValue(null);

      await expect(reportService.publishTacticalReport('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
