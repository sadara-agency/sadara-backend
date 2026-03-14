/// <reference types="jest" />
import { mockGate, mockGateChecklist, mockModelInstance, mockPlayer } from '../../setup/test-helpers';

// ── Mock fns ──

const mockGateFindByPk = jest.fn();
const mockChecklistFindByPk = jest.fn();
const mockChecklistFindAll = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockDocumentCount = jest.fn();
const mockContractFindAll = jest.fn();
const mockNoteCount = jest.fn();
const mockValuationCount = jest.fn();
const mockScreeningCaseFindAll = jest.fn();

// ── jest.mock calls ──

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/gates/gate.model', () => ({
  Gate: {
    findByPk: (...a: unknown[]) => mockGateFindByPk(...a),
  },
  GateChecklist: {
    findByPk: (...a: unknown[]) => mockChecklistFindByPk(...a),
    findAll: (...a: unknown[]) => mockChecklistFindAll(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));

jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: { count: (...a: unknown[]) => mockDocumentCount(...a), name: 'Document' },
}));

jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: { findAll: (...a: unknown[]) => mockContractFindAll(...a), name: 'Contract' },
}));

jest.mock('../../../src/modules/notes/note.model', () => ({
  Note: { count: (...a: unknown[]) => mockNoteCount(...a), name: 'Note' },
}));

jest.mock('../../../src/modules/finance/finance.model', () => ({
  Valuation: { count: (...a: unknown[]) => mockValuationCount(...a), name: 'Valuation' },
}));

jest.mock('../../../src/modules/scouting/scouting.model', () => ({
  ScreeningCase: { findAll: (...a: unknown[]) => mockScreeningCaseFindAll(...a), name: 'ScreeningCase' },
  Watchlist: { name: 'Watchlist' },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { verifyGate, verifyItem } from '../../../src/modules/gates/gate-verifier.service';

// ── Helpers ──

function checklistItem(overrides: Record<string, any> = {}) {
  return mockModelInstance(mockGateChecklist({
    verificationType: 'auto',
    verificationRule: null,
    autoVerified: false,
    autoVerifiedDetails: null,
    lastVerifiedAt: null,
    ...overrides,
  })) as any;
}

describe('Gate Verifier Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ════════════════════════════════════════
  // INDIVIDUAL CHECKERS (via verifyItem)
  // ════════════════════════════════════════

  describe('has_document checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when documents exist', async () => {
      const item = checklistItem({
        verificationType: 'auto',
        verificationRule: { check: 'has_document', entityType: 'Player', docType: ['ID', 'Passport'], status: ['Active'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockDocumentCount.mockResolvedValue(2);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('Found 2');
      expect(mockDocumentCount).toHaveBeenCalled();
    });

    it('should fail when no documents found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_document', docType: ['Passport'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockDocumentCount.mockResolvedValue(0);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('No');
    });

    it('should default entityType to Player', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_document', docType: ['ID'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockDocumentCount.mockResolvedValue(1);

      await verifyItem(item.id);

      expect(mockDocumentCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'Player' }),
        }),
      );
    });
  });

  describe('has_contract checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when contract exists', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_contract', contractType: 'Representation' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockContractFindAll.mockResolvedValue([{ id: 'c1', signedAt: null }]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('found and verified');
    });

    it('should fail when no contract found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_contract', contractType: 'Representation' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockContractFindAll.mockResolvedValue([]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('No');
    });

    it('should fail when requireSignature is true but contract unsigned', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_contract', contractType: 'Representation', requireSignature: true },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockContractFindAll.mockResolvedValue([{ id: 'c1', signedAt: null }]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('not signed');
    });

    it('should pass when requireSignature is true and contract is signed', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_contract', contractType: 'Representation', requireSignature: true },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockContractFindAll.mockResolvedValue([{ id: 'c1', signedAt: new Date() }]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
    });
  });

  describe('player_field checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify not_null condition when field is set', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'currentClubId', condition: 'not_null' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ currentClubId: 'club-001' })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('is set');
    });

    it('should fail not_null condition when field is null', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'currentClubId', condition: 'not_null' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ currentClubId: null })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('is not set');
    });

    it('should fail not_null condition when field is empty string', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'currentClubId', condition: 'not_null' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ currentClubId: '' })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });

    it('should verify value match', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'playerType', value: 'Professional' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ playerType: 'Professional' })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
    });

    it('should fail when value does not match', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'playerType', value: 'Youth' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ playerType: 'Professional' })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('Professional');
    });

    it('should fail when player not found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'playerType', condition: 'not_null' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(null);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('Player not found');
    });

    it('should fail with invalid rule (no condition or value)', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_field', field: 'playerType' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer()));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('Invalid rule condition');
    });
  });

  describe('player_fields_filled checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when all fields are filled', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_fields_filled', fields: ['nationality', 'position'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ nationality: 'Saudi', position: 'Forward' })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('All fields filled');
    });

    it('should fail when some fields are missing', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_fields_filled', fields: ['nationality', 'photoUrl'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ nationality: 'Saudi', photoUrl: null })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('photoUrl');
    });

    it('should treat 0 as missing', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_fields_filled', fields: ['speed'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ speed: 0 })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });

    it('should fail when player not found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_fields_filled', fields: ['nationality'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(null);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('Player not found');
    });
  });

  describe('has_note checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: new Date('2025-01-01') }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when matching notes exist', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_note', ownerType: 'Player' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockNoteCount.mockResolvedValue(3);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('Found 3');
    });

    it('should fail when no notes found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_note' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockNoteCount.mockResolvedValue(0);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });

    it('should apply contentContains filter', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_note', contentContains: 'development plan' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockNoteCount.mockResolvedValue(1);

      await verifyItem(item.id);

      expect(mockNoteCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: expect.anything(),
          }),
        }),
      );
    });

    it('should apply afterGateStart filter when gateStartedAt is set', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_note', afterGateStart: true },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockNoteCount.mockResolvedValue(1);

      await verifyItem(item.id);

      expect(mockNoteCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('has_valuation checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: new Date('2025-01-01') }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when valuations exist', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_valuation' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockValuationCount.mockResolvedValue(1);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('valuation');
    });

    it('should fail when no valuations found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_valuation' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockValuationCount.mockResolvedValue(0);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });

    it('should apply afterGateStart filter', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_valuation', afterGateStart: true },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockValuationCount.mockResolvedValue(1);

      await verifyItem(item.id);

      expect(mockValuationCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('has_scouting_stats checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when screening cases have baseline stats', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_scouting_stats' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockScreeningCaseFindAll.mockResolvedValue([
        { baselineStats: { speed: 80, passing: 70 } },
      ]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('baseline stats');
    });

    it('should fail when no screening cases have stats', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_scouting_stats' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockScreeningCaseFindAll.mockResolvedValue([]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });

    it('should fail when baselineStats is empty object', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_scouting_stats' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockScreeningCaseFindAll.mockResolvedValue([
        { baselineStats: {} },
      ]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });

    it('should fail when baselineStats is null', async () => {
      const item = checklistItem({
        verificationRule: { check: 'has_scouting_stats' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockScreeningCaseFindAll.mockResolvedValue([
        { baselineStats: null },
      ]);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
    });
  });

  describe('player_stats_updated checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: new Date('2025-01-01') }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should verify when >= 3 stats are filled (no afterGateStart)', async () => {
      const gateNoStart = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gateNoStart);

      const item = checklistItem({
        verificationRule: { check: 'player_stats_updated' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({
        speed: 80, passing: 75, shooting: 70, defense: 0, fitness: 0, tactical: 0,
      })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('3/6');
    });

    it('should fail when < 3 stats filled', async () => {
      const gateNoStart = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gateNoStart);

      const item = checklistItem({
        verificationRule: { check: 'player_stats_updated' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({
        speed: 80, passing: 75, shooting: 0, defense: 0, fitness: 0, tactical: 0,
      })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('2/6');
    });

    it('should fail when no stats are recorded', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_stats_updated' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({
        speed: null, passing: null, shooting: null, defense: null, fitness: null, tactical: null,
      })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('No performance stats');
    });

    it('should verify with afterGateStart when updated after gate start and >= 3 stats', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_stats_updated', afterGateStart: true },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({
        speed: 80, passing: 75, shooting: 70, defense: 0, fitness: 0, tactical: 0,
        updatedAt: new Date('2025-06-01'),
      })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('Stats updated after gate start');
    });

    it('should fail with afterGateStart when updatedAt is before gate start', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_stats_updated', afterGateStart: true },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({
        speed: 80, passing: 75, shooting: 70, defense: 0, fitness: 0, tactical: 0,
        updatedAt: new Date('2024-06-01'),
      })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('not updated since gate started');
    });

    it('should fail when player not found', async () => {
      const item = checklistItem({
        verificationRule: { check: 'player_stats_updated' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(null);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('Player not found');
    });
  });

  describe('conditional checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should run "then" branch when condition is met', async () => {
      const item = checklistItem({
        verificationRule: {
          check: 'conditional',
          condition: { check: 'player_field', field: 'playerType', value: 'Professional' },
          then: { check: 'has_document', docType: ['ID'] },
          else: 'skip',
        },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ playerType: 'Professional' })));
      mockDocumentCount.mockResolvedValue(1);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(mockDocumentCount).toHaveBeenCalled();
    });

    it('should auto-pass (skip) when condition not met and else is "skip"', async () => {
      const item = checklistItem({
        verificationRule: {
          check: 'conditional',
          condition: { check: 'player_field', field: 'playerType', value: 'Youth' },
          then: { check: 'has_document', docType: ['ID'] },
          else: 'skip',
        },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ playerType: 'Professional' })));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toContain('auto-passed');
      expect(mockDocumentCount).not.toHaveBeenCalled();
    });

    it('should run "else" branch when condition not met and else is a rule', async () => {
      const item = checklistItem({
        verificationRule: {
          check: 'conditional',
          condition: { check: 'player_field', field: 'playerType', value: 'Youth' },
          then: { check: 'has_document', docType: ['ID'] },
          else: { check: 'has_note' },
        },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance(mockPlayer({ playerType: 'Professional' })));
      mockNoteCount.mockResolvedValue(2);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(mockNoteCount).toHaveBeenCalled();
      expect(mockDocumentCount).not.toHaveBeenCalled();
    });
  });

  describe('manual checker', () => {
    const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));

    beforeEach(() => {
      mockGateFindByPk.mockResolvedValue(gate);
    });

    it('should return isCompleted status for manual items (completed)', async () => {
      const item = checklistItem({
        verificationType: 'manual',
        isCompleted: true,
      });
      mockChecklistFindByPk.mockResolvedValue(item);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(true);
      expect(result.reason).toBe('Manually completed');
    });

    it('should return isCompleted status for manual items (not completed)', async () => {
      const item = checklistItem({
        verificationType: 'manual',
        isCompleted: false,
      });
      mockChecklistFindByPk.mockResolvedValue(item);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('Awaiting manual check');
    });
  });

  // ════════════════════════════════════════
  // EDGE CASES
  // ════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle unknown check type gracefully', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item = checklistItem({
        verificationRule: { check: 'nonexistent_checker' },
      });
      mockChecklistFindByPk.mockResolvedValue(item);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('Unknown check type');
    });

    it('should handle missing verification rule', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item = checklistItem({
        verificationType: 'auto',
        verificationRule: null,
      });
      mockChecklistFindByPk.mockResolvedValue(item);

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('No verification rule configured');
    });

    it('should throw when checklist item not found', async () => {
      mockChecklistFindByPk.mockResolvedValue(null);

      await expect(verifyItem('bad-id')).rejects.toThrow('Checklist item not found');
    });

    it('should throw when gate not found (via verifyItem)', async () => {
      const item = checklistItem({ verificationRule: { check: 'has_document' } });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockGateFindByPk.mockResolvedValue(null);

      await expect(verifyItem(item.id)).rejects.toThrow('Gate not found');
    });

    it('should handle checker that throws an error', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item = checklistItem({
        verificationRule: { check: 'has_document', docType: ['ID'] },
      });
      mockChecklistFindByPk.mockResolvedValue(item);
      mockDocumentCount.mockRejectedValue(new Error('DB connection failed'));

      const result = await verifyItem(item.id);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('Verification error');
      expect(result.reason).toContain('DB connection failed');
    });
  });

  // ════════════════════════════════════════
  // FULL GATE VERIFICATION FLOW (verifyGate)
  // ════════════════════════════════════════

  describe('verifyGate', () => {
    it('should throw when gate not found', async () => {
      mockGateFindByPk.mockResolvedValue(null);

      await expect(verifyGate('bad-id')).rejects.toThrow('Gate not found');
    });

    it('should verify all items and return results', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: new Date('2025-01-01') }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item1 = checklistItem({
        id: 'chk-1',
        isMandatory: true,
        verificationType: 'auto',
        verificationRule: { check: 'has_document', docType: ['ID'] },
      });
      const item2 = checklistItem({
        id: 'chk-2',
        isMandatory: false,
        verificationType: 'auto',
        verificationRule: { check: 'has_note' },
      });
      mockChecklistFindAll.mockResolvedValue([item1, item2]);
      mockDocumentCount.mockResolvedValue(1);
      mockNoteCount.mockResolvedValue(0);

      const result = await verifyGate('gate-001');

      expect(result.gateId).toBe('gate-001');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].verified).toBe(true);
      expect(result.items[1].verified).toBe(false);
      expect(result.allMandatoryVerified).toBe(true);
      // Check that items were updated in DB
      expect(item1.update).toHaveBeenCalledWith(expect.objectContaining({ autoVerified: true }));
      expect(item2.update).toHaveBeenCalledWith(expect.objectContaining({ autoVerified: false }));
    });

    it('should return allMandatoryVerified = false when mandatory item fails', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item1 = checklistItem({
        id: 'chk-1',
        isMandatory: true,
        isCompleted: false,
        verificationType: 'auto',
        verificationRule: { check: 'has_document', docType: ['ID'] },
      });
      mockChecklistFindAll.mockResolvedValue([item1]);
      mockDocumentCount.mockResolvedValue(0);

      const result = await verifyGate('gate-001');

      expect(result.allMandatoryVerified).toBe(false);
    });

    it('should treat manual items as completed when isCompleted is true', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item1 = checklistItem({
        id: 'chk-1',
        isMandatory: true,
        verificationType: 'manual',
        isCompleted: true,
      });
      mockChecklistFindAll.mockResolvedValue([item1]);

      const result = await verifyGate('gate-001');

      expect(result.allMandatoryVerified).toBe(true);
      expect(result.items[0].verified).toBe(true);
      expect(result.items[0].reason).toBe('Manually completed');
    });

    it('should treat manual items as not completed when isCompleted is false', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item1 = checklistItem({
        id: 'chk-1',
        isMandatory: true,
        verificationType: 'manual',
        isCompleted: false,
      });
      mockChecklistFindAll.mockResolvedValue([item1]);

      const result = await verifyGate('gate-001');

      expect(result.allMandatoryVerified).toBe(false);
    });

    it('should treat overridden (isCompleted) mandatory items as passing', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item1 = checklistItem({
        id: 'chk-1',
        isMandatory: true,
        isCompleted: true, // overridden manually
        verificationType: 'auto',
        verificationRule: { check: 'has_document', docType: ['ID'] },
      });
      mockChecklistFindAll.mockResolvedValue([item1]);
      mockDocumentCount.mockResolvedValue(0); // auto-check fails

      const result = await verifyGate('gate-001');

      // Auto-check failed but isCompleted override means mandatory is satisfied
      expect(result.allMandatoryVerified).toBe(true);
    });

    it('should handle items with no verification rule in gate flow', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);

      const item1 = checklistItem({
        id: 'chk-1',
        isMandatory: false,
        verificationType: 'auto',
        verificationRule: null,
      });
      mockChecklistFindAll.mockResolvedValue([item1]);

      const result = await verifyGate('gate-001');

      expect(result.items[0].verified).toBe(false);
      expect(result.items[0].reason).toBe('No verification rule configured');
    });

    it('should handle empty checklist (no items)', async () => {
      const gate = mockModelInstance(mockGate({ playerId: 'player-001', startedAt: null }));
      mockGateFindByPk.mockResolvedValue(gate);
      mockChecklistFindAll.mockResolvedValue([]);

      const result = await verifyGate('gate-001');

      expect(result.items).toHaveLength(0);
      expect(result.allMandatoryVerified).toBe(true);
    });
  });
});
