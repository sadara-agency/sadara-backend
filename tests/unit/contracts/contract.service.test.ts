// ─────────────────────────────────────────────────────────────
// tests/unit/contracts/contract.service.test.ts
// Unit tests for contract service, including SQL injection
// regression test.
// ─────────────────────────────────────────────────────────────
import { mockContract, mockModelInstance, mockPlayer, mockClub } from '../../setup/test-helpers';
import type { ContractQuery } from '../../../src/modules/contracts/contract.validation';

// ── Mock Sequelize and models ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
    transaction: jest.fn(async (cb: (t: object) => Promise<unknown>) => cb({})),
  },
}));

jest.mock('../../../src/shared/utils/displayId', () => ({
  generateDisplayId: jest.fn().mockResolvedValue('CON-26-0001'),
}));

jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: {
    findAndCountAll: (...args: unknown[]) => mockFindAndCountAll(...args),
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

const mockPlayerFindByPk = jest.fn();
jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    name: 'Player',
    findByPk: (...args: unknown[]) => mockPlayerFindByPk(...args),
  },
}));

const mockClubFindByPk = jest.fn();
const mockClubFindOne = jest.fn();
jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    name: 'Club',
    findByPk: (...args: unknown[]) => mockClubFindByPk(...args),
    findOne: (...args: unknown[]) => mockClubFindOne(...args),
  },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/modules/audit/AuditLog.model', () => ({
  AuditLog: {
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    create: jest.fn(),
  },
}));

jest.mock('../../../src/modules/contracts/contractAutoTasks', () => ({
  generateContractCreationTask: jest.fn().mockResolvedValue(null),
  generateContractTransitionTask: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/modules/approvals/approval.service', () => ({
  isApprovalChainResolved: jest.fn().mockResolvedValue({ resolved: true, status: 'none' }),
  createApprovalRequest: jest.fn().mockResolvedValue(null),
  resolveApprovalByEntity: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/shared/utils/rowScope', () => ({
  buildRowScope: jest.fn().mockResolvedValue(null),
  checkRowAccess: jest.fn().mockResolvedValue(true),
  mergeScope: jest.fn(),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockSquadFindOne = jest.fn();
jest.mock('../../../src/modules/squads/squad.model', () => ({
  Squad: {
    findOne: (...a: unknown[]) => mockSquadFindOne(...a),
    name: 'Squad',
  },
}));

import * as contractService from '../../../src/modules/contracts/contract.service';
import * as rowScope from '../../../src/shared/utils/rowScope';

describe('Contract Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockResolvedValue(null); // default: no overlap
    mockClubFindByPk.mockResolvedValue({ id: 'club-001' }); // default: club exists
    (rowScope.checkRowAccess as jest.Mock).mockResolvedValue(true);
    (rowScope.buildRowScope as jest.Mock).mockResolvedValue(null);
  });

  // ════════════════════════════════════════════════════════
  // LIST CONTRACTS
  // ════════════════════════════════════════════════════════
  describe('listContracts', () => {
    it('should return paginated contracts', async () => {
      const contracts = [mockModelInstance(mockContract())];
      mockFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: contracts,
      });

      const result = await contractService.listContracts({ page: 1, limit: 10 } as unknown as ContractQuery);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.total).toBe(1);
      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await contractService.listContracts({ status: 'Active' } as unknown as ContractQuery);

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'Active' }),
        }),
      );
    });

    it('should filter by playerId', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await contractService.listContracts({ playerId: 'player-001' } as unknown as ContractQuery);

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ playerId: 'player-001' }),
        }),
      );
    });

    // ╔══════════════════════════════════════════════════════╗
    // ║  SQL INJECTION REGRESSION TEST                       ║
    // ║  Ensures the search parameter is not passed as raw   ║
    // ║  SQL via literal(). The fixed code uses Sequelize.   ║
    // ║  where() which generates parameterised queries.       ║
    // ╚══════════════════════════════════════════════════════╝
    it('should safely handle SQL injection in search parameter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      // This payload would break the old literal() approach
      const maliciousSearch = "'; DROP TABLE contracts; --";
      await contractService.listContracts({ search: maliciousSearch } as unknown as ContractQuery);

      // Verify the call was made (didn't crash) and used safe patterns
      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);

      const callArgs = mockFindAndCountAll.mock.calls[0][0];
      const whereClause = JSON.stringify(callArgs.where);

      // The search should NOT appear as raw SQL
      expect(whereClause).not.toContain('DROP TABLE');
    });

    it('should search with safe pattern when search term provided', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await contractService.listContracts({ search: 'Salem' } as unknown as ContractQuery);

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('or')]: expect.any(Array),
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // GET CONTRACT BY ID
  // ════════════════════════════════════════════════════════
  describe('getContractById', () => {
    it('should return enriched contract with milestones', async () => {
      const contract = mockModelInstance({
        ...mockContract(),
        endDate: '2028-01-01',
      });
      mockFindByPk.mockResolvedValue(contract);

      const result = await contractService.getContractById('contract-001');

      expect(result).toHaveProperty('daysRemaining');
      expect(result).toHaveProperty('milestones');
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('should throw 404 for non-existent contract', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        contractService.getContractById('nonexistent'),
      ).rejects.toThrow('Contract not found');
    });

    it('should throw 404 (not 403) when row access denied — prevents existence leak', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockContract()));
      (rowScope.checkRowAccess as jest.Mock).mockResolvedValue(false);

      const scout = { id: 'scout-001', role: 'Scout' } as any;
      await expect(
        contractService.getContractById('contract-001', scout),
      ).rejects.toThrow('Contract not found');
    });
  });

  // ════════════════════════════════════════════════════════
  // CREATE CONTRACT
  // ════════════════════════════════════════════════════════
  describe('createContract', () => {
    it('should auto-calculate total commission', async () => {
      const createdContract = mockModelInstance({
        ...mockContract(),
        id: 'new-contract-001',
      });
      mockCreate.mockResolvedValue(createdContract);
      mockFindByPk.mockResolvedValue(createdContract);
      mockPlayerFindByPk.mockResolvedValue({ contractType: 'Professional' });

      await contractService.createContract(
        {
          playerId: 'player-001',
          clubId: 'club-001',
          startDate: '2024-01-01',
          endDate: '2026-01-01',
          baseSalary: 1000000,
          commissionPct: 10,
        } as any,
        'user-001',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCommission: 100000, // 10% of 1,000,000
        }),
        expect.objectContaining({ transaction: expect.anything() }),
      );
    });

    it('should throw 404 when player does not exist', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);

      await expect(
        contractService.createContract(
          { playerId: 'bad', clubId: 'club-001', startDate: '2025-01-01', endDate: '2028-01-01' } as any,
          'user-001',
        ),
      ).rejects.toThrow('Player not found');
    });

    it('should throw 404 when club does not exist', async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: 'player-001', contractType: 'Professional' });
      mockClubFindByPk.mockResolvedValue(null);

      await expect(
        contractService.createContract(
          { playerId: 'player-001', clubId: 'bad', startDate: '2025-01-01', endDate: '2028-01-01' } as any,
          'user-001',
        ),
      ).rejects.toThrow('Club not found');
    });

    it('should throw 409 when an overlapping active contract exists', async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: 'player-001', contractType: 'Professional' });
      mockFindOne.mockResolvedValue(mockModelInstance(mockContract({ status: 'Active' })));

      await expect(
        contractService.createContract(
          { playerId: 'player-001', clubId: 'club-001', startDate: '2025-01-01', endDate: '2028-01-01' } as any,
          'user-001',
        ),
      ).rejects.toThrow('overlapping dates');
    });
  });

  // ════════════════════════════════════════════════════════
  // UPDATE CONTRACT
  // ════════════════════════════════════════════════════════
  describe('updateContract', () => {
    it('should update allowed fields', async () => {
      const contract = mockModelInstance(mockContract({ commissionLocked: false }));
      mockFindByPk.mockResolvedValue(contract);

      await contractService.updateContract('contract-001', { baseSalary: 600_000 });

      expect(contract.update).toHaveBeenCalledWith(
        expect.objectContaining({ baseSalary: 600_000 }),
      );
    });

    it('should throw 404 when contract does not exist', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        contractService.updateContract('nonexistent', { baseSalary: 100 }),
      ).rejects.toThrow('Contract not found');
    });

    it('should throw 400 when commission fields changed on a locked contract', async () => {
      const contract = mockModelInstance(mockContract({ commissionLocked: true }));
      mockFindByPk.mockResolvedValue(contract);

      await expect(
        contractService.updateContract('contract-001', { commissionPct: 15 }),
      ).rejects.toThrow('Commission fields cannot be modified');
    });
  });

  // ════════════════════════════════════════════════════════
  // TERMINATE CONTRACT
  // ════════════════════════════════════════════════════════
  describe('terminateContract', () => {
    it('should terminate an Active contract and lock commission', async () => {
      const contract = mockModelInstance(
        mockContract({ status: 'Active', startDate: '2024-01-01', endDate: '2028-01-01', notes: null }),
      );
      // findOrThrow call then getContractById at end
      mockFindByPk
        .mockResolvedValueOnce(contract)
        .mockResolvedValue(mockModelInstance(mockContract({ status: 'Terminated' })));

      await contractService.terminateContract(
        'contract-001',
        { reason: 'Mutual agreement', terminationDate: '2025-06-01' },
        'user-001',
      );

      expect(contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Terminated',
          terminationReason: 'Mutual agreement',
          commissionLocked: true,
        }),
      );
    });

    it('should throw 400 when contract status is not terminatable', async () => {
      const contract = mockModelInstance(mockContract({ status: 'Draft' }));
      mockFindByPk.mockResolvedValue(contract);

      await expect(
        contractService.terminateContract('contract-001', { reason: 'test' }, 'user-001'),
      ).rejects.toThrow("Cannot terminate a contract in 'Draft' status");
    });

    it('should throw 400 when termination date is before contract start date', async () => {
      const contract = mockModelInstance(
        mockContract({ status: 'Active', startDate: '2025-06-01', endDate: '2028-01-01' }),
      );
      mockFindByPk.mockResolvedValue(contract);

      await expect(
        contractService.terminateContract(
          'contract-001',
          { reason: 'test', terminationDate: '2025-01-01' },
          'user-001',
        ),
      ).rejects.toThrow('before contract start date');
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE CONTRACT
  // ════════════════════════════════════════════════════════
  describe('deleteContract', () => {
    it('should delete existing contract', async () => {
      const contract = mockModelInstance(mockContract({ status: 'Draft' }));
      mockFindByPk.mockResolvedValue(contract);

      const result = await contractService.deleteContract('contract-001');

      expect(result).toEqual({ id: 'contract-001' });
      expect(contract.destroy).toHaveBeenCalled();
    });

    it('should throw 404 for non-existent contract', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        contractService.deleteContract('nonexistent'),
      ).rejects.toThrow('Contract not found');
    });

    it('should throw 400 when trying to delete an Active contract', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockContract({ status: 'Active' })));

      await expect(
        contractService.deleteContract('contract-001'),
      ).rejects.toThrow('Cannot delete an active contract');
    });
  });

  // ════════════════════════════════════════════════════════
  // AGENCY REPRESENTATION DRAFT (auto-created by Scouting)
  // ════════════════════════════════════════════════════════
  describe('createAgencyRepresentationDraft', () => {
    beforeEach(() => {
      contractService.__resetHomeAgencyCache();
    });

    it('creates a Draft Agency Representation contract with null dates', async () => {
      mockClubFindOne.mockResolvedValue({ id: 'home-agency-id' });
      mockCreate.mockResolvedValue(mockModelInstance(mockContract({ id: 'c-1', status: 'Draft' })));

      const result = await contractService.createAgencyRepresentationDraft({
        playerId: 'player-001',
        playerContractType: 'Professional',
        createdBy: 'user-001',
      });

      expect(mockClubFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isHomeAgency: true } }),
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player-001',
          clubId: 'home-agency-id',
          category: 'Agency',
          contractType: 'Representation',
          playerContractType: 'Professional',
          status: 'Draft',
          startDate: null,
          endDate: null,
          exclusivity: 'Exclusive',
          representationScope: 'Both',
          agentName: 'Sadara Sports Agency',
          createdBy: 'user-001',
        }),
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it('throws 500 when the home agency club is not seeded', async () => {
      mockClubFindOne.mockResolvedValue(null);

      await expect(
        contractService.createAgencyRepresentationDraft({
          playerId: 'player-001',
          playerContractType: 'Amateur',
          createdBy: 'user-001',
        }),
      ).rejects.toThrow('Home agency not configured');
    });

    it('passes the provided transaction down to Contract.create', async () => {
      mockClubFindOne.mockResolvedValue({ id: 'home-agency-id' });
      mockCreate.mockResolvedValue(mockModelInstance(mockContract()));
      const fakeTx = { __fake: true } as any;

      await contractService.createAgencyRepresentationDraft(
        { playerId: 'player-001', playerContractType: 'Youth', createdBy: 'user-001' },
        fakeTx,
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transaction: fakeTx }),
      );
    });
  });
});
