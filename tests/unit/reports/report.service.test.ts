/// <reference types="jest" />
import { mockReport, mockModelInstance } from '../../setup/test-helpers';

const mockReportFindAndCountAll = jest.fn();
const mockReportFindByPk = jest.fn();
const mockReportCreate = jest.fn();
const mockSequelizeQuery = jest.fn();
const mockPlayerFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: (...a: unknown[]) => mockSequelizeQuery(...a), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/reports/report.model', () => ({
  TechnicalReport: {
    findAndCountAll: (...a: unknown[]) => mockReportFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockReportFindByPk(...a),
    create: (...a: unknown[]) => mockReportCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));
jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { name: 'Club' },
}));
jest.mock('../../../src/modules/reports/report.pdf', () => ({
  generateReportPdf: jest.fn().mockResolvedValue('/reports/report-001.pdf'),
}));
jest.mock('../../../src/modules/reports/reportAutoTasks', () => ({
  generateReportFailedTask: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as reportService from '../../../src/modules/reports/report.service';

describe('Report Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listReports', () => {
    it('should return paginated reports', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockReport())] });
      const result = await reportService.listReports({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by playerId', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await reportService.listReports({ playerId: 'player-001', page: 1, limit: 10 });
      expect(mockReportFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockReportFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await reportService.listReports({ status: 'Generated', page: 1, limit: 10 });
      expect(mockReportFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getReportById', () => {
    it('should return report', async () => {
      mockReportFindByPk.mockResolvedValue(mockModelInstance(mockReport()));
      const result = await reportService.getReportById('report-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockReportFindByPk.mockResolvedValue(null);
      await expect(reportService.getReportById('bad')).rejects.toThrow('Report not found');
    });
  });

  describe('createReport', () => {
    it('should create report and generate PDF', async () => {
      const player = mockModelInstance({ id: 'player-001', firstName: 'Ahmed' });
      mockPlayerFindByPk.mockResolvedValue(player);
      const report = mockModelInstance(mockReport());
      mockReportCreate.mockResolvedValue(report);
      mockReportFindByPk.mockResolvedValue(report);
      mockSequelizeQuery.mockResolvedValue([{ id: 'player-001' }]);

      const result = await reportService.createReport(
        { playerId: 'player-001', title: 'Test Report', periodType: 'Season', periodParams: { season: '2024-2025' } } as any,
        'user-001',
      );
      expect(result).toBeDefined();
      expect(mockReportCreate).toHaveBeenCalled();
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(reportService.createReport(
        { playerId: 'bad', title: 'Test', periodType: 'Season', periodParams: {} } as any,
        'user-001',
      )).rejects.toThrow('Player not found');
    });

    it('should handle PDF generation failure gracefully', async () => {
      const player = mockModelInstance({ id: 'player-001', firstName: 'Ahmed' });
      mockPlayerFindByPk.mockResolvedValue(player);
      const report = mockModelInstance(mockReport());
      mockReportCreate.mockResolvedValue(report);
      mockReportFindByPk.mockResolvedValue(report);
      mockSequelizeQuery.mockRejectedValueOnce(new Error('DB error'));

      const result = await reportService.createReport(
        { playerId: 'player-001', title: 'Test', periodType: 'Season', periodParams: { season: '2024-2025' } } as any,
        'user-001',
      );
      expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Failed' }));
    });
  });

  describe('deleteReport', () => {
    it('should delete report', async () => {
      const report = mockModelInstance(mockReport());
      mockReportFindByPk.mockResolvedValue(report);
      const result = await reportService.deleteReport('report-001');
      expect(report.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'report-001' });
    });

    it('should throw 404 if not found', async () => {
      mockReportFindByPk.mockResolvedValue(null);
      await expect(reportService.deleteReport('bad')).rejects.toThrow('Report not found');
    });
  });

  describe('gatherReportData', () => {
    it('should gather profile, stats, matches, and injuries', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'player-001', first_name: 'Ahmed' }])
        .mockResolvedValueOnce([{ matches_played: 10, total_goals: 5 }])
        .mockResolvedValueOnce([{ match_date: '2024-01-01', goals: 2 }])
        .mockResolvedValueOnce([{ injury_type: 'Muscle Strain' }]);

      const result = await reportService.gatherReportData('player-001', 'Season', { season: '2024-2025' });
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('statsAgg');
      expect(result).toHaveProperty('matchList');
      expect(result).toHaveProperty('injuries');
    });
  });

  describe('getPlayerPortfolioReport', () => {
    it('should return player portfolio data', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'p1', first_name: 'Ahmed' }])
        .mockResolvedValueOnce([{ total_players: 10, professional: 8 }]);
      const result = await reportService.getPlayerPortfolioReport({});
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('players');
    });

    it('should filter by playerId', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'p1' }])
        .mockResolvedValueOnce([{ total_players: 1 }]);
      const result = await reportService.getPlayerPortfolioReport({ playerId: 'p1' });
      expect(result.players).toHaveLength(1);
    });
  });

  describe('getContractCommissionReport', () => {
    it('should return contract commission data', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'c1', title: 'Contract A' }])
        .mockResolvedValueOnce([{ active_contracts: 5, total_expected_commission: 100000 }]);
      const result = await reportService.getContractCommissionReport({});
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('contracts');
    });
  });

  describe('getInjurySummaryReport', () => {
    it('should return injury summary data', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ body_part: 'Knee', count: 3 }])
        .mockResolvedValueOnce([{ severity: 'High', count: 2 }])
        .mockResolvedValueOnce([{ total_injuries: 10, active_injuries: 3 }]);
      const result = await reportService.getInjurySummaryReport({});
      expect(result).toHaveProperty('byBodyPart');
      expect(result).toHaveProperty('bySeverity');
      expect(result).toHaveProperty('summary');
    });
  });

  describe('getMatchTasksReport', () => {
    it('should return match tasks data', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'm1', match_date: '2024-01-01' }])
        .mockResolvedValueOnce([{ total_matches: 5, upcoming: 2 }]);
      const result = await reportService.getMatchTasksReport({});
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('matches');
    });
  });

  describe('getFinancialSummaryReport', () => {
    it('should return financial overview', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ total_market_value: 5000000 }])
        .mockResolvedValueOnce([{ id: 'p1', market_value: 1000000 }]);
      const result = await reportService.getFinancialSummaryReport({});
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('topPlayers');
    });
  });

  describe('getScoutingPipelineReport', () => {
    it('should return scouting pipeline data', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'w1', prospect_name: 'Prospect A' }])
        .mockResolvedValueOnce([{ total_watchlist: 10, shortlisted: 5 }]);
      const result = await reportService.getScoutingPipelineReport({});
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('prospects');
    });
  });

  describe('getExpiringContractsReport', () => {
    it('should return expiring contracts data', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([{ id: 'c1', days_remaining: 30 }])
        .mockResolvedValueOnce([{ expiring_30: 2, expiring_60: 5, expiring_90: 8 }]);
      const result = await reportService.getExpiringContractsReport({});
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('contracts');
    });

    it('should respect custom expiry window', async () => {
      mockSequelizeQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ expiring_30: 0 }]);
      const result = await reportService.getExpiringContractsReport({ expiryWindow: 30 });
      expect(result).toBeDefined();
    });
  });
});
