/// <reference types="jest" />
import { mockUser, mockModelInstance } from '../../setup/test-helpers';

// ── Mock: sequelize (needed by service imports) ──
const mockSequelizeQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: (...a: unknown[]) => mockSequelizeQuery(...a),
    authenticate: jest.fn(),
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    }),
  },
}));

// ── Mock: User model ──
const mockUserFindByPk = jest.fn();
const mockUserFindAndCountAll = jest.fn();
jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findByPk: (...a: unknown[]) => mockUserFindByPk(...a),
    findAndCountAll: (...a: unknown[]) => mockUserFindAndCountAll(...a),
  },
}));

// ── Mock: other models that settings.service.ts imports ──
jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findAll: jest.fn().mockResolvedValue([]),
    findOrCreate: jest.fn().mockResolvedValue([{}, true]),
  },
}));
jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: { findOrCreate: jest.fn().mockResolvedValue([{ id: 'ref-001' }, true]) },
}));
jest.mock('../../../src/modules/sessions/session.model', () => ({
  Session: { findOrCreate: jest.fn().mockResolvedValue([{}, true]) },
}));
jest.mock('../../../src/modules/gates/gate.model', () => ({
  Gate: { findOrCreate: jest.fn().mockResolvedValue([{}, true]) },
}));
jest.mock('../../../src/modules/journey/journey.model', () => ({
  Journey: { findOrCreate: jest.fn().mockResolvedValue([{}, true]) },
}));

// ── Mock: AppError ──
jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

// ── Mock: appSettings utility ──
const mockGetAppSetting = jest.fn();
const mockSetAppSetting = jest.fn();
jest.mock('../../../src/shared/utils/appSettings', () => ({
  getAppSetting: (...a: unknown[]) => mockGetAppSetting(...a),
  setAppSetting: (...a: unknown[]) => mockSetAppSetting(...a),
}));

// ── Mock: mail utility ──
jest.mock('../../../src/shared/utils/mail', () => ({
  resolveSmtpSecurity: jest.fn().mockReturnValue({ secure: false, requireTLS: true }),
  resetTransporter: jest.fn(),
}));

// ── Mock: pagination utility ──
jest.mock('../../../src/shared/utils/pagination', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 10, offset: 0, page: 1 }),
  buildMeta: jest.fn().mockReturnValue({ total: 0, page: 1, limit: 10, totalPages: 0 }),
}));

// ── Mock: logger ──
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ── Mock: csv-import helpers (deep paths) ──
jest.mock('../../../src/database/csv-import/parse-csv', () => ({
  parseCsvBuffer: jest.fn().mockReturnValue([]),
}));
jest.mock('../../../src/database/csv-import/mappers/player.mapper', () => ({
  mapPlayerRow: jest.fn(),
  resolveClubIds: jest.fn().mockResolvedValue(undefined),
  resolveCreatedBy: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/database/csv-import/mappers/session.mapper', () => ({
  mapSessionRow: jest.fn(),
}));
jest.mock('../../../src/database/csv-import/mappers/ticket.mapper', () => ({
  mapTrainingSessionRow: jest.fn(),
}));
jest.mock('../../../src/database/csv-import/mappers/journey.mapper', () => ({
  mapGateRow: jest.fn(),
  mapJourneyRow: jest.fn(),
}));

// ── Mock: bcrypt ──
const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();
jest.mock('bcryptjs', () => ({
  compare: (...a: unknown[]) => mockBcryptCompare(...a),
  hash: (...a: unknown[]) => mockBcryptHash(...a),
}));

// ── Static import AFTER all mocks ──
import * as settingsService from '../../../src/modules/settings/settings.service';

// ─────────────────────────────────────────────────────────────────────────────

describe('Settings Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAppSetting.mockResolvedValue(undefined);
    mockGetAppSetting.mockResolvedValue(null);
    mockUserFindByPk.mockResolvedValue(null);
    mockBcryptCompare.mockResolvedValue(false);
    mockSequelizeQuery.mockResolvedValue([]);
  });

  // ════════════════════════════════════════
  // getProfile
  // ════════════════════════════════════════

  describe('getProfile', () => {
    it('should return user profile with twoFactorEnabled flag', async () => {
      const userData = mockUser();
      const userInstance = mockModelInstance(userData);
      mockUserFindByPk.mockResolvedValue(userInstance);
      mockSequelizeQuery.mockResolvedValue([{ two_factor_enabled: false }]);

      const result = await settingsService.getProfile('user-001');

      expect(mockUserFindByPk).toHaveBeenCalledWith('user-001', expect.objectContaining({ attributes: expect.any(Array) }));
      expect(result).toHaveProperty('twoFactorEnabled', false);
      expect(result).toHaveProperty('id', 'user-001');
    });

    it('should return null when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);
      mockSequelizeQuery.mockResolvedValue([]);

      const result = await settingsService.getProfile('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should default twoFactorEnabled to false when query returns empty', async () => {
      const userData = mockUser();
      const userInstance = mockModelInstance(userData);
      mockUserFindByPk.mockResolvedValue(userInstance);
      mockSequelizeQuery.mockResolvedValue([]);

      const result = await settingsService.getProfile('user-001');

      expect(result).toHaveProperty('twoFactorEnabled', false);
    });
  });

  // ════════════════════════════════════════
  // updateProfile
  // ════════════════════════════════════════

  describe('updateProfile', () => {
    it('should update and return the user', async () => {
      const userData = mockUser();
      const userInstance = mockModelInstance(userData);
      mockUserFindByPk.mockResolvedValue(userInstance);

      const result = await settingsService.updateProfile('user-001', { fullName: 'New Name' });

      expect(mockUserFindByPk).toHaveBeenCalledWith('user-001');
      expect(userInstance.update).toHaveBeenCalledWith({ fullName: 'New Name' });
      expect(result).toBeDefined();
    });

    it('should throw 404 when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);

      await expect(settingsService.updateProfile('bad-id', { fullName: 'Test' }))
        .rejects.toThrow('User not found');

      await expect(settingsService.updateProfile('bad-id', { fullName: 'Test' }))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ════════════════════════════════════════
  // changePassword
  // ════════════════════════════════════════

  describe('changePassword', () => {
    it('should update password hash when current password is correct', async () => {
      const userData = mockUser({ passwordHash: 'hashed_old' });
      const userInstance = mockModelInstance(userData);
      mockUserFindByPk.mockResolvedValue(userInstance);
      mockBcryptCompare.mockResolvedValue(true);
      mockBcryptHash.mockResolvedValue('hashed_new');

      const result = await settingsService.changePassword('user-001', {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
      });

      expect(result).toBeUndefined(); // changePassword is a void operation
      expect(mockBcryptCompare).toHaveBeenCalledWith('OldPass123', 'hashed_old');
      expect(userInstance.update).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'hashed_new' }));
    });

    it('should throw 404 when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);

      await expect(settingsService.changePassword('bad-id', {
        currentPassword: 'Old',
        newPassword: 'New',
      })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 401 when current password is incorrect', async () => {
      const userInstance = mockModelInstance(mockUser({ passwordHash: 'hashed_old' }));
      mockUserFindByPk.mockResolvedValue(userInstance);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(settingsService.changePassword('user-001', {
        currentPassword: 'WrongPass',
        newPassword: 'NewPass',
      })).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  // ════════════════════════════════════════
  // getNotificationPrefs
  // ════════════════════════════════════════

  describe('getNotificationPrefs', () => {
    it('should return user notification preferences', async () => {
      const prefs = { contracts: true, offers: false, email: true, push: true };
      const userInstance = mockModelInstance(mockUser({ notificationPreferences: prefs }));
      mockUserFindByPk.mockResolvedValue(userInstance);

      const result = await settingsService.getNotificationPrefs('user-001');

      expect(result).toEqual(prefs);
    });

    it('should return default preferences when user has none stored', async () => {
      const userInstance = mockModelInstance(mockUser({ notificationPreferences: null }));
      mockUserFindByPk.mockResolvedValue(userInstance);

      const result = await settingsService.getNotificationPrefs('user-001');

      expect(result).toHaveProperty('contracts', true);
      expect(result).toHaveProperty('email', true);
      expect(result).toHaveProperty('push', false);
    });

    it('should return default preferences when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);

      const result = await settingsService.getNotificationPrefs('nonexistent');

      // user is null → optional chaining returns undefined → fallback to DEFAULT_NOTIFICATION_PREFS
      expect(result).toHaveProperty('contracts', true);
    });
  });

  // ════════════════════════════════════════
  // updateNotificationPrefs
  // ════════════════════════════════════════

  describe('updateNotificationPrefs', () => {
    it('should merge and return updated preferences', async () => {
      const existingPrefs = { contracts: true, offers: true, email: true, push: false };
      const userInstance = mockModelInstance(mockUser({ notificationPreferences: existingPrefs }));
      mockUserFindByPk.mockResolvedValue(userInstance);

      const result = await settingsService.updateNotificationPrefs('user-001', { push: true });

      expect(userInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ notificationPreferences: expect.objectContaining({ push: true }) }),
      );
      expect(result).toEqual({ contracts: true, offers: true, email: true, push: true });
    });

    it('should throw 404 when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);

      await expect(settingsService.updateNotificationPrefs('bad-id', { push: true }))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ════════════════════════════════════════
  // listTeam
  // ════════════════════════════════════════

  describe('listTeam', () => {
    it('should return paginated team members', async () => {
      const users = [mockModelInstance(mockUser()), mockModelInstance(mockUser({ id: 'user-002' }))];
      mockUserFindAndCountAll.mockResolvedValue({ count: 2, rows: users });

      const result = await settingsService.listTeam({ page: 1, limit: 10 });

      expect(mockUserFindAndCountAll).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result).toHaveProperty('meta');
    });

    it('should filter by role', async () => {
      mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await settingsService.listTeam({ page: 1, limit: 10, role: 'Scout' });

      const callArg = mockUserFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ role: 'Scout' });
    });

    it('should filter by isActive', async () => {
      mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await settingsService.listTeam({ page: 1, limit: 10, isActive: true });

      const callArg = mockUserFindAndCountAll.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ isActive: true });
    });

    it('should return empty list when no team members found', async () => {
      mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const result = await settingsService.listTeam({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════
  // updateTeamMember
  // ════════════════════════════════════════

  describe('updateTeamMember', () => {
    it('should update and return the team member', async () => {
      const userInstance = mockModelInstance(mockUser());
      mockUserFindByPk.mockResolvedValue(userInstance);

      const result = await settingsService.updateTeamMember('user-001', { isActive: false });

      expect(userInstance.update).toHaveBeenCalledWith({ isActive: false });
      expect(result).toBeDefined();
    });

    it('should throw 404 when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);

      await expect(settingsService.updateTeamMember('bad-id', { isActive: false }))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ════════════════════════════════════════
  // getSidebarConfig
  // ════════════════════════════════════════

  describe('getSidebarConfig', () => {
    it('should return portal default config', async () => {
      const stored = {
        version: 4,
        default: { dashboard: { hiddenItems: ['analytics'] } },
        byRole: {},
        byUser: {},
      };
      mockGetAppSetting.mockResolvedValue(stored);

      const result = await settingsService.getSidebarConfig('dashboard');

      expect(result).toMatchObject({ hiddenItems: ['analytics'] });
    });

    it('should return EMPTY_CONFIG when portal not configured', async () => {
      const stored = { version: 4, default: {}, byRole: {}, byUser: {} };
      mockGetAppSetting.mockResolvedValue(stored);

      const result = await settingsService.getSidebarConfig('unknown-portal');

      expect(result).toMatchObject({ hiddenItems: [] });
    });

    it('should return role-specific config when role is provided', async () => {
      const stored = {
        version: 4,
        default: {},
        byRole: { dashboard: { Scout: { hiddenItems: ['finance'] } } },
        byUser: {},
      };
      mockGetAppSetting.mockResolvedValue(stored);

      const result = await settingsService.getSidebarConfig('dashboard', 'Scout');

      expect(result).toMatchObject({ hiddenItems: ['finance'] });
    });
  });

  // ════════════════════════════════════════
  // getUserSidebar
  // ════════════════════════════════════════

  describe('getUserSidebar', () => {
    it('should return user-specific sidebar override', async () => {
      const stored = {
        version: 4,
        default: {},
        byRole: {},
        byUser: { 'user-001': { hiddenItems: ['settings'] } },
      };
      mockGetAppSetting.mockResolvedValue(stored);

      const result = await settingsService.getUserSidebar('user-001');

      expect(result).toMatchObject({ hiddenItems: ['settings'] });
    });

    it('should return EMPTY_CONFIG when user has no override', async () => {
      const stored = { version: 4, default: {}, byRole: {}, byUser: {} };
      mockGetAppSetting.mockResolvedValue(stored);

      const result = await settingsService.getUserSidebar('user-001');

      expect(result).toMatchObject({ hiddenItems: [] });
    });
  });

  // ════════════════════════════════════════
  // saveUserSidebar
  // ════════════════════════════════════════

  describe('saveUserSidebar', () => {
    it('should persist and return the user sidebar config', async () => {
      const stored = { version: 4, default: {}, byRole: {}, byUser: {} };
      mockGetAppSetting.mockResolvedValue(stored);

      const config = { hiddenItems: ['reports'] };
      const result = await settingsService.saveUserSidebar('user-001', config);

      expect(mockSetAppSetting).toHaveBeenCalledWith(
        'sidebar_config_v4',
        expect.objectContaining({ byUser: { 'user-001': config } }),
      );
      expect(result).toEqual(config);
    });
  });

  // ════════════════════════════════════════
  // getSmtpSettings
  // ════════════════════════════════════════

  describe('getSmtpSettings', () => {
    it('should return stored SMTP settings with masked password', async () => {
      mockGetAppSetting.mockResolvedValue({
        host: 'smtp.example.com',
        port: 587,
        username: 'user@example.com',
        password: 'secret123',
        fromEmail: 'no-reply@example.com',
        fromName: 'Sadara',
      });

      const result = await settingsService.getSmtpSettings();

      expect(result).toMatchObject({ host: 'smtp.example.com', port: 587 });
      expect((result as { password?: string }).password).toBe('••••••••');
    });

    it('should return default empty settings when none configured', async () => {
      mockGetAppSetting.mockResolvedValue(null);

      const result = await settingsService.getSmtpSettings();

      expect(result).toMatchObject({ host: '', port: 587, username: '' });
    });
  });
});
