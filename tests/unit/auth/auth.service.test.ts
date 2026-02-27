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
  sequelize: { authenticate: jest.fn(), query: jest.fn() },
}));

jest.mock('../../../src/shared/utils/mail', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(true),
}));

const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../src/modules/Users/user.model', () => ({
  User: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findByPk: (...args: unknown[]) => mockFindByPk(...args),
    create: (...args: unknown[]) => mockCreate(...args),
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
      expect(user.update).toHaveBeenCalledWith({ lastLogin: expect.any(Date) });
    });

    it('should throw 401 for invalid email', async () => {
      mockFindOne.mockResolvedValue(null);

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

      await expect(
        authService.login({ email: 'admin@sadara.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw 403 for inactive user', async () => {
      const password = 'SecurePass123!';
      const hash = await bcrypt.hash(password, 10);
      const user = mockModelInstance({
        ...mockUser(),
        passwordHash: hash,
        isActive: false,
      });
      mockFindOne.mockResolvedValue(user);

      await expect(
        authService.login({ email: 'admin@sadara.com', password }),
      ).rejects.toThrow('Account is not yet activated');
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
      mockFindOne.mockResolvedValue(mockModelInstance(mockUser()));

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
