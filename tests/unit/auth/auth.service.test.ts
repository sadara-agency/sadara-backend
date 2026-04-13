/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/auth/auth.service.test.ts
// Unit tests for authentication service.
// ─────────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockUser, mockModelInstance } from '../../setup/test-helpers';

// ── Mock dependencies ──
jest.mock('../../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn(),
    query: jest.fn(),
    literal: jest.fn((val: string) => val),
  },
}));

jest.mock('../../../src/shared/utils/mail', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(true),
  sendInviteEmail: jest.fn().mockResolvedValue(true),
  sendEmailVerificationEmail: jest.fn().mockResolvedValue(true),
}));

const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
  },
}));

jest.mock('../../../src/modules/portal/playerAccount.model', () => ({
  PlayerAccount: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    name: 'PlayerAccount',
  },
}));

// Import after mocks are set up
import * as authService from '../../../src/modules/auth/auth.service';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════
  describe('login', () => {
    it('should return user and token for valid credentials', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);
      const user = mockModelInstance({
        ...mockUser(),
        passwordHash: hash,
        isActive: true,
      });

      mockFindOne.mockResolvedValue(user);

      const result = await authService.login({ email: 'admin@sadara.com', password });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(user.update).toHaveBeenCalledWith({
        failedLoginAttempts: 0,
        lastLogin: expect.any(Date),
        lockedUntil: null,
      });
    });

    it('should throw 401 for invalid email', async () => {
      mockFindOne.mockResolvedValue(null);
      const { sequelize } = await import('../../../src/config/database');
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      await expect(
        authService.login({ email: 'nobody@sadara.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw 401 for wrong password', async () => {
      const user = mockModelInstance({
        ...mockUser(),
        passwordHash: await bcrypt.hash('correct', 10),
      });
      mockFindOne.mockResolvedValue(user);
      mockUserUpdate.mockResolvedValue([1]);

      await expect(
        authService.login({ email: 'admin@sadara.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw 403 for inactive user', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);
      // emailVerifiedAt is set by default in mockUser(), so this falls through
      // the EMAIL_NOT_VERIFIED gate and hits PENDING_APPROVAL.
      const user = mockModelInstance({
        ...mockUser(),
        passwordHash: hash,
        isActive: false,
      });
      mockFindOne.mockResolvedValue(user);

      await expect(
        authService.login({ email: 'admin@sadara.com', password }),
      ).rejects.toThrow('waiting for admin approval');
    });

    it('should throw 403 for unverified email', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);
      const user = mockModelInstance({
        ...mockUser(),
        passwordHash: hash,
        isActive: true,
        emailVerifiedAt: null,
      });
      mockFindOne.mockResolvedValue(user);

      await expect(
        authService.login({ email: 'admin@sadara.com', password }),
      ).rejects.toThrow('verify your email');
    });
  });

  // ════════════════════════════════════════════════════════
  // REGISTER
  // ════════════════════════════════════════════════════════
  describe('register', () => {
    it('should create a new user with Analyst role', async () => {
      mockFindOne.mockResolvedValue(null); // No existing user
      const createdUser = mockModelInstance({
        ...mockUser({ role: 'Analyst', isActive: false }),
      });
      mockCreate.mockResolvedValue(createdUser);

      const result = await authService.register({
        email: 'new@sadara.com',
        password: 'StrongPass123!',
        fullName: 'New User',
      });

      expect(result).toHaveProperty('user');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@sadara.com',
          role: 'Analyst',
          isActive: false,
        }),
      );
    });

    it('should throw 409 if email already exists', async () => {
      const uniqueError = new Error('Validation error') as any;
      uniqueError.name = 'SequelizeUniqueConstraintError';
      mockCreate.mockRejectedValue(uniqueError);

      await expect(
        authService.register({
          email: 'admin@sadara.com',
          password: 'pass',
          fullName: 'Test',
        }),
      ).rejects.toThrow('Email already registered');
    });
  });

  // ════════════════════════════════════════════════════════
  // INVITE (Admin creates user)
  // ════════════════════════════════════════════════════════
  describe('invite', () => {
    it('should create an active user with the assigned role', async () => {
      const createdUser = mockModelInstance({
        ...mockUser({ role: 'Scout', isActive: true }),
      });
      mockCreate.mockResolvedValue(createdUser);

      const result = await authService.invite({
        email: 'scout@sadara.com',
        password: 'StrongPass123!',
        fullName: 'New Scout',
        role: 'Scout',
      });

      expect(result).toHaveProperty('user');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'scout@sadara.com',
          role: 'Scout',
          isActive: true,
        }),
      );
    });

    it('should send an invite email after creating the user', async () => {
      const { sendInviteEmail } = await import('../../../src/shared/utils/mail');
      const createdUser = mockModelInstance({
        ...mockUser({ email: 'coach@sadara.com', fullName: 'New Coach', role: 'Coach' }),
      });
      mockCreate.mockResolvedValue(createdUser);

      await authService.invite({
        email: 'coach@sadara.com',
        password: 'StrongPass123!',
        fullName: 'New Coach',
        role: 'Coach',
      });

      // Allow the fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 10));

      expect(sendInviteEmail).toHaveBeenCalledWith(
        'coach@sadara.com',
        'New Coach',
        'Coach',
        expect.stringContaining('/login'),
      );
    });

    it('should throw 409 if email already exists', async () => {
      const uniqueError = new Error('Validation error') as any;
      uniqueError.name = 'SequelizeUniqueConstraintError';
      mockCreate.mockRejectedValue(uniqueError);

      await expect(
        authService.invite({
          email: 'admin@sadara.com',
          password: 'pass12345',
          fullName: 'Duplicate',
          role: 'Analyst',
        }),
      ).rejects.toThrow('Email already registered');
    });

    it('should not fail if invite email fails to send', async () => {
      const { sendInviteEmail } = await import('../../../src/shared/utils/mail');
      (sendInviteEmail as jest.Mock).mockRejectedValueOnce(new Error('SMTP down'));

      const createdUser = mockModelInstance({
        ...mockUser({ role: 'Finance', isActive: true }),
      });
      mockCreate.mockResolvedValue(createdUser);

      const result = await authService.invite({
        email: 'finance@sadara.com',
        password: 'StrongPass123!',
        fullName: 'Finance User',
        role: 'Finance',
      });

      // User should still be created even if email fails
      expect(result).toHaveProperty('user');

      // Allow fire-and-forget to settle (error is caught by .catch())
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  // ════════════════════════════════════════════════════════
  // CHANGE PASSWORD
  // ════════════════════════════════════════════════════════
  describe('changePassword', () => {
    it('should update password when current password is correct', async () => {
      const currentPassword = 'OldPass123!';
      const hash = await bcrypt.hash(currentPassword, 10);
      const user = mockModelInstance({ ...mockUser(), passwordHash: hash });
      mockFindByPk.mockResolvedValue(user);

      const result = await authService.changePassword(
        'user-001',
        currentPassword,
        'NewPass456!',
      );

      expect(result.message).toBe('Password changed successfully');
      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
    });

    it('should throw 400 when current password is wrong', async () => {
      const hash = await bcrypt.hash('correct', 10);
      const user = mockModelInstance({ ...mockUser(), passwordHash: hash });
      mockFindByPk.mockResolvedValue(user);

      await expect(
        authService.changePassword('user-001', 'wrong', 'NewPass456!'),
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  // ════════════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ════════════════════════════════════════════════════════
  describe('forgotPassword', () => {
    it('should return success message even for non-existent email', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await authService.forgotPassword('ghost@sadara.com');

      expect(result.message).toContain('If this email exists');
    });

    it('should generate reset token for valid email', async () => {
      const user = mockModelInstance(mockUser());
      mockFindOne.mockResolvedValue(user);

      const result = await authService.forgotPassword('admin@sadara.com');

      expect(result.message).toContain('If this email exists');
      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          resetToken: expect.any(String),
          resetTokenExpiry: expect.any(Date),
        }),
      );
    });
  });
});
