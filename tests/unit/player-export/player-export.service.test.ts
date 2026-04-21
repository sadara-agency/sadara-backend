/// <reference types="jest" />
import { mockPlayer, mockModelInstance } from '../../setup/test-helpers';

// ── Mocks: database, models, permissions ──

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

const mockPlayerFindByPk = jest.fn();
const mockContractFindAll = jest.fn();
const mockInjuryFindAll = jest.fn();
const mockOfferFindAll = jest.fn();
const mockSessionFindAll = jest.fn();
const mockEnrollmentFindAll = jest.fn();
const mockCourseFindAll = jest.fn();
const mockWellnessProfileFindOne = jest.fn();
const mockWellnessCheckinFindAll = jest.fn();
const mockWellnessWeightFindAll = jest.fn();
const mockReportFindAll = jest.fn();
const mockInvoiceFindAll = jest.fn();
const mockPaymentFindAll = jest.fn();
const mockValuationFindAll = jest.fn();
const mockDocumentFindAll = jest.fn();
const mockNoteFindAll = jest.fn();
const mockMatchPlayerFindAll = jest.fn();
const mockPlayerMatchStatsFindAll = jest.fn();

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));
jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: { findAll: (...a: unknown[]) => mockContractFindAll(...a), name: 'Contract' },
}));
jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: { findAll: (...a: unknown[]) => mockInjuryFindAll(...a), name: 'Injury' },
  InjuryUpdate: { findAll: jest.fn(), name: 'InjuryUpdate' },
}));
jest.mock('../../../src/modules/offers/offer.model', () => ({
  Offer: { findAll: (...a: unknown[]) => mockOfferFindAll(...a), name: 'Offer' },
}));
jest.mock('../../../src/modules/sessions/session.model', () => ({
  Session: { findAll: (...a: unknown[]) => mockSessionFindAll(...a), name: 'Session' },
}));
jest.mock('../../../src/modules/training/training.model', () => ({
  TrainingEnrollment: { findAll: (...a: unknown[]) => mockEnrollmentFindAll(...a), name: 'TrainingEnrollment' },
  TrainingCourse: { findAll: (...a: unknown[]) => mockCourseFindAll(...a), name: 'TrainingCourse' },
}));
jest.mock('../../../src/modules/wellness/wellness.model', () => ({
  WellnessProfile: { findOne: (...a: unknown[]) => mockWellnessProfileFindOne(...a), name: 'WellnessProfile' },
  WellnessCheckin: { findAll: (...a: unknown[]) => mockWellnessCheckinFindAll(...a), name: 'WellnessCheckin' },
  WellnessWeightLog: { findAll: (...a: unknown[]) => mockWellnessWeightFindAll(...a), name: 'WellnessWeightLog' },
}));
jest.mock('../../../src/modules/reports/report.model', () => ({
  TechnicalReport: { findAll: (...a: unknown[]) => mockReportFindAll(...a), name: 'TechnicalReport' },
}));
jest.mock('../../../src/modules/finance/finance.model', () => ({
  Invoice: { findAll: (...a: unknown[]) => mockInvoiceFindAll(...a), name: 'Invoice' },
  Payment: { findAll: (...a: unknown[]) => mockPaymentFindAll(...a), name: 'Payment' },
  Valuation: { findAll: (...a: unknown[]) => mockValuationFindAll(...a), name: 'Valuation' },
}));
jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: { findAll: (...a: unknown[]) => mockDocumentFindAll(...a), name: 'Document' },
}));
jest.mock('../../../src/modules/notes/note.model', () => ({
  Note: { findAll: (...a: unknown[]) => mockNoteFindAll(...a), name: 'Note' },
}));
jest.mock('../../../src/modules/matches/matchPlayer.model', () => ({
  MatchPlayer: { findAll: (...a: unknown[]) => mockMatchPlayerFindAll(...a), name: 'MatchPlayer' },
}));
jest.mock('../../../src/modules/matches/playerMatchStats.model', () => ({
  PlayerMatchStats: { findAll: (...a: unknown[]) => mockPlayerMatchStatsFindAll(...a), name: 'PlayerMatchStats' },
}));
jest.mock('../../../src/modules/users/user.model', () => ({
  User: { findAll: jest.fn().mockResolvedValue([]), name: 'User' },
}));

const mockHasPermission = jest.fn();
const mockGetHiddenFields = jest.fn();
jest.mock('../../../src/modules/permissions/permission.service', () => ({
  hasPermission: (...a: unknown[]) => mockHasPermission(...a),
  getHiddenFields: (...a: unknown[]) => mockGetHiddenFields(...a),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { aggregatePlayerData } from '../../../src/modules/player-export/player-export.service';
import type { AuthUser } from '../../../src/shared/types';

const USER: AuthUser = {
  id: 'user-001',
  email: 'admin@sadara.com',
  fullName: 'Admin',
  role: 'Admin',
};

describe('aggregatePlayerData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockResolvedValue(true);
    mockGetHiddenFields.mockResolvedValue([]);
  });

  it('returns 404 when player does not exist', async () => {
    mockPlayerFindByPk.mockResolvedValue(null);
    await expect(
      aggregatePlayerData('bad', ['contracts'], USER),
    ).rejects.toThrow('Player not found');
  });

  it('always includes personal section and echoes locale + timestamp', async () => {
    mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
    const result = await aggregatePlayerData('player-001', [], USER, 'ar');
    expect(result.sections.personal).toBeDefined();
    expect(result.sections.personal?.rows).toHaveLength(1);
    expect(result.locale).toBe('ar');
    expect(typeof result.generatedAt).toBe('string');
    expect(result.omitted).toEqual([]);
  });

  it('loads a permitted section and passes the playerId filter', async () => {
    mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
    mockContractFindAll.mockResolvedValue([
      mockModelInstance({ id: 'c1', playerId: 'player-001', status: 'Active' }),
    ]);
    const result = await aggregatePlayerData('player-001', ['contracts'], USER);
    expect(mockContractFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { playerId: 'player-001' } }),
    );
    expect(result.sections.contracts?.rows).toHaveLength(1);
    expect(result.omitted).not.toContain('contracts');
  });

  it('omits sections when the caller lacks module permission', async () => {
    mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
    mockHasPermission.mockImplementation(async (_role, module: string) => module !== 'finance');
    const result = await aggregatePlayerData(
      'player-001',
      ['contracts', 'finance'],
      USER,
    );
    expect(result.omitted).toContain('finance');
    expect(result.sections.finance).toBeUndefined();
    expect(mockInvoiceFindAll).not.toHaveBeenCalled();
  });

  it('strips hidden fields returned by getHiddenFields on loaded rows', async () => {
    mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ marketValue: 1000 })));
    mockContractFindAll.mockResolvedValue([
      mockModelInstance({ id: 'c1', playerId: 'player-001', baseSalary: 500, status: 'Active' }),
    ]);
    mockGetHiddenFields.mockImplementation(async (_role, module: string) =>
      module === 'contracts' ? ['baseSalary'] : [],
    );

    const result = await aggregatePlayerData('player-001', ['contracts'], USER);
    const row = result.sections.contracts!.rows[0] as Record<string, unknown>;
    expect(row.baseSalary).toBeUndefined();
    expect(row.status).toBe('Active');
  });

  it('returns empty rows + failure note when a loader throws', async () => {
    mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
    mockInjuryFindAll.mockRejectedValue(new Error('DB blew up'));
    const result = await aggregatePlayerData('player-001', ['injuries'], USER);
    expect(result.sections.injuries?.rows).toEqual([]);
    expect(result.sections.injuries?.note).toBe('Failed to load.');
  });

  it('deduplicates sections even if caller passes duplicates', async () => {
    mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));
    mockNoteFindAll.mockResolvedValue([]);
    const result = await aggregatePlayerData(
      'player-001',
      ['notes', 'notes'],
      USER,
    );
    expect(mockNoteFindAll).toHaveBeenCalledTimes(1);
    expect(Object.keys(result.sections)).toContain('notes');
  });
});
