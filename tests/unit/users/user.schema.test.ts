import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  userQuerySchema,
} from '../../../src/modules/users/user.validation';

describe('User Schemas', () => {
  describe('createUserSchema', () => {
    const valid = { email: 'a@b.com', password: 'Pass1234', fullName: 'Admin User' };

    it('should accept valid input', () => {
      expect(createUserSchema.safeParse(valid).success).toBe(true);
    });
    it('should default role to Analyst', () => {
      expect(createUserSchema.parse(valid).role).toBe('Analyst');
    });
    it('should default isActive to true', () => {
      expect(createUserSchema.parse(valid).isActive).toBe(true);
    });
    it('should reject short password', () => {
      expect(createUserSchema.safeParse({ ...valid, password: '12' }).success).toBe(false);
    });
    it('should reject invalid role', () => {
      expect(createUserSchema.safeParse({ ...valid, role: 'Root' }).success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('should accept partial update', () => {
      expect(updateUserSchema.safeParse({ fullName: 'New' }).success).toBe(true);
    });
    it('should reject invalid role', () => {
      expect(updateUserSchema.safeParse({ role: 'SuperAdmin' }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should accept valid password', () => {
      expect(resetPasswordSchema.safeParse({ newPassword: 'NewPass12' }).success).toBe(true);
    });
    it('should reject short password', () => {
      expect(resetPasswordSchema.safeParse({ newPassword: '12' }).success).toBe(false);
    });
  });

  describe('userQuerySchema', () => {
    it('should default sort to created_at', () => {
      expect(userQuerySchema.parse({}).sort).toBe('created_at');
    });
    it('should coerce isActive string', () => {
      const result = userQuerySchema.parse({ isActive: 'true' });
      expect(result.isActive).toBe(true);
    });
  });
});
