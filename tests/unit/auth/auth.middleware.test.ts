// ─────────────────────────────────────────────────────────────
// tests/unit/auth/auth.middleware.test.ts
// Unit tests for authentication and authorization middleware.
// ─────────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../../src/middleware/auth';
import { generateTestToken, mockUser } from '../../setup/test-helpers';

// ── Helpers ──
function createMockReqRes(headers: Record<string, string> = {}) {
  const req = {
    headers,
    user: undefined,
  } as unknown as Request & { user?: unknown };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = jest.fn();

  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('should pass through with valid token', () => {
    const token = generateTestToken();
    const { req, res, next } = createMockReqRes({
      authorization: `Bearer ${token}`,
    });

    authenticate(req as any, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeDefined();
    expect((req as any).user.email).toBe('admin@sadara.com');
  });

  it('should return 401 when no token provided', () => {
    const { req, res, next } = createMockReqRes();

    authenticate(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is malformed', () => {
    const { req, res, next } = createMockReqRes({
      authorization: 'Bearer invalid.token.here',
    });

    authenticate(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid token' }),
    );
  });

  it('should return 401 for expired tokens', () => {
    // Create a token that expired 1 hour ago
    const jwt = require('jsonwebtoken');
    const { env } = require('../../../src/config/env');
    const token = jwt.sign(
      { id: 'user-001', email: 'test@test.com', fullName: 'Test', role: 'Admin' },
      env.jwt.secret,
      { expiresIn: '-1h' },
    );

    const { req, res, next } = createMockReqRes({
      authorization: `Bearer ${token}`,
    });

    authenticate(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token expired' }),
    );
  });
});

describe('authorize middleware', () => {
  it('should allow access for permitted roles', () => {
    const token = generateTestToken(mockUser({ role: 'Admin' }) as any);
    const { req, res, next } = createMockReqRes({
      authorization: `Bearer ${token}`,
    });

    // First authenticate
    authenticate(req as any, res, next);

    // Then authorize
    const authorizeMw = authorize('Admin', 'Manager');
    authorizeMw(req as any, res, jest.fn() as NextFunction);
  });

  it('should return 403 for unauthorized roles', () => {
    const { req, res, next } = createMockReqRes();
    // Manually set user with Scout role
    (req as any).user = { id: 'user-002', email: 'scout@sadara.com', fullName: 'Scout', role: 'Scout' };

    const authorizeMw = authorize('Admin', 'Manager');
    authorizeMw(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when no user is attached', () => {
    const { req, res, next } = createMockReqRes();

    const authorizeMw = authorize('Admin');
    authorizeMw(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
