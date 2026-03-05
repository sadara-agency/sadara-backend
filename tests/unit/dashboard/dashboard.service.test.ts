/// <reference types="jest" />

// Dashboard service uses raw SQL only
jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as dashboardService from '../../../src/modules/dashboard/dashboard.service';
const { sequelize } = require('../../../src/config/database');

describe('Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getKpis', () => {
    it('should return KPI data', async () => {
      sequelize.query.mockResolvedValue([{
        total_players: 50, active_contracts: 30, total_revenue: 1000000,
        outstanding_amount: 200000, active_injuries: 5,
      }]);

      const result = await dashboardService.getKpis();

      expect(result).toBeDefined();
      expect(sequelize.query).toHaveBeenCalled();
    });

    it('should return empty object on query failure', async () => {
      sequelize.query.mockResolvedValue([]);

      const result = await dashboardService.getKpis();

      expect(result).toBeDefined();
    });
  });

  describe('getAlerts', () => {
    it('should return all alert categories', async () => {
      sequelize.query
        .mockResolvedValueOnce([]) // expiring contracts
        .mockResolvedValueOnce([]) // overdue payments
        .mockResolvedValueOnce([]) // injury conflicts
        .mockResolvedValueOnce([]); // open referrals

      const result = await dashboardService.getAlerts();

      expect(result).toHaveProperty('expiringContracts');
      expect(result).toHaveProperty('overduePayments');
      expect(result).toHaveProperty('injuryConflicts');
      expect(result).toHaveProperty('openReferrals');
    });
  });

  describe('getTodayOverview', () => {
    it('should return today matches, tasks, payments', async () => {
      sequelize.query
        .mockResolvedValueOnce([]) // matches
        .mockResolvedValueOnce([]) // tasks
        .mockResolvedValueOnce([]); // payments

      const result = await dashboardService.getTodayOverview();

      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('payments');
    });
  });

  describe('getTopPlayers', () => {
    it('should return top players', async () => {
      sequelize.query.mockResolvedValue([
        { id: 'p1', firstName: 'Salem', lastName: 'Al-Dawsari', position: 'FW' },
      ]);

      const result = await dashboardService.getTopPlayers(5);

      expect(result).toHaveLength(1);
    });
  });

  describe('getContractStatusDistribution', () => {
    it('should return distribution', async () => {
      sequelize.query.mockResolvedValue([{ status: 'Active', count: 20 }]);

      const result = await dashboardService.getContractStatusDistribution();

      expect(result).toHaveLength(1);
    });
  });

  describe('getPlayerDistribution', () => {
    it('should return player type distribution', async () => {
      sequelize.query.mockResolvedValue([{ player_type: 'Pro', count: 40 }]);

      const result = await dashboardService.getPlayerDistribution();

      expect(result).toHaveLength(1);
    });
  });

  describe('getRecentOffers', () => {
    it('should return recent offers', async () => {
      sequelize.query.mockResolvedValue([]);

      const result = await dashboardService.getRecentOffers(5);

      expect(result).toEqual([]);
    });
  });

  describe('getUpcomingMatches', () => {
    it('should return upcoming matches', async () => {
      sequelize.query.mockResolvedValue([]);

      const result = await dashboardService.getUpcomingMatches(5);

      expect(result).toEqual([]);
    });
  });

  describe('getUrgentTasks', () => {
    it('should return urgent tasks', async () => {
      sequelize.query.mockResolvedValue([
        { id: 't1', title: 'Urgent', priority: 'Critical', status: 'Open' },
      ]);

      const result = await dashboardService.getUrgentTasks(5);

      expect(result).toHaveLength(1);
    });
  });

  describe('getRevenueChart', () => {
    it('should return monthly revenue', async () => {
      sequelize.query.mockResolvedValue([{ month: '2025-01', revenue: 50000 }]);

      const result = await dashboardService.getRevenueChart(12);

      expect(result).toHaveLength(1);
    });
  });

  describe('getPerformanceAverages', () => {
    it('should return averages', async () => {
      sequelize.query.mockResolvedValue([{ avgRating: 7.2, avgGoals: 0.5 }]);

      const result = await dashboardService.getPerformanceAverages();

      expect(result).toBeDefined();
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent audit activity', async () => {
      sequelize.query.mockResolvedValue([]);

      const result = await dashboardService.getRecentActivity(10);

      expect(result).toEqual([]);
    });
  });

  describe('getQuickStats', () => {
    it('should return quick stats', async () => {
      sequelize.query.mockResolvedValue([{
        completedGates: 10, activeReferrals: 5, watchlistCount: 8, taskCompletionRate: 75,
      }]);

      const result = await dashboardService.getQuickStats();

      expect(result).toBeDefined();
    });
  });

  describe('getOfferPipeline', () => {
    it('should return offer pipeline', async () => {
      sequelize.query.mockResolvedValue([{ status: 'New', count: 5 }]);

      const result = await dashboardService.getOfferPipeline();

      expect(result).toHaveLength(1);
    });
  });

  describe('getInjuryTrends', () => {
    it('should return pivoted injury trends', async () => {
      sequelize.query.mockResolvedValue([
        { month: '2025-01', severity: 'Minor', cnt: '3' },
      ]);

      const result = await dashboardService.getInjuryTrends(6);

      expect(result).toBeDefined();
    });
  });

  describe('getKpiTrends', () => {
    it('should return sparkline data', async () => {
      sequelize.query
        .mockResolvedValueOnce([{ month: '2025-01', cnt: '5' }])
        .mockResolvedValueOnce([{ month: '2025-01', cnt: '3' }])
        .mockResolvedValueOnce([{ month: '2025-01', total: '50000' }])
        .mockResolvedValueOnce([{ month: '2025-01', cnt: '1' }])
        .mockResolvedValueOnce([{ month: '2025-01', cnt: '10' }])
        .mockResolvedValueOnce([{ month: '2025-01', cnt: '4' }]);

      const result = await dashboardService.getKpiTrends(6);

      expect(result).toHaveProperty('players');
      expect(result).toHaveProperty('contracts');
      expect(result).toHaveProperty('revenue');
    });
  });

  describe('getFullDashboard', () => {
    it('should aggregate all dashboard data', async () => {
      // Mock all queries to return defaults
      sequelize.query.mockResolvedValue([]);

      const result = await dashboardService.getFullDashboard();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('alerts');
    });

    it('should handle individual query failures gracefully', async () => {
      sequelize.query.mockRejectedValue(new Error('DB error'));

      const result = await dashboardService.getFullDashboard();

      // Should not throw — returns safe defaults
      expect(result).toBeDefined();
    });
  });
});
