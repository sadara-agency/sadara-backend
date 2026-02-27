/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/setup/test-helpers.ts
// Shared test utilities: mock factories, auth tokens, and
// a pre-configured supertest agent for integration tests.
// ─────────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

// ── Mock data factories ──

export const mockUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-001',
  email: 'admin@sadara.com',
  fullName: 'Test Admin',
  fullNameAr: 'مدير تجريبي',
  role: 'Admin',
  isActive: true,
  passwordHash: '$2a$12$dummyhashfortest',
  lastLogin: null,
  notificationPreferences: {
    contracts: true, offers: true, matches: true, tasks: true,
    email: true, push: false, sms: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockPlayer = (overrides: Record<string, any> = {}) => ({
  id: 'player-001',
  firstName: 'Salem',
  lastName: 'Al-Dawsari',
  firstNameAr: 'سالم',
  lastNameAr: 'الدوسري',
  dateOfBirth: '1991-08-19',
  nationality: 'Saudi',
  position: 'Forward',
  currentClubId: 'club-001',
  agentId: 'user-001',
  status: 'Active',
  playerType: 'Professional',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockClub = (overrides: Record<string, any> = {}) => ({
  id: 'club-001',
  name: 'Al-Hilal',
  nameAr: 'الهلال',
  logoUrl: null,
  league: 'Saudi Pro League',
  country: 'Saudi Arabia',
  city: 'Riyadh',
  foundedYear: 1957,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockContract = (overrides: Record<string, any> = {}) => ({
  id: 'contract-001',
  playerId: 'player-001',
  clubId: 'club-001',
  category: 'Club',
  contractType: 'Representation',
  title: 'Representation Agreement',
  startDate: '2024-01-01',
  endDate: '2028-01-01',
  status: 'Active',
  baseSalary: 500000,
  salaryCurrency: 'SAR',
  signingBonus: 50000,
  releaseClause: 10000000,
  performanceBonus: 100000,
  commissionPct: 10,
  totalCommission: 50000,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockInvoice = (overrides: Record<string, any> = {}) => ({
  id: 'invoice-001',
  invoiceNumber: 'INV-2024-001',
  playerId: 'player-001',
  clubId: 'club-001',
  totalAmount: 50000,
  currency: 'SAR',
  status: 'Expected',
  dueDate: '2024-06-01',
  description: 'Q1 Commission',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ── Auth helper ──

export function generateTestToken(
  user: { id: string; email: string; fullName: string; role: string } = {
    id: 'user-001',
    email: 'admin@sadara.com',
    fullName: 'Test Admin',
    role: 'Admin',
  },
) {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    env.jwt.secret,
    { expiresIn: '1h' },
  );
}

export function authHeader(role: string = 'Admin') {
  const user = { id: 'user-001', email: 'admin@sadara.com', fullName: 'Test Admin', role };
  const token = generateTestToken(user);
  return { Authorization: `Bearer ${token}` };
}

// ── Sequelize mock builder ──
// Creates a mock model instance with .get(), .update(), .destroy()

export function mockModelInstance(data: Record<string, any>) {
  return {
    ...data,
    get: jest.fn((_opts?: { plain?: boolean }) => ({ ...data })),
    update: jest.fn(async (updates: Record<string, any>) => {
      Object.assign(data, updates);
      return { ...data, get: jest.fn(() => data) };
    }),
    destroy: jest.fn(async () => undefined),
    toJSON: jest.fn(() => ({ ...data })),
  };
}
