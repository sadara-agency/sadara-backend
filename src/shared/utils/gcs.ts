/**
 * GCP Cloud Storage utilities for training media uploads.
 *
 * Uses @google-cloud/storage SDK with signed URLs for
 * secure, time-limited upload and read access.
 */

import { Storage } from "@google-cloud/storage";
import "@config/env";
import { logger } from "@config/logger";

const storage = new Storage();
const BUCKET = process.env.GCS_TRAINING_BUCKET || "sadara-training-media";

/**
 * Generate a resumable upload URL for the client to upload directly to GCS.
 * Valid for 15 minutes.
 */
export async function generateResumableUploadUrl(
  objectPath: string,
  contentType: string,
): Promise<string> {
  const bucket = storage.bucket(BUCKET);
  const file = bucket.file(objectPath);

  const [url] = await file.createResumableUpload({
    metadata: { contentType },
  });

  return url;
}

/**
 * Generate a signed read URL for serving content.
 * Default expiration: 15 minutes.
 */
export async function generateSignedReadUrl(
  objectPath: string,
  expiresMin = 15,
): Promise<string> {
  const bucket = storage.bucket(BUCKET);
  const file = bucket.file(objectPath);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresMin * 60 * 1000,
  });

  return url;
}

/**
 * Delete an object from GCS.
 */
export async function deleteObject(objectPath: string): Promise<void> {
  const bucket = storage.bucket(BUCKET);
  try {
    await bucket.file(objectPath).delete();
  } catch (err: any) {
    if (err?.code === 404) {
      logger.warn("GCS object not found for deletion", { objectPath });
      return;
    }
    throw err;
  }
}

/**
 * Check if an object exists in GCS.
 */
export async function objectExists(objectPath: string): Promise<boolean> {
  const bucket = storage.bucket(BUCKET);
  const [exists] = await bucket.file(objectPath).exists();
  return exists;
}
