/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/integration/referrals.routes.test.ts
// Route-level integration tests for /api/v1/referrals
// Verifies: JWT enforcement, Zod validation, CRUD, 404 handling.
// ─────────────────────────────────────────────────────────────

// ── Infrastructure mocks ──

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
  CachePrefix: {
    REFERRALS: 'referrals', REFERRAL: 'referral', PLAYERS: 'players',
    DASHBOARD: 'dashboard', USERS: 'users',
  },
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

jest.mock('../../src/middleware/packageAccess', () => ({
  authorizePlayerPackage: () => (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({}),
}));

// ── Module-specific mocks (factory form prevents transitive model imports) ──
jest.mock('../../src/modules/referrals/referral.service', () => ({
  listReferrals: jest.fn(),
  getReferralById: jest.fn(),
  createReferral: jest.fn(),
  updateReferral: jest.fn(),
  deleteReferral: jest.fn(),
  updateReferralStatus: jest.fn(),
  escalateReferral: jest.fn(),
  getManagerDashboard: jest.fn(),
  getReferralsBySpecialist: jest.fn(),
  getOverdueReferrals: jest.fn(),
  getSpecialistPerformance: jest.fn(),
  checkDuplicate: jest.fn(),
}));
jest.mock('../../src/modules/referrals/referral.model', () => ({
  Referral: { findByPk: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
}));
// Transitive model imports from referral.service.ts
jest.mock('../../src/modules/players/player.model', () => ({
  Player: { findByPk: jest.fn(), findAndCountAll: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../src/modules/users/user.model', () => ({
  User: { findByPk: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../src/modules/injuries/injury.model', () => ({
  Injury: { findByPk: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../src/modules/sessions/session.model', () => ({
  Session: { findByPk: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../src/modules/tickets/ticket.model', () => ({
  Ticket: { findByPk: jest.fn(), findAll: jest.fn() },
}));

// ── Deferred imports ──
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as referralService from '../../src/modules/referrals/referral.service';
import referralRouter from '../../src/modules/referrals/referral.routes';
import { errorHandler, AppError } from '../../src/middleware/errorHandler';
import { generateTestToken, mockReferral } from '../setup/test-helpers';

// ── Minimal test app ──
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/referrals', referralRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- express error handler
app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));

const mockedService = referralService as jest.Mocked<typeof referralService>;

const ADMIN_TOKEN = generateTestToken({ id: 'user-001', email: 'admin@sadara.com', fullName: 'Admin', role: 'Admin' });
const PLAYER_UUID = '550e8400-e29b-41d4-a716-446655440000';
const USER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const REFERRAL_UUID = '550e8400-e29b-41d4-a716-446655440002';

const VALID_REFERRAL_PAYLOAD = {
  referralType: 'Medical',
  playerId: PLAYER_UUID,
  assignedTo: USER_UUID,
  isRestricted: false,
};

describe('Referrals Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // ════════════════════════════════════════════════════════
  // GET / — list
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/referrals', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/referrals');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with referral list for Admin', async () => {
      mockedService.listReferrals.mockResolvedValue({
        data: [mockReferral()],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      const res = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // GET /:id
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/referrals/:id', () => {
    it('returns 200 when referral is found', async () => {
      mockedService.getReferralById.mockResolvedValue(mockReferral() as any);

      const res = await request(app)
        .get(`/api/v1/referrals/${REFERRAL_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 when referral does not exist', async () => {
      mockedService.getReferralById.mockRejectedValue(
        new AppError('Referral not found', 404),
      );

      const res = await request(app)
        .get(`/api/v1/referrals/${REFERRAL_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // POST / — create
  // ════════════════════════════════════════════════════════
  describe('POST /api/v1/referrals', () => {
    it('returns 201 when referral is created', async () => {
      mockedService.createReferral.mockResolvedValue(mockReferral() as any);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(VALID_REFERRAL_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .send(VALID_REFERRAL_PAYLOAD);

      expect(res.status).toBe(401);
    });

    it('returns 409 when service detects a duplicate referral', async () => {
      mockedService.createReferral.mockRejectedValue(
        new AppError('Active referral already exists for this player', 409),
      );

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(VALID_REFERRAL_PAYLOAD);

      expect(res.status).toBe(409);
    });
  });
});
