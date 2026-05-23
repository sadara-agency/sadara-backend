const mockFindAndCountAll = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockMax = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../../src/modules/personal-todos/personal-todo.model', () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    max: (...a: unknown[]) => mockMax(...a),
    count: (...a: unknown[]) => mockCount(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
  },
}));
jest.mock('../../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb('mock-transaction')),
  },
}));
jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import {
  listPersonalTodos,
  getPersonalTodoById,
  createPersonalTodo,
  updatePersonalTodo,
  deletePersonalTodo,
  reorderPersonalTodos,
} from '../../../src/modules/personal-todos/personal-todo.service';

const mockInstance = (data: Record<string, unknown>) => ({
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
  isDone: data.isDone ?? false,
});

describe('personal-todo.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});
    mockMax.mockResolvedValue(null);
    mockCount.mockResolvedValue(0);
    mockUpdate.mockResolvedValue([1]);
  });

  describe('listPersonalTodos', () => {
    it('returns paginated todos for the user', async () => {
      const todo = mockInstance({ id: 't1', title: 'Buy milk', userId: 'u1' });
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [todo] });

      const result = await listPersonalTodos('u1', { page: 1, limit: 20 } as never);

      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where.userId).toBe('u1');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('applies isDone filter', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await listPersonalTodos('u1', { page: 1, limit: 20, isDone: 'true' } as never);

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where.isDone).toBe(true);
    });
  });

  describe('getPersonalTodoById', () => {
    it('returns a todo by id for the owner', async () => {
      const todo = mockInstance({ id: 't1', userId: 'u1' });
      mockFindOne.mockResolvedValue(todo);

      const result = await getPersonalTodoById('t1', 'u1');

      expect(mockFindOne).toHaveBeenCalledWith({ where: { id: 't1', userId: 'u1' } });
      expect(result).toEqual(todo);
    });

    it('throws 404 when todo not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(getPersonalTodoById('missing', 'u1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Todo not found',
      });
    });
  });

  describe('createPersonalTodo', () => {
    it('creates a todo with sortOrder 0 when no existing todos', async () => {
      mockMax.mockResolvedValue(null);
      const created = mockInstance({ id: 't1', title: 'Task', userId: 'u1', sortOrder: 0 });
      mockCreate.mockResolvedValue(created);

      const result = await createPersonalTodo({ title: 'Task' } as never, 'u1');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', sortOrder: 0 }),
      );
      expect(result).toEqual(created);
    });

    it('creates a todo with sortOrder = maxOrder + 1', async () => {
      mockMax.mockResolvedValue(5);
      mockCreate.mockResolvedValue(mockInstance({ id: 't2', sortOrder: 6 }));

      await createPersonalTodo({ title: 'Task 2' } as never, 'u1');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 6 }),
      );
    });
  });

  describe('updatePersonalTodo', () => {
    it('updates an existing todo', async () => {
      const todo = mockInstance({ id: 't1', title: 'Old', userId: 'u1', isDone: false });
      mockFindOne.mockResolvedValue(todo);

      await updatePersonalTodo('t1', { title: 'New' } as never, 'u1');

      expect(todo.update).toHaveBeenCalled();
    });

    it('sets completedAt when isDone flips to true', async () => {
      const todo = mockInstance({ id: 't1', userId: 'u1', isDone: false });
      mockFindOne.mockResolvedValue(todo);

      await updatePersonalTodo('t1', { isDone: true } as never, 'u1');

      const updateArg = (todo.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.completedAt).toBeInstanceOf(Date);
    });

    it('clears completedAt when isDone flips to false', async () => {
      const todo = mockInstance({ id: 't1', userId: 'u1', isDone: true });
      mockFindOne.mockResolvedValue(todo);

      await updatePersonalTodo('t1', { isDone: false } as never, 'u1');

      const updateArg = (todo.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.completedAt).toBeNull();
    });

    it('throws 404 when todo not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        updatePersonalTodo('missing', { title: 'X' } as never, 'u1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deletePersonalTodo', () => {
    it('deletes an existing todo', async () => {
      const todo = mockInstance({ id: 't1', userId: 'u1' });
      mockFindOne.mockResolvedValue(todo);

      const result = await deletePersonalTodo('t1', 'u1');

      expect(todo.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 't1' });
    });

    it('throws 404 when todo not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(deletePersonalTodo('missing', 'u1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('reorderPersonalTodos', () => {
    it('reorders todos for the user', async () => {
      mockCount.mockResolvedValue(2);

      const result = await reorderPersonalTodos(
        [
          { id: 't1', sortOrder: 0 },
          { id: 't2', sortOrder: 1 },
        ],
        'u1',
      );

      expect(result).toEqual({ updated: 2 });
    });

    it('throws 404 when any todo does not belong to user', async () => {
      mockCount.mockResolvedValue(1); // only 1 of 2 owned

      await expect(
        reorderPersonalTodos(
          [
            { id: 't1', sortOrder: 0 },
            { id: 'foreign', sortOrder: 1 },
          ],
          'u1',
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
