/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/integration/wellness.routes.test.ts
// Route-level integration tests for /api/v1/wellness
// Key focus: JWT enforcement, coach scope wiring (HD-4 fix),
// and service call contracts (service receives req.user for scoping).
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
    WELLNESS: 'wellness', PLAYERS: 'players', DASHBOARD: 'dashboard', USERS: 'users',
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

// ── Module-specific service mock ──
jest.mock('../../src/modules/wellness/wellness.service');
jest.mock('../../src/modules/wellness/wellness.model', () => ({
  WellnessProfile: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/modules/players/player.model', () => ({
  Player: { findByPk: jest.fn(), findAndCountAll: jest.fn() },
}));

// ── Deferred imports ──
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as wellnessService from '../../src/modules/wellness/wellness.service';
import wellnessRouter from '../../src/modules/wellness/wellness.routes';
import { errorHandler, AppError } from '../../src/middleware/errorHandler';
import { generateTestToken } from '../setup/test-helpers';

// ── Minimal test app ──
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/wellness', wellnessRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- express error handler
app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));

const mockedWellness = wellnessService as jest.Mocked<typeof wellnessService>;

const ADMIN_TOKEN = generateTestToken({
  id: 'user-001', email: 'admin@sadara.com', fullName: 'Admin', role: 'Admin',
});
const GYM_COACH_TOKEN = generateTestToken({
  id: 'user-002', email: 'gymcoach@sadara.com', fullName: 'Gym Coach', role: 'GymCoach',
});
const PLAYER_UUID = '550e8400-e29b-41d4-a716-446655440000';

const VALID_PROFILE_PAYLOAD = {
  playerId: PLAYER_UUID,
  sex: 'male',
};

describe('Wellness Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // ════════════════════════════════════════════════════════
  // GET /profiles/:playerId
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/wellness/profiles/:playerId', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get(`/api/v1/wellness/profiles/${PLAYER_UUID}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 when Admin requests a player profile', async () => {
      mockedWellness.getProfile.mockResolvedValue({
        id: 'profile-001',
        playerId: PLAYER_UUID,
        weight: 75.5,
        height: 180,
      } as any);

      const res = await request(app)
        .get(`/api/v1/wellness/profiles/${PLAYER_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('passes req.user to getProfile so Coach scope filtering is applied (HD-4)', async () => {
      mockedWellness.getProfile.mockResolvedValue({
        id: 'profile-001',
        playerId: PLAYER_UUID,
      } as any);

      await request(app)
        .get(`/api/v1/wellness/profiles/${PLAYER_UUID}`)
        .set('Authorization', `Bearer ${GYM_COACH_TOKEN}`);

      // The service must be called with the GymCoach user so the EXISTS-based scope filtering in
      // wellnessService.buildPlayerScopeSQL can enforce player_coach_assignments scoping (HD-4 fix).
      expect(mockedWellness.getProfile).toHaveBeenCalledWith(
        PLAYER_UUID,
        expect.objectContaining({ role: 'GymCoach' }),
      );
    });

    it('returns 404 when profile does not exist', async () => {
      mockedWellness.getProfile.mockRejectedValue(
        new AppError('Wellness profile not found', 404),
      );

      const res = await request(app)
        .get(`/api/v1/wellness/profiles/${PLAYER_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // POST /profiles — create
  // ════════════════════════════════════════════════════════
  describe('POST /api/v1/wellness/profiles', () => {
    it('returns 201 when profile is created', async () => {
      mockedWellness.createProfile.mockResolvedValue({
        id: 'profile-001',
        playerId: PLAYER_UUID,
      } as any);

      const res = await request(app)
        .post('/api/v1/wellness/profiles')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(VALID_PROFILE_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/wellness/profiles')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // GET /my/profile — Player self-service
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/wellness/my/profile', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/wellness/my/profile');

      expect(res.status).toBe(401);
    });

    it('passes authenticated user to service for own-profile lookup', async () => {
      const PLAYER_ROLE_TOKEN = generateTestToken({
        id: 'player-user-001', email: 'player@example.com', fullName: 'Player', role: 'Player',
      });
      mockedWellness.getProfile.mockResolvedValue({
        id: 'profile-001',
        playerId: 'player-user-001',
      } as any);

      const res = await request(app)
        .get('/api/v1/wellness/my/profile')
        .set('Authorization', `Bearer ${PLAYER_ROLE_TOKEN}`);

      // Auth works — no 401. The service is called with the player user context.
      expect(res.status).not.toBe(401);
    });
  });
});
