jest.mock('@config/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { Op } from 'sequelize';
import {
  findOrThrow,
  destroyById,
  bilingualSearch,
  playerNameSearch,
  pickDefined,
  buildDateRange,
  fireAndForget,
} from '../../../src/shared/utils/serviceHelpers';
import { logger } from '@config/logger';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeInstance(fields: Record<string, unknown>) {
  const destroy = jest.fn().mockResolvedValue(undefined);
  return { ...fields, destroy };
}

function makeModel(instance: ReturnType<typeof makeInstance> | null) {
  return { findByPk: jest.fn().mockResolvedValue(instance) };
}

// ─── findOrThrow ───────────────────────────────────────────────────────────

describe('findOrThrow', () => {
  it('returns the record when found', async () => {
    const inst = makeInstance({ id: 'abc', name: 'Widget A' });
    const model = makeModel(inst);

    const result = await findOrThrow(model as any, 'abc', 'Widget');

    expect(result).toMatchObject({ id: 'abc', name: 'Widget A' });
    expect(model.findByPk).toHaveBeenCalledWith('abc');
  });

  it('throws a 404 AppError when the record is missing', async () => {
    const model = makeModel(null);

    await expect(findOrThrow(model as any, 'missing', 'Widget')).rejects.toMatchObject({
      message: 'Widget not found',
      statusCode: 404,
    });
  });
});

// ─── destroyById ───────────────────────────────────────────────────────────

describe('destroyById', () => {
  it('calls destroy on the record and returns { id }', async () => {
    const inst = makeInstance({ id: 'xyz' });
    const model = makeModel(inst);

    const result = await destroyById(model as any, 'xyz', 'Widget');

    expect(result).toEqual({ id: 'xyz' });
    expect(inst.destroy).toHaveBeenCalledTimes(1);
  });

  it('throws a 404 AppError when the record does not exist', async () => {
    const model = makeModel(null);

    await expect(destroyById(model as any, 'gone', 'Widget')).rejects.toMatchObject({
      message: 'Widget not found',
      statusCode: 404,
    });
  });
});

// ─── bilingualSearch ───────────────────────────────────────────────────────

describe('bilingualSearch', () => {
  it('returns {} for undefined', () => {
    expect(bilingualSearch(undefined)).toEqual({});
  });

  it('returns {} for an empty string', () => {
    expect(bilingualSearch('')).toEqual({});
  });

  it('returns a 2-field Op.or clause for a non-empty search term', () => {
    const result = bilingualSearch('ali') as Record<symbol, unknown[]>;

    expect(result[Op.or]).toHaveLength(2);
    expect(result[Op.or][0]).toMatchObject({ nameEn: { [Op.iLike]: '%ali%' } });
    expect(result[Op.or][1]).toMatchObject({ nameAr: { [Op.iLike]: '%ali%' } });
  });
});

// ─── playerNameSearch ──────────────────────────────────────────────────────

describe('playerNameSearch', () => {
  it('returns {} for undefined', () => {
    expect(playerNameSearch(undefined)).toEqual({});
  });

  it('returns {} for an empty string', () => {
    expect(playerNameSearch('')).toEqual({});
  });

  it('returns a 4-field Op.or clause for a non-empty search term', () => {
    const result = playerNameSearch('ahmed') as Record<symbol, Record<string, unknown>[]>;

    expect(result[Op.or]).toHaveLength(4);

    const fields = result[Op.or].map((clause) => Object.keys(clause)[0]);
    expect(fields).toEqual(['firstName', 'lastName', 'firstNameAr', 'lastNameAr']);

    result[Op.or].forEach((clause) => {
      const condition = Object.values(clause)[0] as Record<symbol, string>;
      expect(condition[Op.iLike]).toBe('%ahmed%');
    });
  });
});

// ─── pickDefined ───────────────────────────────────────────────────────────

describe('pickDefined', () => {
  it('omits keys whose value is undefined', () => {
    const result = pickDefined({ a: 1, b: undefined, c: 'x' }, ['a', 'b', 'c']);

    expect(result).toEqual({ a: 1, c: 'x' });
    expect(result).not.toHaveProperty('b');
  });

  it('keeps null, 0, empty string, and false', () => {
    const result = pickDefined(
      { a: null, b: 0, c: '', d: false } as Record<string, unknown>,
      ['a', 'b', 'c', 'd'],
    );

    expect(result).toEqual({ a: null, b: 0, c: '', d: false });
  });

  it('returns an empty object when all values are undefined', () => {
    const result = pickDefined({ x: undefined, y: undefined }, ['x', 'y']);

    expect(result).toEqual({});
  });
});

// ─── buildDateRange ────────────────────────────────────────────────────────

describe('buildDateRange', () => {
  it('returns undefined when called with no arguments', () => {
    expect(buildDateRange()).toBeUndefined();
  });

  it('returns undefined when both from and to are undefined', () => {
    expect(buildDateRange(undefined, undefined)).toBeUndefined();
  });

  it('sets only Op.gte when only from is provided', () => {
    const result = buildDateRange('2024-01-01') as Record<symbol, string>;

    expect(result[Op.gte]).toBe('2024-01-01');
    expect(result[Op.lte]).toBeUndefined();
  });

  it('sets only Op.lte when only to is provided', () => {
    const result = buildDateRange(undefined, '2024-12-31') as Record<symbol, string>;

    expect(result[Op.lte]).toBe('2024-12-31');
    expect(result[Op.gte]).toBeUndefined();
  });

  it('sets both Op.gte and Op.lte when both dates are provided', () => {
    const result = buildDateRange('2024-01-01', '2024-12-31') as Record<symbol, string>;

    expect(result[Op.gte]).toBe('2024-01-01');
    expect(result[Op.lte]).toBe('2024-12-31');
  });
});

// ─── fireAndForget ─────────────────────────────────────────────────────────

describe('fireAndForget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not log anything when the promise resolves', async () => {
    fireAndForget(Promise.resolve('ok'), 'noop-op');
    await new Promise((r) => setTimeout(r, 0));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('calls logger.warn once with context and error message when the promise rejects', async () => {
    const err = new Error('upstream failure');
    fireAndForget(Promise.reject(err), 'side-effect-op');
    await new Promise((r) => setTimeout(r, 0));

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('[fire-and-forget] side-effect-op', {
      error: 'upstream failure',
    });
  });
});
