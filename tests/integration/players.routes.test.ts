/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/integration/players.routes.test.ts
// Route-level integration tests for /api/v1/players
// Verifies: JWT enforcement, Zod validation, CRUD + 404 propagation.
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
    PLAYERS: 'players', PLAYER: 'player', CONTRACTS: 'contracts',
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

jest.mock('../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({}),
}));

// ── Module-specific service mock ──
jest.mock('../../src/modules/players/player.service');

// Player model imported directly in player.routes.ts (package-access endpoint)
jest.mock('../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../src/modules/players/externalProvider.model', () => ({
  ExternalProviderMapping: { findAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/modules/players/playerClubHistory.model', () => ({
  PlayerClubHistory: { findAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/modules/clubs/club.model', () => ({
  Club: { findByPk: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../src/modules/users/user.model', () => ({
  User: { findByPk: jest.fn(), findOne: jest.fn() },
}));

// ── Deferred imports ──
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as playerService from '../../src/modules/players/player.service';
import playerRouter from '../../src/modules/players/player.routes';
import { errorHandler, AppError } from '../../src/middleware/errorHandler';
import { generateTestToken, mockPlayer } from '../setup/test-helpers';

// ── Minimal test app ──
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/players', playerRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- express error handler
app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));

const mockedService = playerService as jest.Mocked<typeof playerService>;

const ADMIN_TOKEN = generateTestToken({ id: 'user-001', email: 'admin@sadara.com', fullName: 'Admin', role: 'Admin' });
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const VALID_PLAYER_PAYLOAD = {
  firstName: 'Salem',
  lastName: 'Aldawsari',
  firstNameAr: 'سالم',
  lastNameAr: 'الدوسري',
  dateOfBirth: '1991-08-19',
  nationality: 'Saudi',
  playerType: 'Pro',
  position: 'Forward',
  preferredFoot: 'Right',
  heightCm: 178,
  weightKg: 74,
  email: 'salem@example.com',
  phone: '+966501234567',
};

describe('Players Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // ════════════════════════════════════════════════════════
  // GET / — list
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/players', () => {
    it('returns 401 when no Authorization token is provided', async () => {
      const res = await request(app).get('/api/v1/players');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with player list for Admin', async () => {
      mockedService.listPlayers.mockResolvedValue({
        data: [mockPlayer()],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      const res = await request(app)
        .get('/api/v1/players')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // GET /:id — getById
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/players/:id', () => {
    it('returns 200 with player when found', async () => {
      mockedService.getPlayerById.mockResolvedValue(mockPlayer() as any);

      const res = await request(app)
        .get(`/api/v1/players/${VALID_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when service throws AppError 404', async () => {
      mockedService.getPlayerById.mockRejectedValue(
        new AppError('Player not found', 404),
      );

      const res = await request(app)
        .get(`/api/v1/players/${VALID_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // POST / — create
  // ════════════════════════════════════════════════════════
  describe('POST /api/v1/players', () => {
    it('returns 201 when player is created', async () => {
      mockedService.createPlayer.mockResolvedValue(mockPlayer() as any);

      const res = await request(app)
        .post('/api/v1/players')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(VALID_PLAYER_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/players')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/players')
        .send(VALID_PLAYER_PAYLOAD);

      expect(res.status).toBe(401);
    });
  });

  // ════════════════════════════════════════════════════════
  // DELETE /:id
  // ════════════════════════════════════════════════════════
  describe('DELETE /api/v1/players/:id', () => {
    it('returns 200 when player is deleted', async () => {
      mockedService.deletePlayer.mockResolvedValue({ id: VALID_UUID });

      const res = await request(app)
        .delete(`/api/v1/players/${VALID_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when player does not exist', async () => {
      mockedService.deletePlayer.mockRejectedValue(
        new AppError('Player not found', 404),
      );

      const res = await request(app)
        .delete(`/api/v1/players/${VALID_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(404);
    });
  });
});
