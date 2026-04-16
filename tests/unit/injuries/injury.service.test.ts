/// <reference types="jest" />
import { mockInjury, mockPlayer, mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindAll = jest.fn();
const mockInjuryCreate = jest.fn();
const mockInjuryCount = jest.fn();
const mockUpdateCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockPlayerUpdate = jest.fn();
const mockMatchFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
  transaction: async (cb: any) => cb({ LOCK: { UPDATE: 'UPDATE' } }),
}));

jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    findAll: (...a: unknown[]) => mockFindAll(...a),
    create: (...a: unknown[]) => mockInjuryCreate(...a),
    count: (...a: unknown[]) => mockInjuryCount(...a),
  },
  InjuryUpdate: {
    create: (...a: unknown[]) => mockUpdateCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    update: (...a: unknown[]) => mockPlayerUpdate(...a),
  },
}));

jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: {
    findByPk: (...a: unknown[]) => mockMatchFindByPk(...a),
  },
}));

jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/modules/injuries/injuryAutoTasks', () => ({
  generateCriticalInjuryTask: jest.fn().mockResolvedValue(null),
  checkInjuryReturnOverdue: jest.fn().mockResolvedValue(undefined),
  checkInjuryTreatmentStale: jest.fn().mockResolvedValue(undefined),
  generateInjuryUpdateMediaTask: jest.fn().mockResolvedValue(null),
  generateReturnFromInjuryMediaTask: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/modules/injuries/injuryAutoReferral', () => ({
  generateAutoReferralForInjury: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    name: 'Referral',
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/shared/utils/displayId', () => ({
  generateDisplayId: jest.fn().mockResolvedValue('INJ-26-0001'),
}));

import * as injuryService from '../../../src/modules/injuries/injury.service';

describe('Injury Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LIST INJURIES
  // ════════════════════════════════════════════════════════
  describe('listInjuries', () => {
    it('should return paginated injuries', async () => {
      mockFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(mockInjury())],
      });

      const result = await injuryService.listInjuries({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by severity', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await injuryService.listInjuries({ severity: 'Severe', page: 1, limit: 10 });

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where).toBeDefined();
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await injuryService.listInjuries({ status: 'UnderTreatment', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by playerId', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await injuryService.listInjuries({ playerId: 'player-001', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // GET INJURY BY ID
  // ════════════════════════════════════════════════════════
  describe('getInjuryById', () => {
    it('should return injury with includes', async () => {
      const injury = mockModelInstance(mockInjury());
      mockFindByPk.mockResolvedValue(injury);

      const result = await injuryService.getInjuryById('injury-001');

      expect(result).toBeDefined();
      expect(mockFindByPk).toHaveBeenCalledWith('injury-001', expect.anything());
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(injuryService.getInjuryById('nonexistent')).rejects.toThrow('Injury not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // GET PLAYER INJURIES
  // ════════════════════════════════════════════════════════
  describe('getPlayerInjuries', () => {
    it('should return injuries for player', async () => {
      mockFindAll.mockResolvedValue([mockModelInstance(mockInjury())]);

      const result = await injuryService.getPlayerInjuries('player-001');

      expect(result).toHaveLength(1);
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE INJURY
  // ════════════════════════════════════════════════════════
  describe('createInjury', () => {
    it('should create injury and update player status', async () => {
      const player = mockModelInstance(mockPlayer());
      mockPlayerFindByPk.mockResolvedValue(player);
      const created = mockModelInstance(mockInjury());
      mockInjuryCreate.mockResolvedValue(created);
      mockFindByPk.mockResolvedValue(created);

      const result = await injuryService.createInjury(
        {
          playerId: 'player-001',
          injuryType: 'ACL Tear',
          bodyPart: 'Knee',
          injuryDate: '2025-01-15',
          severity: 'Severe',
        } as any,
        'user-001',
      );

      expect(result).toBeDefined();
      expect(mockInjuryCreate).toHaveBeenCalled();
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);

      await expect(
        injuryService.createInjury(
          { playerId: 'nonexistent', injuryType: 'Sprain', bodyPart: 'Ankle', injuryDate: '2025-01-15' } as any,
          'user-001',
        ),
      ).rejects.toThrow('Player not found');
    });

    it('should throw 404 if match not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(
        injuryService.createInjury(
          { playerId: 'player-001', matchId: 'bad-match', injuryType: 'Sprain', bodyPart: 'Ankle', injuryDate: '2025-01-15' } as any,
          'user-001',
        ),
      ).rejects.toThrow('Match not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE INJURY
  // ════════════════════════════════════════════════════════
  describe('updateInjury', () => {
    it('should update injury fields', async () => {
      const injury = mockModelInstance(mockInjury());
      mockFindByPk.mockResolvedValue(injury);

      const result = await injuryService.updateInjury('injury-001', { diagnosis: 'Updated diagnosis' } as any);

      expect(result).toBeDefined();
      expect(injury.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        injuryService.updateInjury('nonexistent', { diagnosis: 'x' } as any),
      ).rejects.toThrow('Injury not found');
    });

    it('should recover player when no other active injuries', async () => {
      const injury = mockModelInstance(mockInjury({ status: 'UnderTreatment' }));
      mockFindByPk.mockResolvedValue(injury);
      mockInjuryCount.mockResolvedValue(0);
      mockPlayerUpdate.mockResolvedValue([1]);

      await injuryService.updateInjury('injury-001', {
        status: 'Recovered',
        actualReturnDate: '2025-03-01',
      } as any);

      expect(injury.update).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // ADD INJURY UPDATE
  // ════════════════════════════════════════════════════════
  describe('addInjuryUpdate', () => {
    it('should add update to existing injury', async () => {
      const injury = mockModelInstance(mockInjury());
      mockFindByPk.mockResolvedValue(injury);
      mockUpdateCreate.mockResolvedValue({ id: 'update-001', notes: 'Improving' });

      const result = await injuryService.addInjuryUpdate(
        'injury-001',
        { notes: 'Improving' } as any,
        'user-001',
      );

      expect(result).toBeDefined();
      expect(mockUpdateCreate).toHaveBeenCalled();
    });

    it('should throw 404 if injury not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        injuryService.addInjuryUpdate('nonexistent', { notes: 'x' } as any, 'user-001'),
      ).rejects.toThrow('Injury not found');
    });

    it('should update injury status when provided', async () => {
      const injury = mockModelInstance(mockInjury({ status: 'UnderTreatment' }));
      mockFindByPk.mockResolvedValue(injury);
      mockUpdateCreate.mockResolvedValue({ id: 'update-001' });
      mockInjuryCount.mockResolvedValue(0);
      mockPlayerUpdate.mockResolvedValue([1]);

      await injuryService.addInjuryUpdate(
        'injury-001',
        { status: 'Recovered', notes: 'Fully recovered' } as any,
        'user-001',
      );

      expect(injury.update).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE INJURY
  // ════════════════════════════════════════════════════════
  describe('deleteInjury', () => {
    it('should delete injury', async () => {
      const injury = mockModelInstance(mockInjury());
      mockFindByPk.mockResolvedValue(injury);

      const result = await injuryService.deleteInjury('injury-001');

      expect(injury.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'injury-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(injuryService.deleteInjury('nonexistent')).rejects.toThrow('Injury not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // INJURY STATS
  // ════════════════════════════════════════════════════════
  describe('getInjuryStats', () => {
    it('should return injury statistics', async () => {
      mockInjuryCount
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(4)  // active
        .mockResolvedValueOnce(5); // recovered

      const result = await injuryService.getInjuryStats();

      expect(result).toEqual({
        total: 10,
        active: 4,
        recovered: 5,
        chronic: 1,
      });
    });
  });
});
