import { encrypt, decrypt, isEncrypted, encryptFields, decryptFields } from '../../../src/shared/utils/encryption';

// Set encryption key before importing
beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
});

describe('encryption utilities', () => {
  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a string round-trip', () => {
      const plaintext = 'Hello, world!';
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should produce different ciphertexts for same input (random IV)', () => {
      const plaintext = 'same-input';
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe(plaintext);
      expect(decrypt(b)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('');
      expect(decrypt(encrypted)).toBe('');
    });

    it('should handle unicode text', () => {
      const plaintext = 'مرحبا بالعالم 🌍';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('not-valid')).toThrow('Invalid encrypted value format');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('hello')).toBe(false);
    });

    it('should return false for empty/null', () => {
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields on a mock instance', () => {
      const data: Record<string, string> = { phone: '0501234567', name: 'Ali' };
      const instance = {
        getDataValue: (f: string) => data[f],
        setDataValue: (f: string, v: string) => { data[f] = v; },
      };
      encryptFields(['phone'])(instance);
      expect(data.phone).not.toBe('0501234567');
      expect(isEncrypted(data.phone)).toBe(true);
      expect(data.name).toBe('Ali'); // untouched
    });

    it('should skip null instance', () => {
      expect(() => encryptFields(['phone'])(null)).not.toThrow();
    });

    it('should not double-encrypt', () => {
      const data: Record<string, string> = { phone: encrypt('0501234567') };
      const original = data.phone;
      const instance = {
        getDataValue: (f: string) => data[f],
        setDataValue: (f: string, v: string) => { data[f] = v; },
      };
      encryptFields(['phone'])(instance);
      expect(data.phone).toBe(original); // unchanged
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified fields on a mock instance', () => {
      const encrypted = encrypt('0501234567');
      const data: Record<string, string> = { phone: encrypted, name: 'Ali' };
      const instance = {
        getDataValue: (f: string) => data[f],
        setDataValue: (f: string, v: string) => { data[f] = v; },
      };
      decryptFields(['phone'])(instance);
      expect(data.phone).toBe('0501234567');
      expect(data.name).toBe('Ali');
    });

    it('should handle arrays of instances', () => {
      const items = [
        { phone: encrypt('111'), getDataValue: function(f: string) { return (this as any)[f]; }, setDataValue: function(f: string, v: string) { (this as any)[f] = v; } },
        { phone: encrypt('222'), getDataValue: function(f: string) { return (this as any)[f]; }, setDataValue: function(f: string, v: string) { (this as any)[f] = v; } },
      ];
      decryptFields(['phone'])(items);
      expect(items[0].phone).toBe('111');
      expect(items[1].phone).toBe('222');
    });

    it('should skip null result', () => {
      expect(() => decryptFields(['phone'])(null)).not.toThrow();
    });
  });
});
