/// <reference types="jest" />
import { mockReferral, mockModelInstance } from '../../setup/test-helpers';

const mockReferralFindAndCountAll = jest.fn();
const mockReferralFindByPk = jest.fn();
const mockReferralCreate = jest.fn();

const mockPlayerFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: {
    findAndCountAll: (...a: unknown[]) => mockReferralFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockReferralFindByPk(...a),
    create: (...a: unknown[]) => mockReferralCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));
jest.mock('../../../src/modules/users/user.model', () => ({
  User: { findByPk: (...a: unknown[]) => mockUserFindByPk(...a), name: 'User' },
}));
jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: { findByPk: jest.fn(), findAll: jest.fn(), name: 'Injury' },
}));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyByRole: jest.fn().mockResolvedValue(0),
  notifyUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../../src/modules/referrals/referralAutoTasks', () => ({
  generateCriticalReferralTask: jest.fn().mockResolvedValue(null),
  checkReferralOverdue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as referralService from '../../../src/modules/referrals/referral.service';

describe('Referral Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listReferrals', () => {
    it('should return paginated referrals for Admin', async () => {
      mockReferralFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockReferral())] });
      const result = await referralService.listReferrals({ page: 1, limit: 10 }, 'user-001', 'Admin');
      expect(result.data).toHaveLength(1);
    });

    it('should apply access filter for non-Admin', async () => {
      mockReferralFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await referralService.listReferrals({ page: 1, limit: 10 }, 'user-002', 'Analyst');
      expect(mockReferralFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockReferralFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await referralService.listReferrals({ status: 'Open', page: 1, limit: 10 }, 'user-001', 'Admin');
      expect(mockReferralFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockReferralFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await referralService.listReferrals({ search: 'injury', page: 1, limit: 10 }, 'user-001', 'Admin');
      expect(mockReferralFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getReferralById', () => {
    it('should return referral for Admin', async () => {
      mockReferralFindByPk.mockResolvedValue(mockModelInstance(mockReferral({ isRestricted: false })));
      const result = await referralService.getReferralById('ref-001', 'user-001', 'Admin');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockReferralFindByPk.mockResolvedValue(null);
      await expect(referralService.getReferralById('bad', 'user-001', 'Admin')).rejects.toThrow('Referral not found');
    });

    it('should throw 403 for restricted referral if non-admin not allowed', async () => {
      const ref = mockModelInstance(mockReferral({ isRestricted: true, restrictedTo: ['user-003'], assignedTo: 'user-003', createdBy: 'user-003' }));
      mockReferralFindByPk.mockResolvedValue(ref);
      await expect(referralService.getReferralById('ref-001', 'user-002', 'Analyst')).rejects.toThrow('Access denied');
    });

    it('should allow restricted access for assigned user', async () => {
      const ref = mockModelInstance(mockReferral({ isRestricted: true, restrictedTo: [], assignedTo: 'user-002', createdBy: 'user-003' }));
      mockReferralFindByPk.mockResolvedValue(ref);
      const result = await referralService.getReferralById('ref-001', 'user-002', 'Analyst');
      expect(result).toBeDefined();
    });
  });

  describe('createReferral', () => {
    it('should create referral', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001', firstName: 'Ahmed', lastName: 'Ali' }));
      mockReferralCreate.mockResolvedValue(mockModelInstance(mockReferral()));
      mockReferralFindByPk.mockResolvedValue(mockModelInstance(mockReferral()));
      const result = await referralService.createReferral({ playerId: 'player-001', referralType: 'Medical', triggerDesc: 'Injury follow-up' }, 'user-001');
      expect(result).toBeDefined();
    });

    it('should auto-restrict Mental referrals', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001', firstName: 'Ahmed', lastName: 'Ali' }));
      const input = { playerId: 'player-001', referralType: 'Mental', triggerDesc: 'Assessment' };
      mockReferralCreate.mockResolvedValue(mockModelInstance(mockReferral()));
      mockReferralFindByPk.mockResolvedValue(mockModelInstance(mockReferral()));
      await referralService.createReferral(input, 'user-001');
      expect(mockReferralCreate).toHaveBeenCalledWith(expect.objectContaining({ isRestricted: true }));
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(referralService.createReferral({ playerId: 'bad' }, 'user-001')).rejects.toThrow('Player not found');
    });

    it('should throw 404 if assigned user not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001', firstName: 'Ahmed', lastName: 'Ali' }));
      mockUserFindByPk.mockResolvedValue(null);
      await expect(referralService.createReferral({ playerId: 'player-001', assignedTo: 'bad' }, 'user-001')).rejects.toThrow('Assigned user not found');
    });
  });

  describe('updateReferral', () => {
    it('should update referral', async () => {
      const ref = mockModelInstance(mockReferral({ status: 'Open', isRestricted: false }));
      mockReferralFindByPk.mockResolvedValue(ref);
      await referralService.updateReferral('ref-001', { notes: 'Updated' }, 'user-001', 'Admin');
      expect(ref.update).toHaveBeenCalled();
    });

    it('should throw 400 if resolved', async () => {
      const ref = mockModelInstance(mockReferral({ status: 'Resolved', isRestricted: false }));
      mockReferralFindByPk.mockResolvedValue(ref);
      await expect(referralService.updateReferral('ref-001', {}, 'user-001', 'Admin')).rejects.toThrow('Cannot modify a resolved referral');
    });
  });

  describe('updateReferralStatus', () => {
    it('should update status', async () => {
      const ref = mockModelInstance(mockReferral({ status: 'Open', isRestricted: false }));
      mockReferralFindByPk.mockResolvedValue(ref);
      await referralService.updateReferralStatus('ref-001', { status: 'InProgress' }, 'user-001', 'Admin');
      expect(ref.update).toHaveBeenCalled();
    });

    it('should set resolvedAt when Resolved', async () => {
      const ref = mockModelInstance(mockReferral({ status: 'InProgress', isRestricted: false }));
      mockReferralFindByPk.mockResolvedValue(ref);
      await referralService.updateReferralStatus('ref-001', { status: 'Resolved' }, 'user-001', 'Admin');
      expect(ref.update).toHaveBeenCalledWith(expect.objectContaining({ resolvedAt: expect.any(Date) }));
    });
  });

  describe('deleteReferral', () => {
    it('should delete referral', async () => {
      const ref = mockModelInstance(mockReferral({ status: 'Open', isRestricted: false }));
      mockReferralFindByPk.mockResolvedValue(ref);
      const result = await referralService.deleteReferral('ref-001', 'user-001', 'Admin');
      expect(ref.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'ref-001' });
    });

    it('should throw 400 if resolved', async () => {
      const ref = mockModelInstance(mockReferral({ status: 'Resolved', isRestricted: false }));
      mockReferralFindByPk.mockResolvedValue(ref);
      await expect(referralService.deleteReferral('ref-001', 'user-001', 'Admin')).rejects.toThrow('Cannot delete a resolved referral');
    });
  });
});
