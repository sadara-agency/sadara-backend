/// <reference types="jest" />
import { mockOffer, mockPlayer, mockClub, mockContract, mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindAll = jest.fn();
const mockOfferCreate = jest.fn();
const mockOfferUpdate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockClubFindByPk = jest.fn();
const mockContractCreate = jest.fn();

const mockTransaction = jest.fn(async (cb: any) => cb({ LOCK: { UPDATE: 'UPDATE' } }));

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
  },
  transaction: (cb: any) => mockTransaction(cb),
}));

jest.mock('../../../src/shared/utils/displayId', () => ({
  generateDisplayId: jest.fn().mockResolvedValue('OFR-26-0001'),
}));

jest.mock('../../../src/modules/offers/offer.model', () => ({
  Offer: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    findAll: (...a: unknown[]) => mockFindAll(...a),
    create: (...a: unknown[]) => mockOfferCreate(...a),
    update: (...a: unknown[]) => mockOfferUpdate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    name: 'Player',
  },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
    name: 'Club',
  },
}));

jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: {
    create: (...a: unknown[]) => mockContractCreate(...a),
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/modules/approvals/approval.service', () => ({
  createApprovalRequest: jest.fn().mockResolvedValue({}),
  resolveApprovalByEntity: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../src/modules/offers/offerAutoTasks', () => ({
  generateOfferCreationTask: jest.fn().mockResolvedValue(null),
  generateOfferAcceptedTask: jest.fn().mockResolvedValue(null),
  checkOfferDeadlines: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as offerService from '../../../src/modules/offers/offer.service';

describe('Offer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LIST OFFERS
  // ════════════════════════════════════════════════════════
  describe('listOffers', () => {
    it('should return paginated offers', async () => {
      mockFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(mockOffer())],
      });

      const result = await offerService.listOffers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await offerService.listOffers({ status: 'New', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await offerService.listOffers({ search: 'Salem', page: 1, limit: 10 });

      expect(mockFindAndCountAll).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // GET OFFER BY ID
  // ════════════════════════════════════════════════════════
  describe('getOfferById', () => {
    it('should return offer with includes', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockOffer()));

      const result = await offerService.getOfferById('offer-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(offerService.getOfferById('nonexistent')).rejects.toThrow('Offer not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // GET OFFERS BY PLAYER
  // ════════════════════════════════════════════════════════
  describe('getOffersByPlayer', () => {
    it('should return offers for player', async () => {
      mockFindAll.mockResolvedValue([mockModelInstance(mockOffer())]);

      const result = await offerService.getOffersByPlayer('player-001');

      expect(result).toHaveLength(1);
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE OFFER
  // ════════════════════════════════════════════════════════
  describe('createOffer', () => {
    it('should create offer with valid player and clubs', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
      mockClubFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
      const created = mockModelInstance(mockOffer());
      mockOfferCreate.mockResolvedValue(created);

      const result = await offerService.createOffer(
        { playerId: 'player-001', fromClubId: 'club-001', toClubId: 'club-002', transferFee: 5000000 },
        'user-001',
      );

      expect(result).toBeDefined();
      expect(mockOfferCreate).toHaveBeenCalled();
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);

      await expect(
        offerService.createOffer({ playerId: 'bad', transferFee: 100 }, 'user-001'),
      ).rejects.toThrow('Player not found');
    });

    it('should throw 404 if from-club not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
      mockClubFindByPk.mockResolvedValueOnce(null);

      await expect(
        offerService.createOffer({ playerId: 'player-001', fromClubId: 'bad' }, 'user-001'),
      ).rejects.toThrow();
    });

    it('should throw 404 if to-club not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
      mockClubFindByPk.mockResolvedValueOnce(mockModelInstance(mockClub())); // fromClub ok
      mockClubFindByPk.mockResolvedValueOnce(null); // toClub fail

      await expect(
        offerService.createOffer({ playerId: 'player-001', fromClubId: 'club-001', toClubId: 'bad' }, 'user-001'),
      ).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE OFFER
  // ════════════════════════════════════════════════════════
  describe('updateOffer', () => {
    it('should update offer fields', async () => {
      const offer = mockModelInstance(mockOffer());
      mockFindByPk.mockResolvedValue(offer);

      const result = await offerService.updateOffer('offer-001', { transferFee: 6000000 });

      expect(offer.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(offerService.updateOffer('bad', { transferFee: 100 })).rejects.toThrow('Offer not found');
    });

    it('should throw 400 if offer is closed', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockOffer({ status: 'Closed' })));

      await expect(offerService.updateOffer('offer-001', { transferFee: 100 })).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE OFFER STATUS
  // ════════════════════════════════════════════════════════
  describe('updateOfferStatus', () => {
    it('should update status with timestamps', async () => {
      const offer = mockModelInstance(mockOffer());
      mockFindByPk.mockResolvedValue(offer);

      await offerService.updateOfferStatus('offer-001', { status: 'Under Review' });

      expect(offer.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Under Review' }),
      );
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        offerService.updateOfferStatus('bad', { status: 'Closed' }),
      ).rejects.toThrow('Offer not found');
    });

    it('should set closedAt when status is Closed', async () => {
      const offer = mockModelInstance(mockOffer());
      mockFindByPk.mockResolvedValue(offer);

      await offerService.updateOfferStatus('offer-001', { status: 'Closed' });

      expect(offer.update).toHaveBeenCalledWith(
        expect.objectContaining({ closedAt: expect.any(Date) }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE OFFER
  // ════════════════════════════════════════════════════════
  describe('deleteOffer', () => {
    it('should delete New offer', async () => {
      const offer = mockModelInstance(mockOffer({ status: 'New' }));
      mockFindByPk.mockResolvedValue(offer);

      const result = await offerService.deleteOffer('offer-001');

      expect(offer.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'offer-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(offerService.deleteOffer('bad')).rejects.toThrow('Offer not found');
    });

    it('should throw 400 for non-New offers', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockOffer({ status: 'Negotiation' })));

      await expect(offerService.deleteOffer('offer-001')).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════
  // CONVERT TO CONTRACT
  // ════════════════════════════════════════════════════════
  describe('convertOfferToContract', () => {
    it('should convert closed offer to contract', async () => {
      const offer = mockModelInstance(mockOffer({
        status: 'Closed',
        convertedContractId: null,
        toClubId: 'club-002',
        contractYears: 3,
        salaryOffered: 200000,
        feeCurrency: 'SAR',
        transferFee: 5000000,
        agentFee: 10,
      }));
      mockFindByPk.mockResolvedValue(offer);
      const contract = mockModelInstance(mockContract({ id: 'contract-new' }));
      mockContractCreate.mockResolvedValue(contract);
      mockOfferUpdate.mockResolvedValue([1]);

      const result = await offerService.convertOfferToContract('offer-001', 'user-001');

      expect(result).toBeDefined();
      expect(mockContractCreate).toHaveBeenCalled();
    });

    it('should throw 404 if offer not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(offerService.convertOfferToContract('bad', 'user-001')).rejects.toThrow('Offer not found');
    });

    it('should throw 400 if offer not closed', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockOffer({ status: 'New' })));

      await expect(offerService.convertOfferToContract('offer-001', 'user-001')).rejects.toThrow();
    });

    it('should throw 400 if already converted', async () => {
      mockFindByPk.mockResolvedValue(
        mockModelInstance(mockOffer({ status: 'Closed', convertedContractId: 'contract-001' })),
      );

      await expect(offerService.convertOfferToContract('offer-001', 'user-001')).rejects.toThrow();
    });
  });
});
