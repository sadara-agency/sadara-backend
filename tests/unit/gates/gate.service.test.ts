/// <reference types="jest" />
import { mockGate, mockGateChecklist, mockModelInstance } from '../../setup/test-helpers';

const mockGateFindAndCountAll = jest.fn();
const mockGateFindByPk = jest.fn();
const mockGateFindAll = jest.fn();
const mockGateFindOne = jest.fn();
const mockGateCreate = jest.fn();

const mockChecklistFindByPk = jest.fn();
const mockChecklistFindAll = jest.fn();
const mockChecklistCreate = jest.fn();
const mockChecklistBulkCreate = jest.fn();

const mockPlayerFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/gates/gate.model', () => ({
  Gate: {
    findAndCountAll: (...a: unknown[]) => mockGateFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockGateFindByPk(...a),
    findAll: (...a: unknown[]) => mockGateFindAll(...a),
    findOne: (...a: unknown[]) => mockGateFindOne(...a),
    create: (...a: unknown[]) => mockGateCreate(...a),
  },
  GateChecklist: {
    findByPk: (...a: unknown[]) => mockChecklistFindByPk(...a),
    findAll: (...a: unknown[]) => mockChecklistFindAll(...a),
    create: (...a: unknown[]) => mockChecklistCreate(...a),
    bulkCreate: (...a: unknown[]) => mockChecklistBulkCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));
jest.mock('../../../src/modules/Users/user.model', () => ({ User: { name: 'User' } }));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as gateService from '../../../src/modules/gates/gate.service';

describe('Gate Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listGates', () => {
    it('should return paginated gates', async () => {
      mockGateFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockGate())] });
      const result = await gateService.listGates({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockGateFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await gateService.listGates({ status: 'InProgress', page: 1, limit: 10 });
      expect(mockGateFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by playerId', async () => {
      mockGateFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await gateService.listGates({ playerId: 'player-001', page: 1, limit: 10 });
      expect(mockGateFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockGateFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await gateService.listGates({ search: 'Ahmed', page: 1, limit: 10 });
      expect(mockGateFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getGateById', () => {
    it('should return gate with progress', async () => {
      const gate = mockModelInstance(mockGate());
      mockGateFindByPk.mockResolvedValue(gate);
      mockChecklistFindAll.mockResolvedValue([
        mockModelInstance(mockGateChecklist({ isCompleted: true })),
        mockModelInstance(mockGateChecklist({ isCompleted: false })),
      ]);
      const result = await gateService.getGateById('gate-001');
      expect(result).toHaveProperty('progress', 50);
    });

    it('should throw 404 if not found', async () => {
      mockGateFindByPk.mockResolvedValue(null);
      await expect(gateService.getGateById('bad')).rejects.toThrow('Gate not found');
    });
  });

  describe('getPlayerGates', () => {
    it('should return player gates with overall progress', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001' }));
      mockGateFindAll.mockResolvedValue([
        mockModelInstance(mockGate({ gateNumber: '0', checklist: [mockGateChecklist({ isCompleted: true })] })),
      ]);
      const result = await gateService.getPlayerGates('player-001');
      expect(result).toHaveProperty('player');
      expect(result).toHaveProperty('gates');
      expect(result).toHaveProperty('overallProgress');
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(gateService.getPlayerGates('bad')).rejects.toThrow('Player not found');
    });
  });

  describe('createGate', () => {
    it('should create gate 0 without prerequisite', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001' }));
      mockGateFindOne.mockResolvedValue(null);
      mockGateCreate.mockResolvedValue(mockModelInstance(mockGate()));
      const result = await gateService.createGate({ playerId: 'player-001', gateNumber: '0' });
      expect(result).toBeDefined();
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(gateService.createGate({ playerId: 'bad', gateNumber: '0' })).rejects.toThrow('Player not found');
    });

    it('should throw 409 if gate already exists', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001' }));
      mockGateFindOne.mockResolvedValue(mockModelInstance(mockGate()));
      await expect(gateService.createGate({ playerId: 'player-001', gateNumber: '0' })).rejects.toThrow('already exists');
    });

    it('should throw 400 if previous gate not completed', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockModelInstance({ id: 'player-001' }));
      mockGateFindOne
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(mockModelInstance(mockGate({ status: 'InProgress' }))); // prev gate
      await expect(gateService.createGate({ playerId: 'player-001', gateNumber: '1' })).rejects.toThrow('must be completed');
    });
  });

  describe('advanceGate', () => {
    it('should start a pending gate', async () => {
      const gate = mockModelInstance(mockGate({ status: 'Pending' }));
      mockGateFindByPk.mockResolvedValue(gate);
      await gateService.advanceGate('gate-001', 'start', 'user-001');
      expect(gate.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'InProgress' }));
    });

    it('should complete a gate with all mandatory items done', async () => {
      const gate = mockModelInstance(mockGate({ status: 'InProgress', checklist: [mockGateChecklist({ isMandatory: true, isCompleted: true })] }));
      mockGateFindByPk.mockResolvedValue(gate);
      await gateService.advanceGate('gate-001', 'complete', 'user-001');
      expect(gate.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed' }));
    });

    it('should throw 400 if mandatory items incomplete', async () => {
      const gate = mockModelInstance(mockGate({ status: 'InProgress', checklist: [mockGateChecklist({ isMandatory: true, isCompleted: false })] }));
      mockGateFindByPk.mockResolvedValue(gate);
      await expect(gateService.advanceGate('gate-001', 'complete', 'user-001')).rejects.toThrow('mandatory checklist item');
    });

    it('should throw 400 if starting non-pending gate', async () => {
      const gate = mockModelInstance(mockGate({ status: 'InProgress' }));
      mockGateFindByPk.mockResolvedValue(gate);
      await expect(gateService.advanceGate('gate-001', 'start', 'user-001')).rejects.toThrow('only be started from Pending');
    });

    it('should throw 404 if gate not found', async () => {
      mockGateFindByPk.mockResolvedValue(null);
      await expect(gateService.advanceGate('bad', 'start', 'user-001')).rejects.toThrow('Gate not found');
    });
  });

  describe('updateGate', () => {
    it('should update gate', async () => {
      const gate = mockModelInstance(mockGate({ status: 'InProgress' }));
      mockGateFindByPk.mockResolvedValue(gate);
      await gateService.updateGate('gate-001', { notes: 'Updated' });
      expect(gate.update).toHaveBeenCalled();
    });

    it('should throw 400 if gate is completed', async () => {
      const gate = mockModelInstance(mockGate({ status: 'Completed' }));
      mockGateFindByPk.mockResolvedValue(gate);
      await expect(gateService.updateGate('gate-001', {})).rejects.toThrow('Cannot modify a completed gate');
    });

    it('should throw 404 if not found', async () => {
      mockGateFindByPk.mockResolvedValue(null);
      await expect(gateService.updateGate('bad', {})).rejects.toThrow('Gate not found');
    });
  });

  describe('deleteGate', () => {
    it('should delete gate', async () => {
      const gate = mockModelInstance(mockGate({ status: 'InProgress' }));
      mockGateFindByPk.mockResolvedValue(gate);
      const result = await gateService.deleteGate('gate-001');
      expect(gate.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'gate-001' });
    });

    it('should throw 400 if completed', async () => {
      const gate = mockModelInstance(mockGate({ status: 'Completed' }));
      mockGateFindByPk.mockResolvedValue(gate);
      await expect(gateService.deleteGate('gate-001')).rejects.toThrow('Cannot delete a completed gate');
    });

    it('should throw 404 if not found', async () => {
      mockGateFindByPk.mockResolvedValue(null);
      await expect(gateService.deleteGate('bad')).rejects.toThrow('Gate not found');
    });
  });

  // ── CHECKLIST ──

  describe('addChecklistItem', () => {
    it('should add checklist item', async () => {
      const gate = mockModelInstance(mockGate({ status: 'InProgress' }));
      mockGateFindByPk.mockResolvedValue(gate);
      mockChecklistCreate.mockResolvedValue(mockModelInstance(mockGateChecklist()));
      const result = await gateService.addChecklistItem('gate-001', { item: 'Test Item' });
      expect(result).toBeDefined();
    });

    it('should throw 400 if gate completed', async () => {
      const gate = mockModelInstance(mockGate({ status: 'Completed' }));
      mockGateFindByPk.mockResolvedValue(gate);
      await expect(gateService.addChecklistItem('gate-001', { item: 'Test' })).rejects.toThrow('Cannot modify checklist');
    });

    it('should throw 404 if gate not found', async () => {
      mockGateFindByPk.mockResolvedValue(null);
      await expect(gateService.addChecklistItem('bad', { item: 'x' })).rejects.toThrow('Gate not found');
    });
  });

  describe('toggleChecklistItem', () => {
    it('should toggle item to completed', async () => {
      const item = mockModelInstance(mockGateChecklist({ gateId: 'gate-001' }));
      mockChecklistFindByPk.mockResolvedValue(item);
      mockGateFindByPk.mockResolvedValue(mockModelInstance(mockGate({ status: 'InProgress' })));
      await gateService.toggleChecklistItem('chk-001', { isCompleted: true }, 'user-001', 'Admin');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ isCompleted: true, completedBy: 'user-001' }));
    });

    it('should toggle item to uncompleted', async () => {
      const item = mockModelInstance(mockGateChecklist({ gateId: 'gate-001' }));
      mockChecklistFindByPk.mockResolvedValue(item);
      mockGateFindByPk.mockResolvedValue(mockModelInstance(mockGate({ status: 'InProgress' })));
      await gateService.toggleChecklistItem('chk-001', { isCompleted: false }, 'user-001', 'Admin');
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ isCompleted: false, completedAt: null, completedBy: null }));
    });

    it('should throw 400 if gate completed', async () => {
      const item = mockModelInstance(mockGateChecklist({ gateId: 'gate-001' }));
      mockChecklistFindByPk.mockResolvedValue(item);
      mockGateFindByPk.mockResolvedValue(mockModelInstance(mockGate({ status: 'Completed' })));
      await expect(gateService.toggleChecklistItem('chk-001', { isCompleted: true }, 'user-001', 'Admin')).rejects.toThrow('Cannot modify checklist');
    });

    it('should throw 404 if item not found', async () => {
      mockChecklistFindByPk.mockResolvedValue(null);
      await expect(gateService.toggleChecklistItem('bad', { isCompleted: true }, 'user-001', 'Admin')).rejects.toThrow('Checklist item not found');
    });
  });

  describe('deleteChecklistItem', () => {
    it('should delete checklist item', async () => {
      const item = mockModelInstance(mockGateChecklist({ gateId: 'gate-001' }));
      mockChecklistFindByPk.mockResolvedValue(item);
      mockGateFindByPk.mockResolvedValue(mockModelInstance(mockGate({ status: 'InProgress' })));
      const result = await gateService.deleteChecklistItem('chk-001');
      expect(item.destroy).toHaveBeenCalled();
    });

    it('should throw 400 if gate completed', async () => {
      const item = mockModelInstance(mockGateChecklist({ gateId: 'gate-001' }));
      mockChecklistFindByPk.mockResolvedValue(item);
      mockGateFindByPk.mockResolvedValue(mockModelInstance(mockGate({ status: 'Completed' })));
      await expect(gateService.deleteChecklistItem('chk-001')).rejects.toThrow('Cannot modify checklist');
    });

    it('should throw 404 if item not found', async () => {
      mockChecklistFindByPk.mockResolvedValue(null);
      await expect(gateService.deleteChecklistItem('bad')).rejects.toThrow('Checklist item not found');
    });
  });
});
