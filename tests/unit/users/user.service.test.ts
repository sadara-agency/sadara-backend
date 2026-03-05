/// <reference types="jest" />
import { mockUser, mockModelInstance } from '../../setup/test-helpers';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockUserCreate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/Users/user.model', () => ({
  User: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockUserCreate(...a),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as userService from '../../../src/modules/Users/user.service';

describe('User Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockUser())] });
      const result = await userService.listUsers({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by role', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await userService.listUsers({ role: 'Admin', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await userService.listUsers({ search: 'admin', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockUser()));
      const result = await userService.getUserById('user-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(userService.getUserById('bad')).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      mockFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(mockModelInstance(mockUser()));
      const result = await userService.createUser({ email: 'new@sadara.com', password: 'Pass123!', fullName: 'New User', role: 'Analyst' } as any);
      expect(result).toBeDefined();
      expect(mockUserCreate).toHaveBeenCalled();
    });

    it('should throw 409 if email exists', async () => {
      mockFindOne.mockResolvedValue(mockModelInstance(mockUser()));
      await expect(userService.createUser({ email: 'admin@sadara.com', password: 'x', fullName: 'y', role: 'Analyst' } as any)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const user = mockModelInstance(mockUser());
      mockFindByPk.mockResolvedValue(user);
      mockFindOne.mockResolvedValue(null);
      await userService.updateUser('user-001', { fullName: 'Updated' } as any);
      expect(user.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(userService.updateUser('bad', { fullName: 'x' } as any)).rejects.toThrow('User not found');
    });

    it('should throw 409 on duplicate email', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockUser()));
      mockFindOne.mockResolvedValue(mockModelInstance(mockUser({ id: 'user-002' })));
      await expect(userService.updateUser('user-001', { email: 'taken@sadara.com' } as any)).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const user = mockModelInstance(mockUser());
      mockFindByPk.mockResolvedValue(user);
      const result = await userService.resetPassword('user-001', 'NewPass123!');
      expect(user.update).toHaveBeenCalled();
      expect(result.message).toContain('Password reset');
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(userService.resetPassword('bad', 'x')).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const user = mockModelInstance(mockUser());
      mockFindByPk.mockResolvedValue(user);
      const result = await userService.deleteUser('user-002', 'user-001');
      expect(user.destroy).toHaveBeenCalled();
    });

    it('should throw 400 for self-deletion', async () => {
      await expect(userService.deleteUser('user-001', 'user-001')).rejects.toThrow();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(userService.deleteUser('bad', 'user-001')).rejects.toThrow('User not found');
    });
  });
});
