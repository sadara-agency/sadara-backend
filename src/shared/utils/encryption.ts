import crypto from "crypto";
import { env } from "@config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV
const TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = "base64"; // Store as base64 string

/**
 * Derive a 32-byte key from the configured encryption key.
 * Uses SHA-256 to normalise any key length to exactly 32 bytes.
 */
function getKey(): Buffer {
  const raw = env.encryption.key || process.env.ENCRYPTION_KEY || "";
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set — cannot encrypt/decrypt");
  }
  return crypto.createHash("sha256").update(raw).digest();
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
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format — expected iv:tag:data");
  }
  const key = getKey();
  const iv = Buffer.from(parts[0], ENCODING);
  const tag = Buffer.from(parts[1], ENCODING);
  const encrypted = Buffer.from(parts[2], ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
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
