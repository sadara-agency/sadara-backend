import { buildAuditContext, buildChanges } from '../../../src/shared/utils/audit';

describe('audit utilities', () => {
  describe('buildAuditContext', () => {
    it('should build context from user object', () => {
      const user = { id: 'u1', fullName: 'Ahmed Ali', role: 'admin' as const };
      const ctx = buildAuditContext(user, '192.168.1.1');

      expect(ctx).toEqual({
        userId: 'u1',
        userName: 'Ahmed Ali',
        userRole: 'admin',
        ip: '192.168.1.1',
      });
    });

    it('should handle missing ip', () => {
      const user = { id: 'u2', fullName: 'Sara Khan', role: 'agent' as const };
      const ctx = buildAuditContext(user);

      expect(ctx).toEqual({
        userId: 'u2',
        userName: 'Sara Khan',
        userRole: 'agent',
        ip: undefined,
      });
    });
  });

  describe('buildChanges', () => {
    it('should return changed fields only', () => {
      const old = { name: 'Alice', age: 25, city: 'Riyadh' };
      const updated = { name: 'Alice', age: 26, city: 'Jeddah' };

      const result = buildChanges(old, updated);

      expect(result).toEqual({
        age: { old: 25, new: 26 },
        city: { old: 'Riyadh', new: 'Jeddah' },
      });
    });

    it('should return null when nothing changed', () => {
      const old = { name: 'Bob', age: 30 };
      const updated = { name: 'Bob', age: 30 };

      expect(buildChanges(old, updated)).toBeNull();
    });

    it('should skip undefined values in new object', () => {
      const old = { name: 'Carol', age: 28 };
      const updated = { name: undefined, age: 29 };

      const result = buildChanges(old, updated);

      expect(result).toEqual({
        age: { old: 28, new: 29 },
      });
    });

    it('should handle null old values', () => {
      const old = { nickname: null };
      const updated = { nickname: 'CJ' };

      const result = buildChanges(old, updated);

      expect(result).toEqual({
        nickname: { old: null, new: 'CJ' },
      });
    });
  });
});
