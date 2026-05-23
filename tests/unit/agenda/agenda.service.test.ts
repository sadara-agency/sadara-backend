/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──────────────────────────────────────────────────────

const mockGoalFindAndCountAll = jest.fn();
const mockGoalFindOne = jest.fn();
const mockGoalCount = jest.fn();
const mockGoalCreate = jest.fn();

const mockTaskFindAndCountAll = jest.fn();
const mockTaskFindOne = jest.fn();
const mockTaskCreate = jest.fn();
const mockTaskUpdate = jest.fn();

jest.mock('../../../src/modules/agenda/agenda-goal.model', () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockGoalFindAndCountAll(...a),
    findOne: (...a: unknown[]) => mockGoalFindOne(...a),
    count: (...a: unknown[]) => mockGoalCount(...a),
    create: (...a: unknown[]) => mockGoalCreate(...a),
  },
}));

jest.mock('../../../src/modules/agenda/agenda-task.model', () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockTaskFindAndCountAll(...a),
    findOne: (...a: unknown[]) => mockTaskFindOne(...a),
    create: (...a: unknown[]) => mockTaskCreate(...a),
    update: (...a: unknown[]) => mockTaskUpdate(...a),
  },
}));

// Calendar sync — fire-and-forget; prevent real network calls
jest.mock('../../../src/modules/agenda/agenda.calendarSync', () => ({
  createOrUpdateEventForTask: jest.fn().mockResolvedValue(undefined),
  deleteEventForTask: jest.fn().mockResolvedValue(undefined),
}));

// Notifications — fire-and-forget
jest.mock('../../../src/modules/agenda/agenda.notifications', () => ({
  dispatchAgendaNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
  },
}));

// ── Import service under test (after mocks) ──────────────────────────────

import * as agendaService from '../../../src/modules/agenda/agenda.service';

// ── Helpers ───────────────────────────────────────────────────────────────

function makeGoal(overrides: Record<string, unknown> = {}) {
  return mockModelInstance({
    id: 'goal-001',
    userId: 'user-001',
    title: 'Learn Arabic',
    titleAr: null,
    description: null,
    targetMonth: '2026-05',
    progressMode: 'task_count' as const,
    targetValue: null,
    currentValue: 0,
    manualPercent: null,
    color: null,
    status: 'active' as const,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return mockModelInstance({
    id: 'task-001',
    userId: 'user-001',
    goalId: 'goal-001',
    title: 'Study 30 min',
    titleAr: null,
    notes: null,
    status: 'Open' as const,
    priority: 'medium' as const,
    dueDate: '2026-05-25',
    dueTime: null,
    durationMinutes: null,
    timezone: 'Asia/Riyadh',
    rolloverPolicy: 'ask' as const,
    rolloverCount: 0,
    needsRolloverDecision: false,
    completedAt: null,
    abandonedAt: null,
    calendarEventId: null,
    sortOrder: 0,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });
}

const USER_ID = 'user-001';
const GOAL_ID = 'goal-001';
const TASK_ID = 'task-001';

const basePagination = { page: 1, limit: 10 };

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Agenda Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Safe defaults for goals
    const goal = makeGoal();
    mockGoalFindAndCountAll.mockResolvedValue({ rows: [goal], count: 1 });
    mockGoalFindOne.mockResolvedValue(goal);
    mockGoalCount.mockResolvedValue(0);
    mockGoalCreate.mockResolvedValue(goal);

    // Safe defaults for tasks
    const task = makeTask();
    mockTaskFindAndCountAll.mockResolvedValue({ rows: [task], count: 1 });
    mockTaskFindOne.mockResolvedValue(task);
    mockTaskCreate.mockResolvedValue(task);
    mockTaskUpdate.mockResolvedValue([1]);
  });

  // ══════════════════════════════════════════════════════════
  // listGoals
  // ══════════════════════════════════════════════════════════
  describe('listGoals', () => {
    it('returns paginated goals for a user', async () => {
      const result = await agendaService.listGoals(USER_ID, basePagination);

      expect(mockGoalFindAndCountAll).toHaveBeenCalledTimes(1);
      const callArg = mockGoalFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ userId: USER_ID });
      expect(callArg.limit).toBe(10);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('applies month filter when provided', async () => {
      mockGoalFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await agendaService.listGoals(USER_ID, { ...basePagination, month: '2026-05' });

      const callArg = mockGoalFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ targetMonth: '2026-05' });
    });

    it('applies status filter when provided', async () => {
      mockGoalFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await agendaService.listGoals(USER_ID, { ...basePagination, status: 'archived' });

      const callArg = mockGoalFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ status: 'archived' });
    });
  });

  // ══════════════════════════════════════════════════════════
  // createGoal
  // ══════════════════════════════════════════════════════════
  describe('createGoal', () => {
    const createPayload = {
      title: 'Run 5k',
      targetMonth: '2026-06',
    };

    it('creates and returns a goal when under the 50-goal cap', async () => {
      mockGoalCount.mockResolvedValue(10); // well below 50

      const result = await agendaService.createGoal(createPayload as any, USER_ID);

      expect(mockGoalCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: USER_ID, status: 'active' }) }),
      );
      expect(mockGoalCreate).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('throws AppError 400 when active goal count is exactly 50', async () => {
      mockGoalCount.mockResolvedValue(50); // at the cap

      await expect(agendaService.createGoal(createPayload as any, USER_ID)).rejects.toMatchObject({
        message: expect.stringContaining('Goal limit reached'),
        statusCode: 400,
      });

      expect(mockGoalCreate).not.toHaveBeenCalled();
    });

    it('throws AppError 400 when active goal count exceeds 50', async () => {
      mockGoalCount.mockResolvedValue(55); // above cap (shouldn't happen in practice but guards the >= check)

      await expect(agendaService.createGoal(createPayload as any, USER_ID)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // getGoalById
  // ══════════════════════════════════════════════════════════
  describe('getGoalById', () => {
    it('returns the goal when found', async () => {
      const goal = makeGoal();
      mockGoalFindOne.mockResolvedValue(goal);

      const result = await agendaService.getGoalById(GOAL_ID, USER_ID);

      expect(mockGoalFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: GOAL_ID, userId: USER_ID }) }),
      );
      expect(result.id).toBe('goal-001');
    });

    it('throws AppError 404 when goal is not found', async () => {
      mockGoalFindOne.mockResolvedValue(null);

      await expect(agendaService.getGoalById('no-such-id', USER_ID)).rejects.toMatchObject({
        message: 'Goal not found',
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // updateGoal
  // ══════════════════════════════════════════════════════════
  describe('updateGoal', () => {
    it('updates and returns the goal', async () => {
      const goal = makeGoal();
      mockGoalFindOne.mockResolvedValue(goal);

      const result = await agendaService.updateGoal(GOAL_ID, { title: 'Updated Title' } as any, USER_ID);

      expect(goal.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Title' }));
      expect(result).toBeDefined();
    });

    it('throws AppError 404 when goal to update is not found', async () => {
      mockGoalFindOne.mockResolvedValue(null);

      await expect(agendaService.updateGoal('no-such-id', { title: 'X' } as any, USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // deleteGoal
  // ══════════════════════════════════════════════════════════
  describe('deleteGoal', () => {
    it('deletes the goal and returns its id', async () => {
      const goal = makeGoal();
      mockGoalFindOne.mockResolvedValue(goal);

      const result = await agendaService.deleteGoal(GOAL_ID, USER_ID);

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        { goalId: null },
        expect.objectContaining({ where: { goalId: GOAL_ID } }),
      );
      expect(goal.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: GOAL_ID });
    });

    it('throws AppError 404 when goal to delete is not found', async () => {
      mockGoalFindOne.mockResolvedValue(null);

      await expect(agendaService.deleteGoal('no-such-id', USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // listTasks
  // ══════════════════════════════════════════════════════════
  describe('listTasks', () => {
    it('returns paginated tasks for a user', async () => {
      const result = await agendaService.listTasks(USER_ID, basePagination);

      expect(mockTaskFindAndCountAll).toHaveBeenCalledTimes(1);
      const callArg = mockTaskFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ userId: USER_ID });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('applies goalId filter when provided', async () => {
      mockTaskFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await agendaService.listTasks(USER_ID, { ...basePagination, goalId: GOAL_ID });

      const callArg = mockTaskFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ goalId: GOAL_ID });
    });

    it('applies status filter when provided', async () => {
      mockTaskFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await agendaService.listTasks(USER_ID, { ...basePagination, status: 'Done' });

      const callArg = mockTaskFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ status: 'Done' });
    });
  });

  // ══════════════════════════════════════════════════════════
  // createTask
  // ══════════════════════════════════════════════════════════
  describe('createTask', () => {
    const createPayload = {
      title: 'Study 30 min',
      dueDate: '2026-05-25',
    };

    it('creates and returns a task without goalId', async () => {
      const result = await agendaService.createTask(createPayload as any, USER_ID);

      expect(mockGoalFindOne).not.toHaveBeenCalled(); // no goalId → no goal lookup
      expect(mockTaskCreate).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('creates a task linked to a valid goal', async () => {
      const goal = makeGoal();
      mockGoalFindOne.mockResolvedValue(goal);

      const result = await agendaService.createTask(
        { ...createPayload, goalId: GOAL_ID } as any,
        USER_ID,
      );

      expect(mockGoalFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: GOAL_ID, userId: USER_ID } }),
      );
      expect(mockTaskCreate).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('throws AppError 404 when goalId references a non-existent goal', async () => {
      mockGoalFindOne.mockResolvedValue(null);

      await expect(
        agendaService.createTask({ ...createPayload, goalId: 'no-such-goal' } as any, USER_ID),
      ).rejects.toMatchObject({
        message: 'Goal not found',
        statusCode: 404,
      });

      expect(mockTaskCreate).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════
  // getTaskById
  // ══════════════════════════════════════════════════════════
  describe('getTaskById', () => {
    it('returns the task when found', async () => {
      const task = makeTask();
      mockTaskFindOne.mockResolvedValue(task);

      const result = await agendaService.getTaskById(TASK_ID, USER_ID);

      expect(mockTaskFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TASK_ID, userId: USER_ID } }),
      );
      expect(result.id).toBe('task-001');
    });

    it('throws AppError 404 when task is not found', async () => {
      mockTaskFindOne.mockResolvedValue(null);

      await expect(agendaService.getTaskById('no-such-id', USER_ID)).rejects.toMatchObject({
        message: 'Task not found',
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // updateTask
  // ══════════════════════════════════════════════════════════
  describe('updateTask', () => {
    it('updates and returns the task', async () => {
      const task = makeTask();
      mockTaskFindOne.mockResolvedValue(task);

      const result = await agendaService.updateTask(TASK_ID, { title: 'Updated Task' } as any, USER_ID);

      expect(task.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('stamps completedAt when transitioning to Done', async () => {
      const task = makeTask({ status: 'Open' });
      mockTaskFindOne.mockResolvedValue(task);

      await agendaService.updateTask(TASK_ID, { status: 'Done' } as any, USER_ID);

      const updateCall = (task.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.completedAt).toBeInstanceOf(Date);
    });

    it('throws AppError 404 when task to update is not found', async () => {
      mockTaskFindOne.mockResolvedValue(null);

      await expect(agendaService.updateTask('no-such-id', { title: 'X' } as any, USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // deleteTask
  // ══════════════════════════════════════════════════════════
  describe('deleteTask', () => {
    it('deletes the task and returns its id', async () => {
      const task = makeTask();
      mockTaskFindOne.mockResolvedValue(task);

      const result = await agendaService.deleteTask(TASK_ID, USER_ID);

      expect(task.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: TASK_ID });
    });

    it('throws AppError 404 when task to delete is not found', async () => {
      mockTaskFindOne.mockResolvedValue(null);

      await expect(agendaService.deleteTask('no-such-id', USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
