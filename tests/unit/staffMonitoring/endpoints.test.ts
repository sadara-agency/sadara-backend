/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/staffMonitoring/endpoints.test.ts
// Route-level tests for /api/v1/staff-monitoring
// Services are mocked — goal is to prove middleware wiring.
// ─────────────────────────────────────────────────────────────

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn(),
    // Default: return active user for authenticate middleware
    query: jest.fn().mockResolvedValue([{ is_active: true }]),
  },
}));

jest.mock('../../../src/shared/utils/cache', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheOrFetch: jest.fn((_k: string, fn: () => unknown) => fn()),
  invalidateByPrefix: jest.fn().mockResolvedValue(undefined),
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  buildCacheKey: jest.fn((p: string) => p),
  CachePrefix: { STAFF_MON: 'staff-mon' },
  CacheTTL: { SHORT: 60, MEDIUM: 300 },
}));

jest.mock('../../../src/modules/permissions/permission.service', () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../src/middleware/cache.middleware', () => ({
  cacheRoute: () => (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../../src/middleware/fieldAccess', () => ({
  dynamicFieldAccess: () => (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../../src/middleware/rateLimiter', () => ({
  authLimiter: (_: unknown, __: unknown, next: () => void) => next(),
  apiLimiter: (_: unknown, __: unknown, next: () => void) => next(),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => null),
  isRedisConnected: jest.fn(() => false),
}));

// Mock the service module
jest.mock('../../../src/modules/staffMonitoring/staffMonitoring.service', () => ({
  createSession: jest.fn(),
  heartbeat: jest.fn(),
  endSession: jest.fn(),
  endAllOpenSessions: jest.fn(),
  closeIdleSessions: jest.fn(),
  getEngagementSummary: jest.fn().mockResolvedValue([]),
  getEngagementDetail: jest.fn().mockResolvedValue({
    userId: 'u1', fullName: 'Test', fullNameAr: null, role: 'Analyst',
    loginCount: 5, activeDays: 10, totalHours: 40, avgSessionMinutes: 60,
    lastLoginAt: null, onlineStatus: 'offline',
    dailyHours: [], recentSessions: [],
  }),
  getTaskPerformance: jest.fn().mockResolvedValue([]),
  getRankings: jest.fn().mockResolvedValue([]),
  getActivityHeatmap: jest.fn().mockResolvedValue([]),
  computeKpiScores: jest.fn(),
}));

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import staffMonitoringRouter from '../../../src/modules/staffMonitoring/staffMonitoring.routes';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { generateTestToken } from '../../setup/test-helpers';
import * as svc from '../../../src/modules/staffMonitoring/staffMonitoring.service';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/staff-monitoring', staffMonitoringRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- express error handler signature
app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));

const adminToken = generateTestToken();

beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/staff-monitoring/engagement', () => {
  it('returns 200 with empty array', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/engagement')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('accepts valid range query param', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/engagement?range=7d')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('rejects invalid range query param', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/engagement?range=999d')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/staff-monitoring/engagement');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/staff-monitoring/engagement/:userId', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440001';

  it('returns 200 with detail object', async () => {
    const res = await request(app)
      .get(`/api/v1/staff-monitoring/engagement/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBeDefined();
    expect(res.body.data.dailyHours).toBeDefined();
    expect(res.body.data.recentSessions).toBeDefined();
  });

  it('returns 422 for invalid uuid', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/engagement/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/staff-monitoring/task-performance', () => {
  it('returns 200 with empty array', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/task-performance')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('passes range and role to service', async () => {
    await request(app)
      .get('/api/v1/staff-monitoring/task-performance?range=90d&role=Analyst')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(svc.getTaskPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ rangeDays: 90, roleFilter: ['Analyst'] }),
    );
  });
});

describe('GET /api/v1/staff-monitoring/rankings', () => {
  it('returns 200 with empty array', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/rankings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects invalid range', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/rankings?range=invalid')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/staff-monitoring/activity-heatmap/:userId', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440001';

  it('returns 200 with heatmap array', async () => {
    const res = await request(app)
      .get(`/api/v1/staff-monitoring/activity-heatmap/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 422 for invalid userId', async () => {
    const res = await request(app)
      .get('/api/v1/staff-monitoring/activity-heatmap/bad-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });
});
