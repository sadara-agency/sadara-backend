/// <reference types="jest" />
import { mockWatchlist, mockScreeningCase, mockModelInstance } from '../../setup/test-helpers';

const mockWatchlistFindAndCountAll = jest.fn();
const mockWatchlistFindByPk = jest.fn();
const mockWatchlistCreate = jest.fn();
const mockWatchlistCount = jest.fn();

const mockScreeningFindByPk = jest.fn();
const mockScreeningFindOne = jest.fn();
const mockScreeningCreate = jest.fn();
const mockScreeningCount = jest.fn();

const mockDecisionFindByPk = jest.fn();
const mockDecisionCreate = jest.fn();
const mockDecisionCount = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
  },
}));

jest.mock('../../../src/modules/scouting/scouting.model', () => ({
  Watchlist: {
    findAndCountAll: (...a: unknown[]) => mockWatchlistFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockWatchlistFindByPk(...a),
    create: (...a: unknown[]) => mockWatchlistCreate(...a),
    count: (...a: unknown[]) => mockWatchlistCount(...a),
  },
  ScreeningCase: {
    findByPk: (...a: unknown[]) => mockScreeningFindByPk(...a),
    findOne: (...a: unknown[]) => mockScreeningFindOne(...a),
    create: (...a: unknown[]) => mockScreeningCreate(...a),
    count: (...a: unknown[]) => mockScreeningCount(...a),
  },
  SelectionDecision: {
    findByPk: (...a: unknown[]) => mockDecisionFindByPk(...a),
    create: (...a: unknown[]) => mockDecisionCreate(...a),
    count: (...a: unknown[]) => mockDecisionCount(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    create: jest.fn(),
    findByPk: jest.fn(),
    name: 'Player',
  },
}));

jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: {
    update: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({ User: { name: 'User' } }));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyByRole: jest.fn().mockResolvedValue(0),
}));
const mockCreateAgencyDraft = jest.fn();
jest.mock('../../../src/modules/contracts/contract.service', () => ({
  createAgencyRepresentationDraft: (...a: unknown[]) => mockCreateAgencyDraft(...a),
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as scoutingService from '../../../src/modules/scouting/scouting.service';
import { sequelize } from '../../../src/config/database';

describe('Scouting Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ── WATCHLIST ──

  describe('listWatchlist', () => {
    it('should return paginated watchlist', async () => {
      mockWatchlistFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockWatchlist())] });
      const result = await scoutingService.listWatchlist({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockWatchlistFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await scoutingService.listWatchlist({ status: 'Active', page: 1, limit: 10 });
      expect(mockWatchlistFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by priority', async () => {
      mockWatchlistFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await scoutingService.listWatchlist({ priority: 'High', page: 1, limit: 10 });
      expect(mockWatchlistFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockWatchlistFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await scoutingService.listWatchlist({ search: 'Ahmed', page: 1, limit: 10 });
      expect(mockWatchlistFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getWatchlistById', () => {
    it('should return watchlist entry', async () => {
      mockWatchlistFindByPk.mockResolvedValue(mockModelInstance(mockWatchlist()));
      const result = await scoutingService.getWatchlistById('wl-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockWatchlistFindByPk.mockResolvedValue(null);
      await expect(scoutingService.getWatchlistById('bad')).rejects.toThrow('Watchlist entry not found');
    });
  });

  describe('createWatchlist', () => {
    it('should create watchlist entry', async () => {
      mockWatchlistCreate.mockResolvedValue(mockModelInstance(mockWatchlist()));
      const result = await scoutingService.createWatchlist({ prospectName: 'Test', position: 'ST' }, 'user-001');
      expect(result).toBeDefined();
    });
  });

  describe('updateWatchlist', () => {
    it('should update watchlist entry', async () => {
      const wl = mockModelInstance(mockWatchlist());
      mockWatchlistFindByPk.mockResolvedValue(wl);
      await scoutingService.updateWatchlist('wl-001', { priority: 'Critical' });
      expect(wl.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockWatchlistFindByPk.mockResolvedValue(null);
      await expect(scoutingService.updateWatchlist('bad', {})).rejects.toThrow('Watchlist entry not found');
    });
  });

  describe('updateWatchlistStatus', () => {
    it('should update status', async () => {
      const wl = mockModelInstance(mockWatchlist());
      mockWatchlistFindByPk.mockResolvedValue(wl);
      await scoutingService.updateWatchlistStatus('wl-001', 'Shortlisted');
      expect(wl.update).toHaveBeenCalledWith({ status: 'Shortlisted' });
    });

    it('should throw 404 if not found', async () => {
      mockWatchlistFindByPk.mockResolvedValue(null);
      await expect(scoutingService.updateWatchlistStatus('bad', 'Active')).rejects.toThrow('Watchlist entry not found');
    });
  });

  describe('deleteWatchlist', () => {
    it('should delete watchlist entry', async () => {
      const wl = mockModelInstance(mockWatchlist());
      mockWatchlistFindByPk.mockResolvedValue(wl);
      mockScreeningCount.mockResolvedValue(0);
      const result = await scoutingService.deleteWatchlist('wl-001');
      expect(wl.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'wl-001' });
    });

    it('should throw 400 if screening cases exist', async () => {
      const wl = mockModelInstance(mockWatchlist());
      mockWatchlistFindByPk.mockResolvedValue(wl);
      mockScreeningCount.mockResolvedValue(2);
      await expect(scoutingService.deleteWatchlist('wl-001')).rejects.toThrow('Cannot delete');
    });

    it('should throw 404 if not found', async () => {
      mockWatchlistFindByPk.mockResolvedValue(null);
      await expect(scoutingService.deleteWatchlist('bad')).rejects.toThrow('Watchlist entry not found');
    });
  });

  // ── SCREENING CASES ──

  describe('createScreeningCase', () => {
    it('should create screening case', async () => {
      const wl = mockModelInstance(mockWatchlist({ status: 'Active' }));
      mockWatchlistFindByPk.mockResolvedValue(wl);
      mockScreeningFindOne.mockResolvedValue(null);
      mockScreeningCount.mockResolvedValue(0);
      mockScreeningCreate.mockResolvedValue(mockModelInstance(mockScreeningCase()));
      const result = await scoutingService.createScreeningCase({ watchlistId: 'wl-001' }, 'user-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if watchlist not found', async () => {
      mockWatchlistFindByPk.mockResolvedValue(null);
      await expect(scoutingService.createScreeningCase({ watchlistId: 'bad' }, 'user-001')).rejects.toThrow('Watchlist entry not found');
    });

    it('should throw 400 if prospect rejected', async () => {
      const wl = mockModelInstance(mockWatchlist({ status: 'Rejected' }));
      mockWatchlistFindByPk.mockResolvedValue(wl);
      await expect(scoutingService.createScreeningCase({ watchlistId: 'wl-001' }, 'user-001')).rejects.toThrow('Cannot screen a rejected prospect');
    });

    it('should throw 409 if open case exists', async () => {
      const wl = mockModelInstance(mockWatchlist({ status: 'Active' }));
      mockWatchlistFindByPk.mockResolvedValue(wl);
      mockScreeningFindOne.mockResolvedValue(mockModelInstance(mockScreeningCase()));
      await expect(scoutingService.createScreeningCase({ watchlistId: 'wl-001' }, 'user-001')).rejects.toThrow('open screening case already exists');
    });
  });

  describe('getScreeningCase', () => {
    it('should return screening case', async () => {
      mockScreeningFindByPk.mockResolvedValue(mockModelInstance(mockScreeningCase()));
      const result = await scoutingService.getScreeningCase('sc-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockScreeningFindByPk.mockResolvedValue(null);
      await expect(scoutingService.getScreeningCase('bad')).rejects.toThrow('Screening case not found');
    });
  });

  describe('updateScreeningCase', () => {
    it('should update screening case', async () => {
      const sc = mockModelInstance(mockScreeningCase({ status: 'InProgress' }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await scoutingService.updateScreeningCase('sc-001', { identityCheck: 'Verified' });
      expect(sc.update).toHaveBeenCalled();
    });

    it('should throw 400 if closed', async () => {
      const sc = mockModelInstance(mockScreeningCase({ status: 'Closed' }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.updateScreeningCase('sc-001', {})).rejects.toThrow('Cannot modify a closed screening case');
    });

    it('should throw 404 if not found', async () => {
      mockScreeningFindByPk.mockResolvedValue(null);
      await expect(scoutingService.updateScreeningCase('bad', {})).rejects.toThrow('Screening case not found');
    });
  });

  describe('markPackReady', () => {
    it('should mark pack ready', async () => {
      const sc = mockModelInstance(mockScreeningCase({
        status: 'InProgress',
        identityCheck: 'Verified',
        medicalClearance: true,
        idCardDocumentId: 'doc-id-001',
        hasExistingAgencyContract: false,
      }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      mockWatchlistFindByPk.mockResolvedValue(mockModelInstance(mockWatchlist()));
      await scoutingService.markPackReady('sc-001', 'user-001');
      expect(sc.update).toHaveBeenCalledWith(expect.objectContaining({ isPackReady: true, status: 'PackReady' }));
    });

    it('should mark pack ready with verified clearance', async () => {
      const sc = mockModelInstance(mockScreeningCase({
        status: 'InProgress',
        identityCheck: 'Verified',
        medicalClearance: true,
        idCardDocumentId: 'doc-id-001',
        hasExistingAgencyContract: true,
        clearanceDocumentId: 'doc-cl-001',
      }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      mockWatchlistFindByPk.mockResolvedValue(mockModelInstance(mockWatchlist()));
      await scoutingService.markPackReady('sc-001', 'user-001');
      expect(sc.update).toHaveBeenCalledWith(expect.objectContaining({ isPackReady: true }));
    });

    it('should throw 400 if identity not verified', async () => {
      const sc = mockModelInstance(mockScreeningCase({ status: 'InProgress', identityCheck: 'Pending', medicalClearance: true }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.markPackReady('sc-001', 'user-001')).rejects.toThrow('Identity check must be verified');
    });

    it('should throw 400 if no medical clearance', async () => {
      const sc = mockModelInstance(mockScreeningCase({ status: 'InProgress', identityCheck: 'Verified', medicalClearance: false }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.markPackReady('sc-001', 'user-001')).rejects.toThrow('Medical clearance is required');
    });

    it('should throw 400 if ID card not uploaded', async () => {
      const sc = mockModelInstance(mockScreeningCase({
        status: 'InProgress',
        identityCheck: 'Verified',
        medicalClearance: true,
        idCardDocumentId: null,
      }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.markPackReady('sc-001', 'user-001')).rejects.toThrow('Player ID Card upload is required');
    });

    it('should throw 400 if existing-contract status not declared', async () => {
      const sc = mockModelInstance(mockScreeningCase({
        status: 'InProgress',
        identityCheck: 'Verified',
        medicalClearance: true,
        idCardDocumentId: 'doc-id-001',
        hasExistingAgencyContract: null,
      }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.markPackReady('sc-001', 'user-001')).rejects.toThrow('Existing agency-contract status must be declared');
    });

    it('should throw 400 if clearance document missing when prior contract exists', async () => {
      const sc = mockModelInstance(mockScreeningCase({
        status: 'InProgress',
        identityCheck: 'Verified',
        medicalClearance: true,
        idCardDocumentId: 'doc-id-001',
        hasExistingAgencyContract: true,
        clearanceDocumentId: null,
      }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.markPackReady('sc-001', 'user-001')).rejects.toThrow('Clearance document required');
    });

    it('should throw 404 if not found', async () => {
      mockScreeningFindByPk.mockResolvedValue(null);
      await expect(scoutingService.markPackReady('bad', 'user-001')).rejects.toThrow('Screening case not found');
    });
  });

  // ── DECISIONS ──

  describe('createDecision', () => {
    it('should create decision for approved case', async () => {
      const sc = mockModelInstance(mockScreeningCase({ isPackReady: true, watchlist: mockWatchlist() }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      mockDecisionCreate.mockResolvedValue(mockModelInstance({ id: 'dec-001' }));
      const result = await scoutingService.createDecision({ screeningCaseId: 'sc-001', decision: 'Approved', committeeName: 'Board' }, 'user-001');
      expect(result).toBeDefined();
      expect(sc.update).toHaveBeenCalledWith({ status: 'Closed' }, expect.objectContaining({ transaction: expect.anything() }));
    });

    it('should throw 400 if pack not ready', async () => {
      const sc = mockModelInstance(mockScreeningCase({ isPackReady: false }));
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(scoutingService.createDecision({ screeningCaseId: 'sc-001', decision: 'Approved' }, 'user-001')).rejects.toThrow('Pack must be ready');
    });

    it('should throw 404 if screening case not found', async () => {
      mockScreeningFindByPk.mockResolvedValue(null);
      await expect(scoutingService.createDecision({ screeningCaseId: 'bad' }, 'user-001')).rejects.toThrow('Screening case not found');
    });
  });

  describe('getDecision', () => {
    it('should return decision', async () => {
      mockDecisionFindByPk.mockResolvedValue(mockModelInstance({ id: 'dec-001', decision: 'Approved' }));
      const result = await scoutingService.getDecision('dec-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockDecisionFindByPk.mockResolvedValue(null);
      await expect(scoutingService.getDecision('bad')).rejects.toThrow('Decision not found');
    });
  });

  // ── SIGN PROSPECT ──

  describe('signProspect', () => {
    const baseDecision = () =>
      mockModelInstance({ id: 'dec-001', decision: 'Approved', screeningCaseId: 'sc-001' });

    const baseScreening = () => {
      const wl = mockModelInstance({
        id: 'wl-001',
        prospectName: 'Ahmed',
        prospectNameAr: 'أحمد',
        dateOfBirth: '2000-01-01',
        nationality: 'Saudi',
        position: 'ST',
        notes: null,
        status: 'Shortlisted',
      });
      const sc: any = mockModelInstance({
        id: 'sc-001',
        caseNumber: 'SC-26-0001',
        signedPlayerId: null,
        idCardDocumentId: 'doc-id-1',
        clearanceDocumentId: null,
        hasExistingAgencyContract: false,
        clearanceVerifiedAt: null,
      });
      sc.watchlist = wl;
      return { sc, wl };
    };

    it('creates a Player and an Agency Representation draft contract inside one transaction', async () => {
      mockDecisionFindByPk.mockResolvedValue(baseDecision());
      const { sc } = baseScreening();
      mockScreeningFindByPk.mockResolvedValue(sc);

      const Player = require('../../../src/modules/players/player.model').Player;
      (Player.create as jest.Mock).mockResolvedValue(mockModelInstance({ id: 'player-new' }));
      mockCreateAgencyDraft.mockResolvedValue(mockModelInstance({ id: 'contract-new', status: 'Draft' }));

      const result = await scoutingService.signProspect(
        'dec-001',
        { firstName: 'Ahmed', lastName: 'X', playerType: 'Pro', playerPackage: 'A' },
        'user-001',
      );

      expect(Player.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Ahmed',
          playerType: 'Pro',
          mandateStatus: 'In Negotiation',
          contractType: 'Professional',
        }),
        expect.any(Object),
      );
      expect(mockCreateAgencyDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player-new',
          playerContractType: 'Professional',
          createdBy: 'user-001',
        }),
        expect.any(Object),
      );
      expect(result).toEqual({ playerId: 'player-new', contractId: 'contract-new' });
    });

    it('rejects when the committee decision is not Approved', async () => {
      mockDecisionFindByPk.mockResolvedValue(
        mockModelInstance({ id: 'dec-001', decision: 'Rejected', screeningCaseId: 'sc-001' }),
      );
      await expect(
        scoutingService.signProspect(
          'dec-001',
          { firstName: 'A', lastName: 'B', playerType: 'Pro', playerPackage: 'A' },
          'user-001',
        ),
      ).rejects.toThrow('Prospect not approved by committee');
    });

    it('rejects when the prospect is already signed (idempotent guard)', async () => {
      mockDecisionFindByPk.mockResolvedValue(baseDecision());
      const { sc } = baseScreening();
      sc.signedPlayerId = 'player-existing';
      mockScreeningFindByPk.mockResolvedValue(sc);
      await expect(
        scoutingService.signProspect(
          'dec-001',
          { firstName: 'A', lastName: 'B', playerType: 'Pro', playerPackage: 'A' },
          'user-001',
        ),
      ).rejects.toThrow('Prospect already signed');
    });
  });

  // ── PIPELINE SUMMARY ──

  describe('getPipelineSummary', () => {
    it('should return pipeline counts', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([{
        watchlist: '10',
        screening: '3',
        pack_ready: '1',
        decided: '8',
        rejected: '2',
      }]);
      const result = await scoutingService.getPipelineSummary();
      expect(result).toHaveProperty('total', 24);
      expect(result).toHaveProperty('watchlist', 10);
      expect(result).toHaveProperty('screening', 3);
    });
  });
});
