/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/integration/contracts.routes.test.ts
// Route-level integration tests for /api/v1/contracts
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
    CONTRACTS: 'contracts', CONTRACT: 'contract', PLAYERS: 'players',
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

// ── Module-specific mocks (factory form prevents transitive model imports) ──
jest.mock('../../src/modules/contracts/contract.service', () => ({
  listContracts: jest.fn(),
  getContractById: jest.fn(),
  createContract: jest.fn(),
  updateContract: jest.fn(),
  deleteContract: jest.fn(),
  getContractHistory: jest.fn(),
  terminateContract: jest.fn(),
  uploadSignedContract: jest.fn(),
}));
jest.mock('../../src/modules/contracts/contractTemplate.controller', () => ({
  listTemplates: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deactivateTemplate: jest.fn(),
}));
jest.mock('../../src/modules/contracts/contract.transition.controller', () => ({
  transitionContract: jest.fn(),
}));
jest.mock('../../src/modules/contracts/contract.pdf.controller', () => ({
  generatePdf: jest.fn(),
}));
jest.mock('../../src/modules/contracts/contract.model', () => ({
  Contract: { findByPk: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/modules/contracts/contractTemplate.model', () => ({
  ContractTemplate: { findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/modules/players/player.model', () => ({
  Player: { findByPk: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../src/modules/clubs/club.model', () => ({
  Club: { findByPk: jest.fn(), findAll: jest.fn() },
}));
// Transitive model imports from contract.service.ts
jest.mock('../../src/modules/users/user.model', () => ({
  User: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../src/modules/audit/AuditLog.model', () => ({
  AuditLog: { create: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.mock('../../src/modules/contracts/contractAutoTasks', () => ({
  generateContractCreationTask: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/modules/approvals/approval.service', () => ({
  isApprovalChainResolved: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/middleware/upload', () => ({
  uploadSingle: jest.fn().mockReturnValue(jest.fn()),
  verifyFileType: (_: unknown, __: unknown, next: () => void) => next(),
}));

// ── Deferred imports ──
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as contractService from '../../src/modules/contracts/contract.service';
import contractRouter from '../../src/modules/contracts/contract.routes';
import { errorHandler, AppError } from '../../src/middleware/errorHandler';
import { generateTestToken, mockContract } from '../setup/test-helpers';

// ── Minimal test app ──
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/contracts', contractRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- express error handler
app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));

const mockedService = contractService as jest.Mocked<typeof contractService>;

const ADMIN_TOKEN = generateTestToken({ id: 'user-001', email: 'admin@sadara.com', fullName: 'Admin', role: 'Admin' });
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_CLUB_UUID = '550e8400-e29b-41d4-a716-446655440001';

// startDate must not be in the past per Zod validation — use far-future dates
const VALID_CONTRACT_PAYLOAD = {
  playerId: VALID_UUID,
  clubId: VALID_CLUB_UUID,
  startDate: '2030-01-01',
  endDate: '2031-01-01',
};

describe('Contracts Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // ════════════════════════════════════════════════════════
  // GET / — list
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/contracts', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/contracts');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with contract list for Admin', async () => {
      mockedService.listContracts.mockResolvedValue({
        data: [mockContract()],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      const res = await request(app)
        .get('/api/v1/contracts')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // GET /:id
  // ════════════════════════════════════════════════════════
  describe('GET /api/v1/contracts/:id', () => {
    it('returns 200 when contract is found', async () => {
      mockedService.getContractById.mockResolvedValue(mockContract() as any);

      const res = await request(app)
        .get(`/api/v1/contracts/${VALID_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 when contract does not exist', async () => {
      mockedService.getContractById.mockRejectedValue(
        new AppError('Contract not found', 404),
      );

      const res = await request(app)
        .get(`/api/v1/contracts/${VALID_UUID}`)
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════
  // POST / — create
  // ════════════════════════════════════════════════════════
  describe('POST /api/v1/contracts', () => {
    it('returns 201 when contract is created', async () => {
      mockedService.createContract.mockResolvedValue(mockContract() as any);

      const res = await request(app)
        .post('/api/v1/contracts')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(VALID_CONTRACT_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/contracts')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app)
        .post('/api/v1/contracts')
        .send(VALID_CONTRACT_PAYLOAD);

      expect(res.status).toBe(401);
    });

    it('propagates 404 from service when player does not exist', async () => {
      mockedService.createContract.mockRejectedValue(
        new AppError('Player not found', 404),
      );

      const res = await request(app)
        .post('/api/v1/contracts')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(VALID_CONTRACT_PAYLOAD);

      expect(res.status).toBe(404);
    });
  });
});
