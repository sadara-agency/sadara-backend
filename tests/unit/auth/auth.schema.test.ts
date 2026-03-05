import {
  registerSchema,
  loginSchema,
  inviteSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../src/modules/auth/auth.schema';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    const valid = { email: 'test@example.com', password: 'Pass1234', fullName: 'John Doe' };

    it('should accept valid input', () => {
      expect(registerSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject missing email', () => {
      expect(registerSchema.safeParse({ ...valid, email: undefined }).success).toBe(false);
    });
    it('should reject short password', () => {
      expect(registerSchema.safeParse({ ...valid, password: '123' }).success).toBe(false);
    });
    it('should reject short fullName', () => {
      expect(registerSchema.safeParse({ ...valid, fullName: 'J' }).success).toBe(false);
    });
    it('should accept optional fullNameAr', () => {
      expect(registerSchema.safeParse({ ...valid, fullNameAr: 'جون' }).success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid credentials', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
    });
    it('should reject missing password', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    });
  });

  describe('inviteSchema', () => {
    const valid = { email: 'a@b.com', password: 'Pass1234', fullName: 'Admin', role: 'Admin' };

    it('should accept valid invite', () => {
      expect(inviteSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject invalid role', () => {
      expect(inviteSchema.safeParse({ ...valid, role: 'SuperAdmin' }).success).toBe(false);
    });
    it('should accept all valid roles', () => {
      for (const role of ['Admin', 'Manager', 'Analyst', 'Scout', 'Player', 'Legal', 'Finance', 'Coach', 'Media', 'Executive']) {
        expect(inviteSchema.safeParse({ ...valid, role }).success).toBe(true);
      }
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept partial updates', () => {
      expect(updateProfileSchema.safeParse({ fullName: 'New Name' }).success).toBe(true);
    });
    it('should reject invalid avatarUrl', () => {
      expect(updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid passwords', () => {
      expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'NewPass12' }).success).toBe(true);
    });
    it('should reject short new password', () => {
      expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: '123' }).success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should accept valid token and password', () => {
      expect(resetPasswordSchema.safeParse({ token: 'abc123', newPassword: 'NewPass12' }).success).toBe(true);
    });
    it('should reject short new password', () => {
      expect(resetPasswordSchema.safeParse({ token: 'abc', newPassword: '12' }).success).toBe(false);
    });
  });
});
