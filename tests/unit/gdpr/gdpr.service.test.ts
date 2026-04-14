/// <reference types="jest" />

const mockPlayerFindByPk = jest.fn();
const mockPlayerUpdate = jest.fn();
const mockContractFindAll = jest.fn();
const mockContractCount = jest.fn();
const mockContractUpdate = jest.fn();
const mockInjuryFindAll = jest.fn();
const mockInjuryUpdate = jest.fn();
const mockInjuryUpdateModel = jest.fn();
const mockDocumentFindAll = jest.fn();
const mockDocumentCount = jest.fn();
const mockDocumentUpdate = jest.fn();
const mockNoteFindAll = jest.fn();
const mockNoteCount = jest.fn();
const mockNoteUpdate = jest.fn();
const mockUserFindOne = jest.fn();
const mockInvoiceFindAll = jest.fn();
const mockInvoiceCount = jest.fn();
const mockInvoiceUpdate = jest.fn();
const mockPaymentFindAll = jest.fn();
const mockPaymentCount = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockLedgerFindAll = jest.fn();
const mockLedgerCount = jest.fn();
const mockLedgerUpdate = jest.fn();
const mockValuationFindAll = jest.fn();
const mockValuationCount = jest.fn();
const mockValuationUpdate = jest.fn();
const mockOfferFindAll = jest.fn();
const mockOfferCount = jest.fn();
const mockOfferUpdate = jest.fn();
const mockReferralFindAll = jest.fn();
const mockReferralCount = jest.fn();
const mockReferralUpdate = jest.fn();
const mockEnrollmentFindAll = jest.fn();
const mockEnrollmentCount = jest.fn();
const mockEnrollmentUpdate = jest.fn();
const mockActivityFindAll = jest.fn();
const mockActivityCount = jest.fn();
const mockActivityUpdate = jest.fn();
const mockReportFindAll = jest.fn();
const mockReportCount = jest.fn();
const mockReportUpdate = jest.fn();
const mockStatsFindAll = jest.fn();
const mockExtFindAll = jest.fn();
const mockExtDestroy = jest.fn();
const mockSequelizeTransaction = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: (...a: unknown[]) => mockSequelizeTransaction(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    update: (...a: unknown[]) => mockPlayerUpdate(...a),
  },
}));
jest.mock('../../../src/modules/users/user.model', () => ({
  User: { findOne: (...a: unknown[]) => mockUserFindOne(...a) },
}));
jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: {
    findAll: (...a: unknown[]) => mockContractFindAll(...a),
    count: (...a: unknown[]) => mockContractCount(...a),
    update: (...a: unknown[]) => mockContractUpdate(...a),
  },
}));
jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: {
    findAll: (...a: unknown[]) => mockInjuryFindAll(...a),
    update: (...a: unknown[]) => mockInjuryUpdate(...a),
  },
  InjuryUpdate: {
    findAll: (...a: unknown[]) => jest.fn().mockResolvedValue([])(...a),
    update: (...a: unknown[]) => mockInjuryUpdateModel(...a),
  },
}));
jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: {
    findAll: (...a: unknown[]) => mockDocumentFindAll(...a),
    count: (...a: unknown[]) => mockDocumentCount(...a),
    update: (...a: unknown[]) => mockDocumentUpdate(...a),
  },
}));
jest.mock('../../../src/modules/notes/note.model', () => ({
  Note: {
    findAll: (...a: unknown[]) => mockNoteFindAll(...a),
    count: (...a: unknown[]) => mockNoteCount(...a),
    update: (...a: unknown[]) => mockNoteUpdate(...a),
  },
}));
jest.mock('../../../src/modules/finance/finance.model', () => ({
  Invoice: {
    findAll: (...a: unknown[]) => mockInvoiceFindAll(...a),
    count: (...a: unknown[]) => mockInvoiceCount(...a),
    update: (...a: unknown[]) => mockInvoiceUpdate(...a),
  },
  Payment: {
    findAll: (...a: unknown[]) => mockPaymentFindAll(...a),
    count: (...a: unknown[]) => mockPaymentCount(...a),
    update: (...a: unknown[]) => mockPaymentUpdate(...a),
  },
  LedgerEntry: {
    findAll: (...a: unknown[]) => mockLedgerFindAll(...a),
    count: (...a: unknown[]) => mockLedgerCount(...a),
    update: (...a: unknown[]) => mockLedgerUpdate(...a),
  },
  Valuation: {
    findAll: (...a: unknown[]) => mockValuationFindAll(...a),
    count: (...a: unknown[]) => mockValuationCount(...a),
    update: (...a: unknown[]) => mockValuationUpdate(...a),
  },
}));
jest.mock('../../../src/modules/offers/offer.model', () => ({
  Offer: {
    findAll: (...a: unknown[]) => mockOfferFindAll(...a),
    count: (...a: unknown[]) => mockOfferCount(...a),
    update: (...a: unknown[]) => mockOfferUpdate(...a),
  },
}));
jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: {
    findAll: (...a: unknown[]) => mockReferralFindAll(...a),
    count: (...a: unknown[]) => mockReferralCount(...a),
    update: (...a: unknown[]) => mockReferralUpdate(...a),
  },
}));
jest.mock('../../../src/modules/training/training.model', () => ({
  TrainingEnrollment: {
    findAll: (...a: unknown[]) => mockEnrollmentFindAll(...a),
    count: (...a: unknown[]) => mockEnrollmentCount(...a),
    update: (...a: unknown[]) => mockEnrollmentUpdate(...a),
  },
  TrainingActivity: {
    findAll: (...a: unknown[]) => mockActivityFindAll(...a),
    count: (...a: unknown[]) => mockActivityCount(...a),
    update: (...a: unknown[]) => mockActivityUpdate(...a),
  },
}));
jest.mock('../../../src/modules/reports/report.model', () => ({
  TechnicalReport: {
    findAll: (...a: unknown[]) => mockReportFindAll(...a),
    count: (...a: unknown[]) => mockReportCount(...a),
    update: (...a: unknown[]) => mockReportUpdate(...a),
  },
}));
jest.mock('../../../src/modules/matches/playerMatchStats.model', () => ({
  PlayerMatchStats: { findAll: (...a: unknown[]) => mockStatsFindAll(...a) },
}));
jest.mock('../../../src/modules/players/externalProvider.model', () => ({
  ExternalProviderMapping: {
    findAll: (...a: unknown[]) => mockExtFindAll(...a),
    destroy: (...a: unknown[]) => mockExtDestroy(...a),
  },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as gdprService from '../../../src/modules/gdpr/gdpr.service';

// Helper to create a mock player with toJSON
const mockPlayer = (overrides: any = {}) => ({
  id: 'player-001',
  firstName: 'Ahmed',
  lastName: 'Ali',
  toJSON: () => ({ id: 'player-001', firstName: 'Ahmed', lastName: 'Ali', ...overrides }),
  ...overrides,
});

describe('GDPR Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('exportPlayerData', () => {
    it('should export all player data', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayer());
      mockContractFindAll.mockResolvedValue([]);
      mockInjuryFindAll.mockResolvedValue([]);
      mockUserFindOne.mockResolvedValue(null);
      mockDocumentFindAll.mockResolvedValue([]);
      mockNoteFindAll.mockResolvedValue([]);
      mockInvoiceFindAll.mockResolvedValue([]);
      mockPaymentFindAll.mockResolvedValue([]);
      mockLedgerFindAll.mockResolvedValue([]);
      mockValuationFindAll.mockResolvedValue([]);
      mockStatsFindAll.mockResolvedValue([]);
      mockEnrollmentFindAll.mockResolvedValue([]);
      mockActivityFindAll.mockResolvedValue([]);
      mockOfferFindAll.mockResolvedValue([]);
      mockReferralFindAll.mockResolvedValue([]);
      mockExtFindAll.mockResolvedValue([]);
      mockReportFindAll.mockResolvedValue([]);

      const result = await gdprService.exportPlayerData('player-001');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('personalInfo');
      expect(result).toHaveProperty('contracts');
      expect(result).toHaveProperty('finance');
      expect(result).toHaveProperty('injuries');
      expect(result).toHaveProperty('documents');
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(gdprService.exportPlayerData('bad')).rejects.toThrow('Player not found');
    });

    it('should redact restricted referral details', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayer());
      mockContractFindAll.mockResolvedValue([]);
      mockInjuryFindAll.mockResolvedValue([]);
      mockUserFindOne.mockResolvedValue(null);
      mockDocumentFindAll.mockResolvedValue([]);
      mockNoteFindAll.mockResolvedValue([]);
      mockInvoiceFindAll.mockResolvedValue([]);
      mockPaymentFindAll.mockResolvedValue([]);
      mockLedgerFindAll.mockResolvedValue([]);
      mockValuationFindAll.mockResolvedValue([]);
      mockStatsFindAll.mockResolvedValue([]);
      mockEnrollmentFindAll.mockResolvedValue([]);
      mockActivityFindAll.mockResolvedValue([]);
      mockOfferFindAll.mockResolvedValue([]);
      mockReferralFindAll.mockResolvedValue([{
        toJSON: () => ({ id: 'ref-001', isRestricted: true, referralType: 'Mental', triggerDesc: 'Secret', status: 'Open', priority: 'High', createdAt: new Date() }),
      }]);
      mockExtFindAll.mockResolvedValue([]);
      mockReportFindAll.mockResolvedValue([]);

      const result = await gdprService.exportPlayerData('player-001');
      const ref = result.referrals[0] as any;
      expect(ref.isRestricted).toBe(true);
      expect(ref.triggerDesc).toBeUndefined();
    });
  });

  describe('anonymizePlayerData', () => {
    it('should anonymize player data', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayer());
      mockContractCount.mockResolvedValue(0);
      mockContractFindAll.mockResolvedValue([]);
      mockInjuryFindAll.mockResolvedValue([]);
      mockSequelizeTransaction.mockImplementation(async (cb: any) => cb({ transaction: {} }));
      mockPlayerUpdate.mockResolvedValue([1]);
      mockDocumentCount.mockResolvedValue(0);
      mockNoteCount.mockResolvedValue(0);
      mockInvoiceCount.mockResolvedValue(0);
      mockPaymentCount.mockResolvedValue(0);
      mockLedgerCount.mockResolvedValue(0);
      mockValuationCount.mockResolvedValue(0);
      mockOfferCount.mockResolvedValue(0);
      mockReferralCount.mockResolvedValue(0);
      mockEnrollmentCount.mockResolvedValue(0);
      mockActivityCount.mockResolvedValue(0);
      mockReportCount.mockResolvedValue(0);
      mockExtDestroy.mockResolvedValue(0);
      mockUserFindOne.mockResolvedValue(null);

      const result = await gdprService.anonymizePlayerData('player-001');
      expect(result).toHaveProperty('anonymizedTables');
      expect(result.anonymizedTables).toContain('players');
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(gdprService.anonymizePlayerData('bad')).rejects.toThrow('Player not found');
    });

    it('should throw 409 if already anonymized', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayer({ firstName: '[REDACTED]' }));
      await expect(gdprService.anonymizePlayerData('player-001')).rejects.toThrow('already been anonymized');
    });

    it('should throw 400 if active contracts exist', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayer());
      mockContractCount.mockResolvedValue(1);
      await expect(gdprService.anonymizePlayerData('player-001')).rejects.toThrow('active contracts');
    });
  });
});
