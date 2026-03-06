/// <reference types="jest" />

const mockPlayerFindByPk = jest.fn();
const mockPlayerFindOne = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockContractFindByPk = jest.fn();
const mockContractFindOne = jest.fn();
const mockContractFindAll = jest.fn();
const mockMatchFindAll = jest.fn();
const mockDocumentFindAll = jest.fn();
const mockGateFindAll = jest.fn();
const mockTaskFindAll = jest.fn();
const mockInjuryFindAll = jest.fn();
const mockSequelizeQuery = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: (...a: unknown[]) => mockSequelizeQuery(...a),
    authenticate: jest.fn(),
    transaction: (cb: (t: any) => Promise<any>) => cb({ LOCK: { UPDATE: 'UPDATE' } }),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    findOne: (...a: unknown[]) => mockPlayerFindOne(...a),
    name: 'Player',
  },
}));
jest.mock('../../../src/modules/Users/user.model', () => ({
  User: {
    findByPk: (...a: unknown[]) => mockUserFindByPk(...a),
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
    create: (...a: unknown[]) => mockUserCreate(...a),
    name: 'User',
  },
}));
jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: {
    findByPk: (...a: unknown[]) => mockContractFindByPk(...a),
    findOne: (...a: unknown[]) => mockContractFindOne(...a),
    findAll: (...a: unknown[]) => mockContractFindAll(...a),
    name: 'Contract',
  },
}));
jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { findAll: (...a: unknown[]) => mockMatchFindAll(...a), name: 'Match' },
}));
jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: { findAll: (...a: unknown[]) => mockDocumentFindAll(...a), name: 'Document' },
}));
jest.mock('../../../src/modules/gates/gate.model', () => ({
  Gate: { findAll: (...a: unknown[]) => mockGateFindAll(...a), name: 'Gate' },
  GateChecklist: { name: 'GateChecklist' },
}));
jest.mock('../../../src/modules/tasks/task.model', () => ({
  Task: { findAll: (...a: unknown[]) => mockTaskFindAll(...a), name: 'Task' },
}));
jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: { findAll: (...a: unknown[]) => mockInjuryFindAll(...a), name: 'Injury' },
  InjuryUpdate: { name: 'InjuryUpdate' },
}));
jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { name: 'Club' },
}));
jest.mock('../../../src/config/env', () => ({
  env: { bcrypt: { saltRounds: 10 }, frontend: { url: 'http://localhost:3000' } },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as portalService from '../../../src/modules/portal/portal.service';

// Helper
const mockPlayerInst = (overrides: any = {}) => ({
  id: 'player-001',
  firstName: 'Ahmed',
  lastName: 'Ali',
  firstNameAr: 'أحمد',
  lastNameAr: 'علي',
  email: 'ahmed@test.com',
  currentClubId: 'club-001',
  position: 'ST',
  getDataValue: (k: string) => (overrides[k] ?? ({ id: 'player-001', firstName: 'Ahmed', lastName: 'Ali' } as any)[k]),
  update: jest.fn().mockResolvedValue({}),
  ...overrides,
});

describe('Portal Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('getLinkedPlayer', () => {
    it('should resolve player from User with playerId', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      const result = await portalService.getLinkedPlayer('user-001');
      expect(result.id).toBe('player-001');
    });

    it('should resolve player from User email if no playerId', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'ahmed@test.com', role: 'Player', playerId: null, update: jest.fn() });
      mockPlayerFindByPk.mockResolvedValue(null); // no direct playerId
      mockPlayerFindOne.mockResolvedValue(mockPlayerInst());
      const result = await portalService.getLinkedPlayer('user-001');
      expect(result.id).toBe('player-001');
    });

    it('should throw 403 if user is not Player role', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Admin' });
      await expect(portalService.getLinkedPlayer('user-001')).rejects.toThrow('player accounts only');
    });

    it('should throw 404 if no player linked', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: null, update: jest.fn() });
      mockPlayerFindByPk.mockResolvedValue(null);
      mockPlayerFindOne.mockResolvedValue(null);
      await expect(portalService.getLinkedPlayer('user-001')).rejects.toThrow('No player profile linked');
    });

    it('should resolve from player_accounts table', async () => {
      mockUserFindByPk.mockResolvedValue(null);
      mockSequelizeQuery.mockResolvedValue([{ player_id: 'player-001', status: 'active' }]);
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      const result = await portalService.getLinkedPlayer('user-001');
      expect(result.id).toBe('player-001');
    });

    it('should throw 404 if user not found anywhere', async () => {
      mockUserFindByPk.mockResolvedValue(null);
      mockSequelizeQuery.mockResolvedValue([]);
      await expect(portalService.getLinkedPlayer('bad')).rejects.toThrow('User not found');
    });

    it('should throw 403 if player account not active', async () => {
      mockUserFindByPk.mockResolvedValue(null);
      mockSequelizeQuery.mockResolvedValue([{ player_id: 'player-001', status: 'pending' }]);
      await expect(portalService.getLinkedPlayer('user-001')).rejects.toThrow('not yet activated');
    });
  });

  describe('getMyProfile', () => {
    it('should return player profile with stats', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockContractFindOne.mockResolvedValue(null);
      mockSequelizeQuery.mockResolvedValue([{ activeContracts: 1, totalDocuments: 5, openTasks: 2, currentGate: 1 }]);
      const result = await portalService.getMyProfile('user-001');
      expect(result).toHaveProperty('player');
      expect(result).toHaveProperty('stats');
    });
  });

  describe('getMySchedule', () => {
    it('should return upcoming and past matches', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockMatchFindAll.mockResolvedValue([]);
      mockTaskFindAll.mockResolvedValue([]);
      const result = await portalService.getMySchedule('user-001');
      expect(result).toHaveProperty('upcoming');
      expect(result).toHaveProperty('past');
      expect(result).toHaveProperty('tasks');
    });

    it('should return empty if no club', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst({ currentClubId: null }));
      const result = await portalService.getMySchedule('user-001');
      expect(result.upcoming).toEqual([]);
    });
  });

  describe('signMyContract', () => {
    it('should sign contract digitally', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      const contract = { id: 'c-001', playerId: 'player-001', status: 'AwaitingPlayer', update: jest.fn().mockResolvedValue({}) };
      mockContractFindByPk.mockResolvedValue(contract);
      const result = await portalService.signMyContract('user-001', 'c-001', 'sign_digital', 'sig-data');
      expect(contract.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Active', signingMethod: 'digital', commissionLocked: true }), expect.any(Object));
    });

    it('should throw 403 if contract not owned', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockContractFindByPk.mockResolvedValue({ id: 'c-001', playerId: 'other-player', status: 'AwaitingPlayer' });
      await expect(portalService.signMyContract('user-001', 'c-001', 'sign_digital', 'sig')).rejects.toThrow('not authorized');
    });

    it('should throw 400 if not awaiting player', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockContractFindByPk.mockResolvedValue({ id: 'c-001', playerId: 'player-001', status: 'Active' });
      await expect(portalService.signMyContract('user-001', 'c-001', 'sign_digital', 'sig')).rejects.toThrow('not awaiting your signature');
    });

    it('should throw 404 if contract not found', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockContractFindByPk.mockResolvedValue(null);
      await expect(portalService.signMyContract('user-001', 'bad', 'sign_digital', 'sig')).rejects.toThrow('Contract not found');
    });
  });

  describe('generatePlayerInvite', () => {
    it('should generate invite for player', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockUserFindOne.mockResolvedValue(null);
      mockSequelizeQuery.mockResolvedValue([]);
      mockUserCreate.mockResolvedValue({});
      const result = await portalService.generatePlayerInvite('player-001', 'user-001');
      expect(result).toHaveProperty('inviteLink');
      expect(result).toHaveProperty('token');
    });

    it('should throw 404 if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(portalService.generatePlayerInvite('bad', 'user-001')).rejects.toThrow('Player not found');
    });

    it('should throw 400 if player has no email', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst({ email: null }));
      await expect(portalService.generatePlayerInvite('player-001', 'user-001')).rejects.toThrow('email');
    });

    it('should throw 409 if user account exists and is active', async () => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      mockUserFindOne.mockResolvedValue({ id: 'existing', isActive: true });
      await expect(portalService.generatePlayerInvite('player-001', 'user-001')).rejects.toThrow('already exists');
    });
  });

  describe('completePlayerRegistration', () => {
    it('should complete registration with valid token', async () => {
      const user = { id: 'user-001', email: 'a@test.com', update: jest.fn().mockResolvedValue({}) };
      mockUserFindOne.mockResolvedValue(user);
      const result = await portalService.completePlayerRegistration('valid-token', 'NewPass123!');
      expect(result).toHaveProperty('message');
      expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ isActive: true, inviteToken: null }));
    });

    it('should throw 400 if token invalid or expired', async () => {
      mockUserFindOne.mockResolvedValue(null);
      await expect(portalService.completePlayerRegistration('bad-token', 'pass')).rejects.toThrow('Invalid or expired');
    });
  });

  describe('updateMyProfile', () => {
    it('should update allowed fields', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      const player = mockPlayerInst();
      mockPlayerFindByPk.mockResolvedValue(player);
      const result = await portalService.updateMyProfile('user-001', { phone: '+966501234567' });
      expect(player.update).toHaveBeenCalledWith(expect.objectContaining({ phone: '+966501234567' }));
    });

    it('should throw 400 if no valid fields', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 'user-001', email: 'a@test.com', role: 'Player', playerId: 'player-001' });
      mockPlayerFindByPk.mockResolvedValue(mockPlayerInst());
      await expect(portalService.updateMyProfile('user-001', { email: 'hack@test.com' } as any)).rejects.toThrow('No valid fields');
    });
  });
});
