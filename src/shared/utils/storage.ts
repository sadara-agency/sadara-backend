// ─────────────────────────────────────────────────────────────
// src/shared/utils/storage.ts — Cloud Storage abstraction (GCS + local fallback)
// ─────────────────────────────────────────────────────────────
import { Storage as GCSStorage } from "@google-cloud/storage";
import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { env } from "@config/env";
import { logger } from "@config/logger";

// ── Config ──

const USE_GCS = !!(env.gcs.bucket && env.gcs.projectId);
const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

// Lazy-init GCS client (only when credentials are set)
let gcsClient: GCSStorage | null = null;
function getGCS(): GCSStorage {
  if (!gcsClient) {
    const opts: ConstructorParameters<typeof GCSStorage>[0] = {
      projectId: env.gcs.projectId,
    };

    if (env.gcs.credentialsJson) {
      // PaaS (Railway/Render): credentials passed as JSON string via env var
      opts.credentials = JSON.parse(env.gcs.credentialsJson);
    } else if (env.gcs.credentials) {
      // Local dev: path to service account key file
      opts.keyFilename = env.gcs.credentials;
    }
    // If neither set, uses Application Default Credentials (ADC)

    gcsClient = new GCSStorage(opts);
  }
  return gcsClient;
}

// ── Types ──

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  key: string; // GCS object key or local filename
  size: number;
  mimeType: string;
}

export type UploadFolder =
  | "photos"
  | "documents"
  | "avatars"
  | "signed-contracts"
  | "signed-documents"
  | "voice-memos"
  | "training-media";

/** Folders whose objects are made publicly readable on upload */
const PUBLIC_FOLDERS: ReadonlySet<UploadFolder> = new Set([
  "photos",
  "avatars",
  "training-media",
]);

/** Folders whose objects stay private — access via signed URLs only */
const PRIVATE_FOLDERS: ReadonlySet<UploadFolder> = new Set([
  "documents",
  "signed-contracts",
  "signed-documents",
  "voice-memos",
]);

export interface UploadOptions {
  folder: UploadFolder;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  /** Generate a thumbnail (only for images) */
  generateThumbnail?: boolean;
}

// ── Image sizes ──

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1920;
const THUMBNAIL_SIZE = 300;
const IMAGE_QUALITY = 82;
const THUMBNAIL_QUALITY = 70;

// ── HEIC detection ──

const HEIC_MIMES = ["image/heic", "image/heif"];

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/") || HEIC_MIMES.includes(mime);
}

// ── Core: process + upload ──

export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const {
    folder,
    originalName,
    mimeType,
    buffer,
    generateThumbnail = true,
  } = opts;

  const ext = path.extname(originalName).toLowerCase();
  const baseName = `${crypto.randomUUID()}`;
  const isImage = isImageMime(mimeType);

  let processedBuffer: Buffer;
  let finalMime: string;
  let finalExt: string;

  if (isImage) {
    // Process with Sharp: auto-orient, resize, convert HEIC → WebP, optimize
    const pipeline = sharp(buffer).rotate(); // auto-orient from EXIF

    // Resize if larger than max dimensions (preserve aspect ratio)
    pipeline.resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Convert to WebP for optimal size (HEIC, PNG, etc.)
    pipeline.webp({ quality: IMAGE_QUALITY });
    finalMime = "image/webp";
    finalExt = ".webp";

    processedBuffer = await pipeline.toBuffer();
  } else {
    // Non-image files pass through unchanged
    processedBuffer = buffer;
    finalMime = mimeType;
    finalExt = ext || ".bin";
  }

  const isPublic = PUBLIC_FOLDERS.has(folder);
  const key = `${folder}/${baseName}${finalExt}`;
  const url = await writeToStorage(key, processedBuffer, finalMime, isPublic);

  // Thumbnail (images only)
  let thumbnailUrl: string | null = null;
  if (isImage && generateThumbnail) {
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    const thumbKey = `${folder}/thumb_${baseName}.webp`;
    thumbnailUrl = await writeToStorage(
      thumbKey,
      thumbBuffer,
      "image/webp",
      isPublic,
    );
  }

  return {
    url,
    thumbnailUrl,
    key,
    size: processedBuffer.length,
    mimeType: finalMime,
  };
}

// ── Delete file ──

export async function deleteFile(key: string): Promise<void> {
  if (USE_GCS) {
    try {
      await getGCS()
        .bucket(env.gcs.bucket)
        .file(key)
        .delete({ ignoreNotFound: true });
    } catch (err) {
      logger.warn(`[storage] Failed to delete GCS object: ${key}`, err);
    }
  } else {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File may not exist — that's fine
    }
  }
}

// ── Generate signed URL (for private documents) ──

export async function getSignedUrl(
  key: string,
  expiresInMinutes = 60,
): Promise<string> {
  if (!USE_GCS) {
    // Local: just return the relative path (caller must build full URL)
    return `/uploads/${key}`;
  }

  const [url] = await getGCS()
    .bucket(env.gcs.bucket)
    .file(key)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

  return url;
}

// ── Internal: write to GCS or local disk ──

async function writeToStorage(
  key: string,
  buffer: Buffer,
  contentType: string,
  isPublic: boolean,
): Promise<string> {
  if (USE_GCS) {
    const bucket = getGCS().bucket(env.gcs.bucket);
    const file = bucket.file(key);

    await file.save(buffer, {
      contentType,
      resumable: false, // Small files — no need for resumable
      metadata: {
        cacheControl: isPublic
          ? "public, max-age=31536000, immutable" // CDN cache 1 year
          : "private, no-store",
      },
    });

    if (isPublic) {
      // Make object publicly readable (fine-grained ACL buckets).
      // Fails silently on uniform bucket-level access buckets — those
      // rely on bucket IAM (allUsers → Storage Object Viewer) instead.
      try {
        await file.makePublic();
      } catch {
        logger.debug(
          `[storage] makePublic() skipped for ${key} (uniform bucket-level access)`,
        );
      }
      return `https://storage.googleapis.com/${env.gcs.bucket}/${key}`;
    }

    // Private files — return the GCS key, NOT a URL.
    // Callers must use getSignedUrl(key) to generate time-limited access.
    return key;
  }

  // Local fallback
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buffer);

  // Return relative path — caller builds full URL with req.protocol + host
  return `/uploads/${key}`;
}

// ── Helpers ──

/** Check if a stored URL/key is a private GCS key (needs signed URL) */
export function isPrivateKey(urlOrKey: string): boolean {
  return PRIVATE_FOLDERS.has(urlOrKey.split("/")[0] as UploadFolder);
}

/**
 * Resolve a stored file reference to an accessible URL.
 * - Public files: already a full URL, returned as-is.
 * - Private GCS keys: generates a signed URL (default 60 min).
 * - Local paths: returned as-is (served by Express static).
 */
export async function resolveFileUrl(
  urlOrKey: string,
  expiresInMinutes = 60,
): Promise<string> {
  if (!urlOrKey) return urlOrKey;

  // Already a full URL (public GCS or external URL) — pass through
  if (urlOrKey.startsWith("http")) return urlOrKey;

  // Local path — pass through
  if (urlOrKey.startsWith("/uploads/")) return urlOrKey;

  // Private GCS key — generate signed URL
  if (USE_GCS && isPrivateKey(urlOrKey)) {
    return getSignedUrl(urlOrKey, expiresInMinutes);
  }

  // Public GCS key — return direct public URL
  if (USE_GCS && env.gcs.bucket) {
    return `https://storage.googleapis.com/${env.gcs.bucket}/${urlOrKey}`;
  }

  return urlOrKey;
}

// ── Startup log ──

if (USE_GCS) {
  logger.info(`[storage] Using Google Cloud Storage bucket: ${env.gcs.bucket}`);
} else {
  logger.info(
    "[storage] GCS not configured — using local disk storage (uploads/)",
  );
}
