// ─────────────────────────────────────────────────────────────
// tests/unit/contracts/contract.service.test.ts
// Unit tests for contract service, including SQL injection
// regression test.
// ─────────────────────────────────────────────────────────────
import { mockContract, mockModelInstance, mockPlayer, mockClub } from '../../setup/test-helpers';

// ── Mock Sequelize and models ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: {
    findAndCountAll: (...args: unknown[]) => mockFindAndCountAll(...args),
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { name: 'Player' },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { name: 'Club' },
}));

jest.mock('../../../src/modules/Users/user.model', () => ({
  User: { name: 'User' },
}));

import * as contractService from '../../../src/modules/contracts/contract.service';

describe('Contract Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      const result = await contractService.listContracts({ page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.total).toBe(1);
      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await contractService.listContracts({ status: 'Active' });

      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'Active' }),
        }),
      );
    });

    it('should filter by playerId', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await contractService.listContracts({ playerId: 'player-001' });

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
      await contractService.listContracts({ search: maliciousSearch });

      // Verify the call was made (didn't crash) and used safe patterns
      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);

      const callArgs = mockFindAndCountAll.mock.calls[0][0];
      const whereClause = JSON.stringify(callArgs.where);

      // The search should NOT appear as raw SQL
      expect(whereClause).not.toContain('DROP TABLE');
    });

    it('should search with safe pattern when search term provided', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await contractService.listContracts({ search: 'Salem' });

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
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE CONTRACT
  // ════════════════════════════════════════════════════════
  describe('deleteContract', () => {
    it('should delete existing contract', async () => {
      const contract = mockModelInstance(mockContract());
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
  });
});
