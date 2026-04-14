jest.mock('@shared/utils/cache', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  CacheTTL: { SHORT: 60, MEDIUM: 300, LONG: 3600 },
}));

jest.mock('@config/database', () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { cacheGet, cacheSet } from '@shared/utils/cache';
import { sequelize } from '@config/database';
import { logger } from '@config/logger';
import { verifyUserRole } from '../../../src/shared/utils/verifyRole';
import { AppError } from '../../../src/middleware/errorHandler';

const mockCacheGet = cacheGet as jest.Mock;
const mockCacheSet = cacheSet as jest.Mock;
const mockQuery = (sequelize as any).query as jest.Mock;
const mockWarn = logger.warn as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheSet.mockResolvedValue(undefined);
});

// ─── cache hit ─────────────────────────────────────────────────────────────

describe('verifyUserRole — cache hit', () => {
  it('resolves without hitting the DB when role matches', async () => {
    mockCacheGet.mockResolvedValue({ role: 'Admin', is_active: true });

    await expect(verifyUserRole('user-1', 'Admin')).resolves.toBeUndefined();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 403 when the cached role differs from the expected role', async () => {
    mockCacheGet.mockResolvedValue({ role: 'Scout', is_active: true });

    await expect(verifyUserRole('user-1', 'Admin')).rejects.toMatchObject({
      message: 'Role has changed, please re-authenticate',
      statusCode: 403,
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 403 when the cached user is inactive', async () => {
    mockCacheGet.mockResolvedValue({ role: 'Admin', is_active: false });

    await expect(verifyUserRole('user-1', 'Admin')).rejects.toMatchObject({
      message: 'Account is deactivated',
      statusCode: 403,
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ─── cache miss → DB ───────────────────────────────────────────────────────

describe('verifyUserRole — cache miss', () => {
  beforeEach(() => {
    mockCacheGet.mockResolvedValue(null);
  });

  it('queries the DB, caches the row, and resolves when role matches', async () => {
    const row = { role: 'Admin', is_active: true };
    mockQuery.mockResolvedValue([row]);

    await expect(verifyUserRole('user-2', 'Admin')).resolves.toBeUndefined();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockCacheSet).toHaveBeenCalledWith('role-verify:user-2', row, 60);
  });

  it('throws 403 when the DB returns no matching row', async () => {
    mockQuery.mockResolvedValue([]);

    await expect(verifyUserRole('user-3', 'Admin')).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 403,
    });
  });

  it('throws 403 when the DB user is inactive', async () => {
    mockQuery.mockResolvedValue([{ role: 'Admin', is_active: false }]);

    await expect(verifyUserRole('user-4', 'Admin')).rejects.toMatchObject({
      message: 'Account is deactivated',
      statusCode: 403,
    });
  });

  it('throws 403 when the DB role differs from the expected role', async () => {
    mockQuery.mockResolvedValue([{ role: 'Scout', is_active: true }]);

    await expect(verifyUserRole('user-5', 'Admin')).rejects.toMatchObject({
      message: 'Role has changed, please re-authenticate',
      statusCode: 403,
    });
  });
});

// ─── cache read error falls through to DB ──────────────────────────────────

describe('verifyUserRole — cache read error', () => {
  it('logs a warning and falls through to the DB on a non-AppError cache failure', async () => {
    mockCacheGet.mockRejectedValue(new Error('Redis connection refused'));
    mockQuery.mockResolvedValue([{ role: 'Admin', is_active: true }]);

    await expect(verifyUserRole('user-6', 'Admin')).resolves.toBeUndefined();

    expect(mockWarn).toHaveBeenCalledWith(
      'Role verify cache read failed',
      expect.objectContaining({ userId: 'user-6', error: 'Redis connection refused' }),
    );
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('re-throws an AppError from the cache without querying the DB', async () => {
    const appErr = new AppError('Account is deactivated', 403);
    mockCacheGet.mockRejectedValue(appErr);

    await expect(verifyUserRole('user-7', 'Admin')).rejects.toThrow(appErr);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
