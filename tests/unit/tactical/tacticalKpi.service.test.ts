/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies (hoisted before imports) ──

const mockKpiFindAndCountAll = jest.fn();
const mockKpiFindByPk = jest.fn();
const mockKpiFindOne = jest.fn();
const mockKpiCreate = jest.fn();
const mockKpiFindAll = jest.fn();
const mockSequelizeQuery = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: (...a: unknown[]) => mockSequelizeQuery(...a) },
}));

jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

jest.mock('../../../src/modules/tactical/kpis/tacticalKpi.model', () => ({
  TacticalKpi: {
    findAndCountAll: (...a: unknown[]) => mockKpiFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockKpiFindByPk(...a),
    findOne: (...a: unknown[]) => mockKpiFindOne(...a),
    create: (...a: unknown[]) => mockKpiCreate(...a),
    findAll: (...a: unknown[]) => mockKpiFindAll(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { name: 'Player' },
}));

jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { name: 'Match' },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/modules/video/video.model', () => ({
  VideoClip: { findAll: jest.fn() },
  VideoTag: { name: 'VideoTag' },
}));

import * as kpiService from '../../../src/modules/tactical/kpis/tacticalKpi.service';

// ── Fixtures ──

function mockKpiData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kpi-001',
    playerId: 'player-001',
    matchId: 'match-001',
    pressIntensity: 6.5,
    defensiveContributionPct: 70,
    progressivePassRate: 80,
    chancesCreatedPer90: 2.1,
    xgContribution: 1.25,
    territorialControl: 55,
    counterPressSuccess: 60,
    buildUpInvolvement: 45,
    overallTacticalScore: 72,
    computedBy: 'system',
    computedAt: new Date(),
    rawData: {},
    createdBy: 'user-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════
describe('TacticalKpi Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default safe return for findByPk used by getTacticalKpiById (called internally)
    mockKpiFindByPk.mockResolvedValue(mockModelInstance(mockKpiData()));
  });

  // ── listTacticalKpis ─────────────────────────────────
  describe('listTacticalKpis', () => {
    it('should return paginated KPI records', async () => {
      const row = mockModelInstance(mockKpiData());
      mockKpiFindAndCountAll.mockResolvedValue({ rows: [row], count: 1 });

      const result = await kpiService.listTacticalKpis({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should pass playerId filter to query', async () => {
      mockKpiFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await kpiService.listTacticalKpis({ playerId: 'player-001', page: 1, limit: 10 });

      expect(mockKpiFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ playerId: 'player-001' }),
        }),
      );
    });

    it('should pass matchId filter to query', async () => {
      mockKpiFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await kpiService.listTacticalKpis({ matchId: 'match-002', page: 1, limit: 5 });

      expect(mockKpiFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ matchId: 'match-002' }),
        }),
      );
    });

    it('should return empty list when no records exist', async () => {
      mockKpiFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await kpiService.listTacticalKpis({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  // ── getTacticalKpiById ────────────────────────────────
  describe('getTacticalKpiById', () => {
    it('should return KPI record by id', async () => {
      const kpi = mockModelInstance(mockKpiData());
      mockKpiFindByPk.mockResolvedValue(kpi);

      const result = await kpiService.getTacticalKpiById('kpi-001');

      expect(result).toBeDefined();
      expect(mockKpiFindByPk).toHaveBeenCalledWith('kpi-001', expect.any(Object));
    });

    it('should throw 404 when KPI record not found', async () => {
      mockKpiFindByPk.mockResolvedValue(null);

      await expect(kpiService.getTacticalKpiById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Tactical KPI record not found',
      });
    });
  });

  // ── getTacticalKpiByMatch ─────────────────────────────
  describe('getTacticalKpiByMatch', () => {
    it('should return KPI for player/match combination', async () => {
      const kpi = mockModelInstance(mockKpiData());
      mockKpiFindOne.mockResolvedValue(kpi);

      const result = await kpiService.getTacticalKpiByMatch('player-001', 'match-001');

      expect(result).toBeDefined();
      expect(mockKpiFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { playerId: 'player-001', matchId: 'match-001' },
        }),
      );
    });

    it('should return null when no KPI exists for player/match', async () => {
      mockKpiFindOne.mockResolvedValue(null);

      const result = await kpiService.getTacticalKpiByMatch('player-999', 'match-999');

      expect(result).toBeNull();
    });
  });

  // ── createTacticalKpi ─────────────────────────────────
  describe('createTacticalKpi', () => {
    const createInput = {
      playerId: 'player-001',
      matchId: 'match-001',
      computedBy: 'manual' as const,
    };

    it('should create a new KPI record when none exists', async () => {
      mockKpiFindOne.mockResolvedValue(null); // no duplicate
      const created = mockModelInstance(mockKpiData({ id: 'kpi-new' }));
      mockKpiCreate.mockResolvedValue(created);
      // getTacticalKpiById is called after create
      mockKpiFindByPk.mockResolvedValue(created);

      const result = await kpiService.createTacticalKpi(createInput, 'user-001');

      expect(mockKpiCreate).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001', matchId: 'match-001' }),
      );
      expect(result).toBeDefined();
    });

    it('should throw 409 when KPI already exists for player/match', async () => {
      mockKpiFindOne.mockResolvedValue(mockModelInstance(mockKpiData()));

      await expect(
        kpiService.createTacticalKpi(createInput, 'user-001'),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ── updateTacticalKpi ─────────────────────────────────
  describe('updateTacticalKpi', () => {
    it('should update an existing KPI record', async () => {
      const kpi = mockModelInstance(mockKpiData());
      // findByPk in updateTacticalKpi (not include version)
      mockKpiFindByPk
        .mockResolvedValueOnce(kpi)  // first call in updateTacticalKpi (no include)
        .mockResolvedValue(kpi);      // second call in getTacticalKpiById

      const result = await kpiService.updateTacticalKpi('kpi-001', { pressIntensity: 8.5 });

      expect(kpi.update).toHaveBeenCalledWith(
        expect.objectContaining({ pressIntensity: 8.5 }),
      );
    });

    it('should throw 404 when updating non-existent KPI', async () => {
      mockKpiFindByPk.mockResolvedValue(null);

      await expect(
        kpiService.updateTacticalKpi('nonexistent', { pressIntensity: 5 }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Tactical KPI record not found' });
    });
  });

  // ── deleteTacticalKpi ─────────────────────────────────
  describe('deleteTacticalKpi', () => {
    it('should delete an existing KPI record and return its id', async () => {
      const kpi = mockModelInstance(mockKpiData());
      mockKpiFindByPk.mockResolvedValue(kpi);

      const result = await kpiService.deleteTacticalKpi('kpi-001');

      expect(kpi.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'kpi-001' });
    });

    it('should throw 404 when deleting non-existent KPI', async () => {
      mockKpiFindByPk.mockResolvedValue(null);

      await expect(kpiService.deleteTacticalKpi('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── computeTacticalKpis ───────────────────────────────
  describe('computeTacticalKpis', () => {
    const statsRow = {
      minutes_played: '90',
      goals: '2',
      assists: '1',
      shots_total: '5',
      passes_total: '50',
      passes_completed: '40',
      tackles_total: '4',
      interceptions: '3',
      duels_won: '8',
      duels_total: '12',
      dribbles_completed: '3',
      dribbles_attempted: '5',
      key_passes: '4',
    };

    it('should compute KPIs from match stats and create a new record', async () => {
      mockSequelizeQuery.mockResolvedValue([statsRow]);
      mockKpiFindOne.mockResolvedValue(null); // no existing record
      const created = mockModelInstance(mockKpiData({ id: 'kpi-computed' }));
      mockKpiCreate.mockResolvedValue(created);
      mockKpiFindByPk.mockResolvedValue(created);

      const result = await kpiService.computeTacticalKpis('player-001', 'match-001', 'user-001');

      expect(mockSequelizeQuery).toHaveBeenCalled();
      expect(mockKpiCreate).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001', matchId: 'match-001' }),
      );
    });

    it('should update existing record when KPI already exists', async () => {
      mockSequelizeQuery.mockResolvedValue([statsRow]);
      const existing = mockModelInstance(mockKpiData());
      mockKpiFindOne.mockResolvedValue(existing);
      mockKpiFindByPk.mockResolvedValue(existing);

      await kpiService.computeTacticalKpis('player-001', 'match-001', 'user-001');

      expect(existing.update).toHaveBeenCalled();
      expect(mockKpiCreate).not.toHaveBeenCalled();
    });

    it('should throw 404 when no match stats found', async () => {
      mockSequelizeQuery.mockResolvedValue([]); // empty result

      await expect(
        kpiService.computeTacticalKpis('player-999', 'match-999', 'user-001'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── getPlayerTacticalTrend ────────────────────────────
  describe('getPlayerTacticalTrend', () => {
    it('should return trend records in chronological order (reversed)', async () => {
      const rows = [
        mockModelInstance(mockKpiData({ id: 'kpi-2', createdAt: '2025-02-01T00:00:00Z' })),
        mockModelInstance(mockKpiData({ id: 'kpi-1', createdAt: '2025-01-01T00:00:00Z' })),
      ];
      mockKpiFindAll.mockResolvedValue(rows);

      const result = await kpiService.getPlayerTacticalTrend('player-001', 10);

      // The service calls .reverse() on the result
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
    });

    it('should use default lastN of 10', async () => {
      mockKpiFindAll.mockResolvedValue([]);

      await kpiService.getPlayerTacticalTrend('player-001');

      expect(mockKpiFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });
  });
});
