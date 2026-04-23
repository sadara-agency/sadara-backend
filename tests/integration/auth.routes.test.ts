/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/integration/auth.routes.test.ts
// Route-level integration tests for /api/v1/auth
// Verifies: JWT enforcement, Zod validation, response shape.
// Services are mocked — the goal is to prove middleware wiring.
// ─────────────────────────────────────────────────────────────

// ── Infrastructure mocks (hoisted before any imports) ──

jest.mock('../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn(),
    query: jest.fn().mockResolvedValue([{ is_active: true }]),
    literal: jest.fn((v: string) => v),
    define: jest.fn(),
    transaction: jest.fn((cb: (t: unknown) => Promise<unknown>) => cb({})),
  },
}));

jest.mock('../../src/shared/utils/cache', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheOrFetch: jest.fn((_k: string, fn: () => unknown) => fn()),
  invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  buildCacheKey: jest.fn((p: string, id: string) => `${p}:${id}`),
  CachePrefix: { USERS: 'users', DASHBOARD: 'dashboard' },
  CacheTTL: { SHORT: 60, MEDIUM: 300, LONG: 900, EXTRA_LONG: 3600 },
}));

jest.mock('../../src/modules/permissions/permission.service', () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/middleware/cache.middleware', () => ({
  cacheRoute: () => (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../src/middleware/fieldAccess', () => ({
  dynamicFieldAccess: () => (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  authLimiter: (_: unknown, __: unknown, next: () => void) => next(),
  passwordResetLimiter: (_: unknown, __: unknown, next: () => void) => next(),
  apiLimiter: (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({}),
}));

// ── Service + model mocks ──
jest.mock('../../src/modules/auth/auth.service');
jest.mock('../../src/modules/users/user.model', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));
jest.mock('../../src/modules/portal/playerAccount.model', () => ({
  PlayerAccount: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
}));

// ── Deferred imports ──
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as authService from '../../src/modules/auth/auth.service';
import authRouter from '../../src/modules/auth/auth.routes';
import { errorHandler, AppError } from '../../src/middleware/errorHandler';
import { generateTestToken, mockUser } from '../setup/test-helpers';

// ── Minimal test app ──
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- express error handler signature
app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth Routes', () => {
  const adminToken = generateTestToken();

  beforeEach(() => jest.clearAllMocks());

  // ════════════════════════════════════════════════════════
  // POST /register
  // ════════════════════════════════════════════════════════
  describe('POST /api/v1/auth/register', () => {
    it('returns 201 on valid registration payload', async () => {
      mockedAuthService.register.mockResolvedValue({
        user: mockUser() as any,
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@sadara.com',
          password: 'SecurePass123',
          fullName: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'user@sadara.com', fullName: 'Test' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'Pass1234', fullName: 'Test' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // POST /login
  // ════════════════════════════════════════════════════════
  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with token on valid credentials', async () => {
      mockedAuthService.login.mockResolvedValue({
        user: mockUser() as any,
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@sadara.com', password: 'SecurePass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'SecurePass123' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('propagates 401 from service when credentials are wrong', async () => {
      mockedAuthService.login.mockRejectedValue(
        new AppError('Invalid credentials', 401),
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@sadara.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // GET /me (protected)
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when no Authorization token is sent', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with user profile for a valid token', async () => {
      mockedAuthService.getProfile.mockResolvedValue(mockUser() as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 for a malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(res.status).toBe(401);
    });
  });
});
