/// <reference types="jest" />
import { mockClearance, mockModelInstance } from '../../setup/test-helpers';

const mockClearanceFindAndCountAll = jest.fn();
const mockClearanceFindByPk = jest.fn();
const mockClearanceFindOne = jest.fn();
const mockClearanceFindAll = jest.fn();
const mockClearanceCreate = jest.fn();

const mockContractFindByPk = jest.fn();
const mockContractUpdate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/clearances/clearance.model', () => ({
  Clearance: {
    findAndCountAll: (...a: unknown[]) => mockClearanceFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockClearanceFindByPk(...a),
    findOne: (...a: unknown[]) => mockClearanceFindOne(...a),
    findAll: (...a: unknown[]) => mockClearanceFindAll(...a),
    create: (...a: unknown[]) => mockClearanceCreate(...a),
  },
}));

jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: {
    findByPk: (...a: unknown[]) => mockContractFindByPk(...a),
    update: (...a: unknown[]) => mockContractUpdate(...a),
    name: 'Contract',
  },
}));
jest.mock('../../../src/modules/players/player.model', () => ({ Player: { name: 'Player' } }));
jest.mock('../../../src/modules/Users/user.model', () => ({ User: { name: 'User' } }));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as clearanceService from '../../../src/modules/clearances/clearance.service';

describe('Clearance Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listClearances', () => {
    it('should return paginated clearances', async () => {
      mockClearanceFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockClearance())] });
      const result = await clearanceService.listClearances({ page: 1, limit: 20 });
      expect(result.clearances).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockClearanceFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await clearanceService.listClearances({ status: 'Processing', page: 1, limit: 20 });
      expect(mockClearanceFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by contractId', async () => {
      mockClearanceFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await clearanceService.listClearances({ contractId: 'contract-001', page: 1, limit: 20 });
      expect(mockClearanceFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getClearanceById', () => {
    it('should return clearance', async () => {
      mockClearanceFindByPk.mockResolvedValue(mockModelInstance(mockClearance()));
      const result = await clearanceService.getClearanceById('clr-001');
      expect(result).toBeDefined();
    });
  });

  describe('createClearance', () => {
    it('should create clearance for active contract', async () => {
      mockContractFindByPk.mockResolvedValue(mockModelInstance({ id: 'contract-001', status: 'Active', playerId: 'player-001' }));
      mockClearanceFindOne.mockResolvedValue(null);
      mockClearanceCreate.mockResolvedValue(mockModelInstance(mockClearance()));
      mockClearanceFindByPk.mockResolvedValue(mockModelInstance(mockClearance()));
      const result = await clearanceService.createClearance({ contractId: 'contract-001' }, 'user-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if contract not found', async () => {
      mockContractFindByPk.mockResolvedValue(null);
      await expect(clearanceService.createClearance({ contractId: 'bad' }, 'user-001')).rejects.toThrow('Contract not found');
    });

    it('should throw 400 if contract not terminable', async () => {
      mockContractFindByPk.mockResolvedValue(mockModelInstance({ id: 'contract-001', status: 'Terminated', playerId: 'player-001' }));
      await expect(clearanceService.createClearance({ contractId: 'contract-001' }, 'user-001')).rejects.toThrow('Cannot create clearance');
    });

    it('should throw 400 if active clearance exists', async () => {
      mockContractFindByPk.mockResolvedValue(mockModelInstance({ id: 'contract-001', status: 'Active', playerId: 'player-001' }));
      mockClearanceFindOne.mockResolvedValue(mockModelInstance(mockClearance()));
      await expect(clearanceService.createClearance({ contractId: 'contract-001' }, 'user-001')).rejects.toThrow('active clearance already exists');
    });
  });

  describe('updateClearance', () => {
    it('should update clearance', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Processing' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      await clearanceService.updateClearance('clr-001', { notes: 'Updated' });
      expect(clr.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockClearanceFindByPk.mockResolvedValue(null);
      await expect(clearanceService.updateClearance('bad', {})).rejects.toThrow('Clearance not found');
    });

    it('should throw 400 if completed', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Completed' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      await expect(clearanceService.updateClearance('clr-001', {})).rejects.toThrow('Cannot update a completed clearance');
    });
  });

  describe('completeClearance', () => {
    it('should complete clearance with digital signing', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Processing', noClaimsDeclaration: true, contractId: 'contract-001' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      mockContractUpdate.mockResolvedValue([1]);
      await clearanceService.completeClearance('clr-001', { action: 'sign_digital', signatureData: 'sig-data' });
      expect(clr.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed', signingMethod: 'digital' }));
      expect(mockContractUpdate).toHaveBeenCalled();
    });

    it('should complete clearance with uploaded document', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Processing', noClaimsDeclaration: true, contractId: 'contract-001' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      mockContractUpdate.mockResolvedValue([1]);
      await clearanceService.completeClearance('clr-001', { action: 'sign_upload', signedDocumentUrl: '/docs/signed.pdf' });
      expect(clr.update).toHaveBeenCalledWith(expect.objectContaining({ signingMethod: 'upload' }));
    });

    it('should throw 404 if not found', async () => {
      mockClearanceFindByPk.mockResolvedValue(null);
      await expect(clearanceService.completeClearance('bad', {})).rejects.toThrow('Clearance not found');
    });

    it('should throw 400 if already completed', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Completed' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      await expect(clearanceService.completeClearance('clr-001', {})).rejects.toThrow('already completed');
    });

    it('should throw 400 if no-claims not accepted', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Processing', noClaimsDeclaration: false }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      await expect(clearanceService.completeClearance('clr-001', {})).rejects.toThrow('No-claims declaration');
    });
  });

  describe('deleteClearance', () => {
    it('should delete processing clearance', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Processing' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      await clearanceService.deleteClearance('clr-001');
      expect(clr.destroy).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockClearanceFindByPk.mockResolvedValue(null);
      await expect(clearanceService.deleteClearance('bad')).rejects.toThrow('Clearance not found');
    });

    it('should throw 400 if completed', async () => {
      const clr = mockModelInstance(mockClearance({ status: 'Completed' }));
      mockClearanceFindByPk.mockResolvedValue(clr);
      await expect(clearanceService.deleteClearance('clr-001')).rejects.toThrow('Cannot delete a completed clearance');
    });
  });

  describe('getClearancesByContract', () => {
    it('should return clearances for contract', async () => {
      mockClearanceFindAll.mockResolvedValue([mockModelInstance(mockClearance())]);
      const result = await clearanceService.getClearancesByContract('contract-001');
      expect(result).toHaveLength(1);
    });
  });
});
