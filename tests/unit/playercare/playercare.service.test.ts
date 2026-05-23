/// <reference types="jest" />
import { mockModelInstance, mockPlayer, mockReferral, mockInjury } from '../../setup/test-helpers';

// ── Model mock fns ──
const mockReferralFindAndCountAll = jest.fn();
const mockReferralFindByPk = jest.fn();
const mockReferralFindAll = jest.fn();
const mockReferralCreate = jest.fn();

const mockInjuryFindByPk = jest.fn();
const mockInjuryCount = jest.fn();
const mockInjuryCreate = jest.fn();
const mockInjuryDestroy = jest.fn();

const mockPlayerFindByPk = jest.fn();
const mockPlayerUpdate = jest.fn();

const mockUserFindByPk = jest.fn();

const mockSequelizeQuery = jest.fn();
const mockTransactionFn = jest.fn();

// ── rowScope mock fns ──
const mockBuildRowScope = jest.fn();
const mockMergeScope = jest.fn();
const mockCheckRowAccess = jest.fn();
const mockIsBypassRole = jest.fn();
const mockGetAssignedPlayerIds = jest.fn();

// ── Jest mocks (must precede static imports) ──

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: (...a: unknown[]) => mockSequelizeQuery(...a), authenticate: jest.fn() },
  transaction: (...a: unknown[]) => mockTransactionFn(...a),
}));

jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: {
    findAndCountAll: (...a: unknown[]) => mockReferralFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockReferralFindByPk(...a),
    findAll: (...a: unknown[]) => mockReferralFindAll(...a),
    create: (...a: unknown[]) => mockReferralCreate(...a),
    name: 'Referral',
  },
}));

jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: {
    findByPk: (...a: unknown[]) => mockInjuryFindByPk(...a),
    count: (...a: unknown[]) => mockInjuryCount(...a),
    create: (...a: unknown[]) => mockInjuryCreate(...a),
    destroy: (...a: unknown[]) => mockInjuryDestroy(...a),
    name: 'Injury',
  },
  InjuryUpdate: { name: 'InjuryUpdate' },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    update: (...a: unknown[]) => mockPlayerUpdate(...a),
    name: 'Player',
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findByPk: (...a: unknown[]) => mockUserFindByPk(...a),
    name: 'User',
  },
}));

jest.mock('../../../src/modules/tickets/ticket.model', () => ({
  Ticket: { name: 'Ticket' },
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

jest.mock('../../../src/shared/utils/rowScope', () => ({
  buildRowScope: (...a: unknown[]) => mockBuildRowScope(...a),
  mergeScope: (...a: unknown[]) => mockMergeScope(...a),
  checkRowAccess: (...a: unknown[]) => mockCheckRowAccess(...a),
  isBypassRole: (...a: unknown[]) => mockIsBypassRole(...a),
  getAssignedPlayerIds: (...a: unknown[]) => mockGetAssignedPlayerIds(...a),
}));

jest.mock('../../../src/shared/utils/pagination', () => ({
  buildMeta: jest.fn((total: number, page: number, limit: number) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as playcareService from '../../../src/modules/playercare/playercare.service';
import { AppError } from '../../../src/middleware/errorHandler';

// ── Helper factories ──

const mockInstance = (data: Record<string, unknown>) => ({
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue({ ...data }),
});

const baseQuery = { page: 1, limit: 10, sort: 'createdAt' as const, order: 'DESC' as const };

// A realistic referral (case) record
const makeCaseRecord = (overrides: Record<string, unknown> = {}) =>
  mockInstance({
    id: 'case-001',
    playerId: 'player-001',
    referralType: 'Medical',
    status: 'Open',
    priority: 'High',
    triggerDesc: 'ACL Tear — Knee',
    injuryId: null,
    assignedTo: null,
    createdAt: new Date(),
    ...overrides,
  });

// ─────────────────────────────────────────────
describe('Playercare Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Safe defaults
    mockBuildRowScope.mockResolvedValue(null);
    mockCheckRowAccess.mockResolvedValue(true);
    mockIsBypassRole.mockReturnValue(true);
    mockGetAssignedPlayerIds.mockResolvedValue([]);
    mockPlayerUpdate.mockResolvedValue([1]);
    mockInjuryCount.mockResolvedValue(0);
  });

  // ── listCases ─────────────────────────────
  describe('listCases', () => {
    it('should return paginated cases', async () => {
      const rows = [makeCaseRecord()];
      mockReferralFindAndCountAll.mockResolvedValue({ count: 1, rows });

      const result = await playcareService.listCases(baseQuery);

      expect(mockReferralFindAndCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should filter by category, status, and playerId', async () => {
      mockReferralFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await playcareService.listCases({
        ...baseQuery,
        category: 'Medical',
        status: 'Open',
        playerId: 'player-001',
      } as any);

      const callArg = mockReferralFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({
        referralType: 'Medical',
        status: 'Open',
        playerId: 'player-001',
      });
    });

    it('should apply row-scope when user is provided', async () => {
      const scope = { playerId: ['player-001'] };
      mockBuildRowScope.mockResolvedValue(scope);
      mockReferralFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const user = { id: 'user-001', role: 'Coach' } as any;
      await playcareService.listCases(baseQuery, user);

      expect(mockBuildRowScope).toHaveBeenCalledWith('referrals', user);
      expect(mockMergeScope).toHaveBeenCalledWith(expect.any(Object), scope);
    });

    it('should return empty list when no cases exist', async () => {
      mockReferralFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const result = await playcareService.listCases(baseQuery);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  // ── getCaseById ───────────────────────────
  describe('getCaseById', () => {
    it('should return case when found and access is allowed', async () => {
      const caseRecord = makeCaseRecord();
      mockReferralFindByPk.mockResolvedValue(caseRecord);

      const result = await playcareService.getCaseById('case-001');

      expect(mockReferralFindByPk).toHaveBeenCalledWith('case-001', expect.any(Object));
      expect(result).toBe(caseRecord);
    });

    it('should throw 404 when case is not found', async () => {
      mockReferralFindByPk.mockResolvedValue(null);

      await expect(playcareService.getCaseById('nonexistent')).rejects.toThrow('Case not found');
      await expect(playcareService.getCaseById('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when row access is denied', async () => {
      mockReferralFindByPk.mockResolvedValue(makeCaseRecord());
      mockCheckRowAccess.mockResolvedValue(false);

      await expect(playcareService.getCaseById('case-001', { id: 'user-002', role: 'Coach' } as any))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── createMedicalCase ─────────────────────
  describe('createMedicalCase', () => {
    const medicalInput = {
      playerId: 'player-001',
      injuryType: 'ACL Tear',
      injuryTypeAr: 'تمزق أربطة',
      bodyPart: 'Knee',
      bodyPartAr: 'الركبة',
      severity: 'Severe' as const,
      injuryDate: '2025-01-15',
      cause: 'Match',
    };

    it('should create injury and linked case inside a transaction', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockInstance(mockPlayer()));

      const injuryRecord = mockInstance({ ...mockInjury(), id: 'injury-001' });
      const caseRecord = makeCaseRecord({ injuryId: 'injury-001' });

      // transaction() calls the callback and returns its result
      mockTransactionFn.mockImplementation(async (cb: (t: unknown) => Promise<string>) => {
        mockInjuryCreate.mockResolvedValue(injuryRecord);
        mockReferralCreate.mockResolvedValue(caseRecord);
        const caseId = await cb({}); // pass dummy transaction object
        return caseId;
      });

      // getCaseById is called after transaction resolves; stub findByPk for that call
      mockReferralFindByPk.mockResolvedValue(caseRecord);

      const result = await playcareService.createMedicalCase(medicalInput as any, 'user-001');

      expect(mockPlayerFindByPk).toHaveBeenCalledWith('player-001');
      expect(mockInjuryCreate).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001', injuryType: 'ACL Tear' }),
        expect.objectContaining({ transaction: expect.anything() }),
      );
      expect(mockReferralCreate).toHaveBeenCalledWith(
        expect.objectContaining({ referralType: 'Medical', playerId: 'player-001' }),
        expect.objectContaining({ transaction: expect.anything() }),
      );
      expect(result).toBe(caseRecord);
    });

    it('should throw 404 when player is not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);

      await expect(playcareService.createMedicalCase(medicalInput as any, 'user-001'))
        .rejects.toMatchObject({ message: 'Player not found', statusCode: 404 });
    });
  });

  // ── updateCaseStatus ──────────────────────
  describe('updateCaseStatus', () => {
    it('should update status successfully', async () => {
      const caseRecord = makeCaseRecord({ status: 'Open', injuryId: null });
      mockReferralFindByPk.mockResolvedValueOnce(caseRecord); // updateCaseStatus
      mockReferralFindByPk.mockResolvedValueOnce(caseRecord); // inner getCaseById

      const result = await playcareService.updateCaseStatus('case-001', 'InProgress');

      expect(caseRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'InProgress' }),
      );
      expect(result).toBe(caseRecord);
    });

    it('should set closedAt when status is Closed', async () => {
      const caseRecord = makeCaseRecord({ status: 'Open', injuryId: null });
      mockReferralFindByPk.mockResolvedValue(caseRecord);

      await playcareService.updateCaseStatus('case-001', 'Closed', 'Resolved', undefined, 'Closure notes');

      expect(caseRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Closed', closedAt: expect.any(Date) }),
      );
    });

    it('should throw 404 when case is not found', async () => {
      mockReferralFindByPk.mockResolvedValue(null);

      await expect(playcareService.updateCaseStatus('bad', 'Closed'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when row access is denied', async () => {
      mockReferralFindByPk.mockResolvedValue(makeCaseRecord());
      mockCheckRowAccess.mockResolvedValue(false);

      await expect(playcareService.updateCaseStatus('case-001', 'Closed', undefined, undefined, undefined, { id: 'user-002', role: 'Coach' } as any))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('should sync injury to Recovered when case is Closed and injuryId exists', async () => {
      const injuryRecord = mockInstance({ ...mockInjury(), id: 'injury-001', status: 'UnderTreatment' });
      const caseRecord = makeCaseRecord({
        status: 'Open',
        injuryId: 'injury-001',
        playerId: 'player-001',
      });

      mockReferralFindByPk.mockResolvedValue(caseRecord);
      mockInjuryFindByPk.mockResolvedValue(injuryRecord);
      mockInjuryCount.mockResolvedValue(0); // no other active injuries
      // second findByPk call is for getCaseById at the end
      mockReferralFindByPk.mockResolvedValueOnce(caseRecord).mockResolvedValueOnce(caseRecord);

      await playcareService.updateCaseStatus('case-001', 'Closed');

      expect(injuryRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Recovered' }),
      );
      expect(mockPlayerUpdate).toHaveBeenCalledWith(
        { status: 'active' },
        expect.objectContaining({ where: { id: 'player-001' } }),
      );
    });
  });

  // ── getPlayerTimeline ─────────────────────
  describe('getPlayerTimeline', () => {
    it('should return timeline events for a player', async () => {
      const caseRow = {
        id: 'case-001',
        referralType: 'Medical',
        status: 'Open',
        priority: 'High',
        triggerDesc: 'ACL Tear — Knee',
        assignedTo: 'user-001',
        createdAt: new Date('2025-01-15'),
        injury: null,
      };
      mockReferralFindAll.mockResolvedValue([caseRow]);

      const result = await playcareService.getPlayerTimeline('player-001');

      expect(mockReferralFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ playerId: 'player-001' }) }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'case-001',
        caseType: 'Medical',
        status: 'Open',
        priority: 'High',
      });
    });

    it('should apply row scope for restricted users', async () => {
      const scope = { playerId: ['player-001'] };
      mockBuildRowScope.mockResolvedValue(scope);
      mockReferralFindAll.mockResolvedValue([]);

      const user = { id: 'user-001', role: 'Coach' } as any;
      await playcareService.getPlayerTimeline('player-001', user);

      expect(mockBuildRowScope).toHaveBeenCalledWith('referrals', user);
      expect(mockMergeScope).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'player-001' }),
        scope,
      );
    });

    it('should return empty array when no cases exist', async () => {
      mockReferralFindAll.mockResolvedValue([]);

      const result = await playcareService.getPlayerTimeline('player-999');

      expect(result).toEqual([]);
    });
  });

  // ── getCaseStats ──────────────────────────
  describe('getCaseStats', () => {
    it('should return org-wide stats for bypass roles', async () => {
      mockIsBypassRole.mockReturnValue(true);
      mockSequelizeQuery.mockResolvedValue([
        { referral_type: 'Medical', status: 'Open', count: '3' },
        { referral_type: 'Medical', status: 'Closed', count: '2' },
        { referral_type: 'Mental', status: 'Open', count: '1' },
      ]);

      const result = await playcareService.getCaseStats({ id: 'user-001', role: 'Admin' } as any);

      expect(result.total).toBe(6);
      expect(result.totalActive).toBe(4); // Open rows
      expect(result.totalMedical).toBe(5); // Medical rows
      expect(result.byTypeAndStatus).toHaveLength(3);
    });

    it('should return zero stats when assigned player list is empty (non-bypass)', async () => {
      mockIsBypassRole.mockReturnValue(false);
      mockGetAssignedPlayerIds.mockResolvedValue([]);

      const result = await playcareService.getCaseStats({ id: 'user-001', role: 'Coach' } as any);

      expect(result).toEqual({ byTypeAndStatus: [], totalActive: 0, totalMedical: 0, total: 0 });
      expect(mockSequelizeQuery).not.toHaveBeenCalled();
    });

    it('should query with player-id filter for non-bypass users', async () => {
      mockIsBypassRole.mockReturnValue(false);
      mockGetAssignedPlayerIds.mockResolvedValue(['player-001', 'player-002']);
      mockSequelizeQuery.mockResolvedValue([
        { referral_type: 'Medical', status: 'Open', count: '1' },
      ]);

      await playcareService.getCaseStats({ id: 'user-001', role: 'Coach' } as any);

      expect(mockSequelizeQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE player_id IN (:playerIds)'),
        expect.objectContaining({
          replacements: expect.objectContaining({ playerIds: ['player-001', 'player-002'] }),
        }),
      );
    });
  });
});
