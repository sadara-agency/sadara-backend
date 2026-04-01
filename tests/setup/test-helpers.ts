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

export const mockMatch = (overrides: Record<string, any> = {}) => ({
  id: 'match-001',
  homeClubId: 'club-001',
  awayClubId: 'club-002',
  competition: 'Saudi Pro League',
  season: '2024-2025',
  matchDate: '2025-03-15T18:00:00Z',
  venue: 'King Fahd Stadium',
  status: 'upcoming',
  homeScore: null,
  awayScore: null,
  attendance: null,
  referee: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockInjury = (overrides: Record<string, any> = {}) => ({
  id: 'injury-001',
  playerId: 'player-001',
  matchId: null,
  injuryType: 'ACL Tear',
  bodyPart: 'Knee',
  severity: 'Severe',
  cause: 'Match',
  status: 'UnderTreatment',
  injuryDate: '2025-01-15',
  expectedReturnDate: '2025-07-15',
  actualReturnDate: null,
  diagnosis: 'Anterior cruciate ligament tear',
  treatmentPlan: 'Surgery + rehabilitation',
  isSurgeryRequired: true,
  estimatedDaysOut: 180,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockOffer = (overrides: Record<string, any> = {}) => ({
  id: 'offer-001',
  playerId: 'player-001',
  fromClubId: 'club-001',
  toClubId: 'club-002',
  offerType: 'Transfer',
  status: 'New',
  transferFee: 5000000,
  salaryOffered: 200000,
  contractYears: 3,
  agentFee: 500000,
  feeCurrency: 'SAR',
  deadline: '2025-06-30',
  notes: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockTask = (overrides: Record<string, any> = {}) => ({
  id: 'task-001',
  title: 'Renew contract',
  titleAr: 'تجديد العقد',
  type: 'Contract',
  priority: 'High',
  status: 'Open',
  description: 'Renew player contract before expiry',
  playerId: 'player-001',
  assignedTo: 'user-001',
  assignedBy: 'user-001',
  dueDate: '2025-04-01',
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockNote = (overrides: Record<string, any> = {}) => ({
  id: 'note-001',
  ownerType: 'Player',
  ownerId: 'player-001',
  content: 'Important scouting notes',
  contentAr: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockDocument = (overrides: Record<string, any> = {}) => ({
  id: 'doc-001',
  name: 'Contract PDF',
  type: 'Contract',
  entityType: 'Contract',
  entityId: 'contract-001',
  fileUrl: '/uploads/documents/contract.pdf',
  mimeType: 'application/pdf',
  fileSize: 102400,
  uploadedBy: 'user-001',
  status: 'Active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockNotification = (overrides: Record<string, any> = {}) => ({
  id: 'notif-001',
  userId: 'user-001',
  type: 'offer',
  title: 'New Offer',
  titleAr: 'عرض جديد',
  body: 'A new transfer offer has been received',
  bodyAr: null,
  isRead: false,
  isDismissed: false,
  priority: 'normal',
  link: '/offers/offer-001',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockGate = (overrides: Record<string, any> = {}) => ({
  id: 'gate-001',
  playerId: 'player-001',
  gateNumber: 1,
  title: 'Onboarding',
  status: 'Pending',
  startedAt: null,
  completedAt: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockGateChecklist = (overrides: Record<string, any> = {}) => ({
  id: 'checklist-001',
  gateId: 'gate-001',
  item: 'Submit medical report',
  isMandatory: true,
  isCompleted: false,
  sortOrder: 1,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockWatchlist = (overrides: Record<string, any> = {}) => ({
  id: 'watchlist-001',
  prospectName: 'Mohammed Al-Deayea',
  prospectNameAr: 'محمد الديعة',
  status: 'Monitoring',
  priority: 'High',
  position: 'GK',
  nationality: 'Saudi',
  dateOfBirth: '2003-05-10',
  currentClub: 'Al-Ahli',
  scoutedBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockScreeningCase = (overrides: Record<string, any> = {}) => ({
  id: 'screening-001',
  watchlistId: 'watchlist-001',
  caseNumber: 'SC-2025-001',
  status: 'Open',
  identityCheck: false,
  backgroundCheck: false,
  medicalClearance: false,
  regulatoryCheck: false,
  isPackReady: false,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockReferral = (overrides: Record<string, any> = {}) => ({
  id: 'referral-001',
  playerId: 'player-001',
  referralType: 'Medical',
  status: 'Open',
  priority: 'High',
  description: 'Requires specialist consultation',
  assignedTo: 'user-001',
  isRestricted: false,
  resolvedAt: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockClearance = (overrides: Record<string, any> = {}) => ({
  id: 'clearance-001',
  contractId: 'contract-001',
  playerId: 'player-001',
  status: 'Pending',
  reason: 'Transfer to new club',
  noClaimsDeclaration: false,
  signatureData: null,
  signedDocumentUrl: null,
  completedAt: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockTrainingCourse = (overrides: Record<string, any> = {}) => ({
  id: 'course-001',
  title: 'Tactical Awareness',
  titleAr: 'الوعي التكتيكي',
  category: 'Tactical',
  difficulty: 'Intermediate',
  isActive: true,
  contentType: 'Video',
  durationMinutes: 45,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockTrainingEnrollment = (overrides: Record<string, any> = {}) => ({
  id: 'enrollment-001',
  courseId: 'course-001',
  playerId: 'player-001',
  status: 'NotStarted',
  progressPct: 0,
  enrolledBy: 'user-001',
  startedAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockReport = (overrides: Record<string, any> = {}) => ({
  id: 'report-001',
  playerId: 'player-001',
  title: 'Q1 Technical Report',
  status: 'Draft',
  periodType: 'Quarter',
  periodParams: { year: 2025, quarter: 1 },
  pdfUrl: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockAuditLog = (overrides: Record<string, any> = {}) => ({
  id: 'audit-001',
  action: 'CREATE',
  entity: 'Player',
  entityId: 'player-001',
  detail: { field: 'status', newValue: 'Active' },
  userId: 'user-001',
  loggedAt: new Date().toISOString(),
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
    reload: jest.fn(async function (this: any) { return this; }),
    increment: jest.fn(async () => undefined),
    decrement: jest.fn(async () => undefined),
    toJSON: jest.fn(() => ({ ...data })),
  };
}
