/// <reference types="jest" />
import { mockTask, mockModelInstance } from '../../setup/test-helpers';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockTaskCreate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/tasks/task.model', () => ({
  Task: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockTaskCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({ Player: { name: 'Player' } }));
jest.mock('../../../src/modules/users/user.model', () => ({ User: { name: 'User' } }));
jest.mock('../../../src/modules/matches/match.model', () => ({ Match: { name: 'Match' } }));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as taskService from '../../../src/modules/tasks/task.service';

describe('Task Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listTasks', () => {
    it('should return paginated tasks', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockTask())] });
      const result = await taskService.listTasks({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await taskService.listTasks({ status: 'Open', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by priority', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await taskService.listTasks({ priority: 'High', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by assignedTo', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await taskService.listTasks({ assignedTo: 'user-001', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await taskService.listTasks({ search: 'Renew', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getTaskById', () => {
    it('should return task with associations', async () => {
      mockFindByPk.mockResolvedValue(mockModelInstance(mockTask()));
      const result = await taskService.getTaskById('task-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(taskService.getTaskById('bad')).rejects.toThrow('Task not found');
    });
  });

  describe('createTask', () => {
    it('should create task and return with associations', async () => {
      const created = mockModelInstance(mockTask());
      mockTaskCreate.mockResolvedValue(created);
      mockFindByPk.mockResolvedValue(created);
      const result = await taskService.createTask({ title: 'Test', type: 'Contract', priority: 'High' } as any, 'user-001');
      expect(result).toBeDefined();
      expect(mockTaskCreate).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task', async () => {
      const task = mockModelInstance(mockTask());
      mockFindByPk.mockResolvedValue(task);
      await taskService.updateTask('task-001', { title: 'Updated' } as any);
      expect(task.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(taskService.updateTask('bad', { title: 'x' } as any)).rejects.toThrow('Task not found');
    });
  });

  describe('updateTaskStatus', () => {
    it('should set completedAt when status is Completed', async () => {
      const task = mockModelInstance(mockTask());
      mockFindByPk.mockResolvedValue(task);
      await taskService.updateTaskStatus('task-001', 'Completed');
      expect(task.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed', completedAt: expect.any(Date) }));
    });

    it('should clear completedAt when status is Open', async () => {
      const task = mockModelInstance(mockTask({ completedAt: new Date() }));
      mockFindByPk.mockResolvedValue(task);
      await taskService.updateTaskStatus('task-001', 'Open');
      expect(task.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'Open', completedAt: null }));
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(taskService.updateTaskStatus('bad', 'Open')).rejects.toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const task = mockModelInstance(mockTask());
      mockFindByPk.mockResolvedValue(task);
      const result = await taskService.deleteTask('task-001');
      expect(task.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'task-001' });
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(taskService.deleteTask('bad')).rejects.toThrow('Task not found');
    });
  });
});
