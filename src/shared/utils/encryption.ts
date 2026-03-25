import crypto from "crypto";
import { env } from "@config/env";
import { AppError } from "@middleware/errorHandler";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV
const TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = "base64"; // Store as base64 string

// Fixed salt for key derivation — changing this will invalidate all encrypted data.
// This is acceptable because the ENCRYPTION_KEY itself provides the entropy.
const KDF_SALT = Buffer.from("sadara-aes256-kdf-v1");

/** Cache derived keys so scryptSync / SHA-256 run only once per process. */
let _scryptKey: Buffer | null = null;
let _legacySha256Key: Buffer | null = null;

function getRawKey(): string {
  const raw = env.encryption.key || "";
  if (!raw) {
    throw new AppError(
      "ENCRYPTION_KEY is not set — cannot encrypt/decrypt",
      500,
    );
  }
  return raw;
}

/**
 * Derive a 32-byte key using scrypt (preferred).
 */
function getKey(): Buffer {
  if (_scryptKey) return _scryptKey;
  _scryptKey = crypto.scryptSync(getRawKey(), KDF_SALT, 32, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return _scryptKey;
}

/**
 * Legacy SHA-256 key derivation — used only to decrypt data
 * encrypted before the scrypt upgrade. Will be removed in a future release.
 */
function getLegacyKey(): Buffer {
  if (_legacySha256Key) return _legacySha256Key;
  _legacySha256Key = crypto.createHash("sha256").update(getRawKey()).digest();
  return _legacySha256Key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns `iv:tag:ciphertext` all in base64.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString(ENCODING),
    tag.toString(ENCODING),
    encrypted.toString(ENCODING),
  ].join(":");
}

/**
 * Decrypt a value produced by `encrypt()`.
 * Expects format `iv:tag:ciphertext` in base64.
 *
 * Tries scrypt-derived key first. If that fails (data encrypted before
 * the KDF upgrade), falls back to the legacy SHA-256 key.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new AppError(
      "Invalid encrypted value format — expected iv:tag:data",
      400,
    );
  }
  const iv = Buffer.from(parts[0], ENCODING);
  const tag = Buffer.from(parts[1], ENCODING);
  const encrypted = Buffer.from(parts[2], ENCODING);

  // Try scrypt key first (current)
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    // Fall back to legacy SHA-256 key for data encrypted before the upgrade
    const decipher = crypto.createDecipheriv(ALGORITHM, getLegacyKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  }
}

/**
 * Check whether a value looks like it was produced by `encrypt()`.
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  try {
    // Check that all parts are valid base64
    Buffer.from(parts[0], ENCODING);
    Buffer.from(parts[1], ENCODING);
    Buffer.from(parts[2], ENCODING);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sequelize model hook helpers.
 * Usage:
 *   MyModel.addHook('beforeSave', encryptFields(['phone', 'nationalId']));
 *   MyModel.addHook('afterFind', decryptFields(['phone', 'nationalId']));
 */
export function encryptFields(fields: string[]) {
  return (instance: any) => {
    if (!instance) return;
    for (const field of fields) {
      const val = instance.getDataValue?.(field);
      if (val == null) continue;
      // Convert numbers to strings so they can be encrypted
      const strVal = typeof val === "number" ? String(val) : val;
      if (typeof strVal === "string" && !isEncrypted(strVal)) {
        instance.setDataValue(field, encrypt(strVal));
      }
    }
  };
}

export function decryptFields(fields: string[]) {
  return (result: any) => {
    if (!result) return;
    const items = Array.isArray(result) ? result : [result];
    for (const instance of items) {
      for (const field of fields) {
        const val = instance.getDataValue?.(field) ?? instance[field];
        if (val && typeof val === "string" && isEncrypted(val)) {
          try {
            const decrypted = decrypt(val);
            if (instance.setDataValue) {
              instance.setDataValue(field, decrypted);
            } else {
              instance[field] = decrypted;
            }
          } catch {
            // Corrupted encrypted data — return null instead of crashing
            if (instance.setDataValue) {
              instance.setDataValue(field, null);
            } else {
              instance[field] = null;
            }
          }
        }
      }
    }
  };
}
