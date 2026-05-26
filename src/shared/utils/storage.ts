// ─────────────────────────────────────────────────────────────
// src/shared/utils/storage.ts — Cloud Storage abstraction (Supabase + local fallback)
// ─────────────────────────────────────────────────────────────
import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { USE_SUPABASE, getSupabase, publicUrlForKey } from "./supabaseStorage";

// ── Config ──

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const BUCKET = env.supabase.bucket;

// ── Types ──

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  key: string; // Supabase object key or local filename
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
  | "training-media"
  | "video-clips"
  | "designs"
  | "reports";

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

  const key = `${folder}/${baseName}${finalExt}`;
  await writeToStorage(key, processedBuffer, finalMime);

  // Thumbnail (images only)
  let thumbnailUrl: string | null = null;
  if (isImage && generateThumbnail) {
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    const thumbKey = `${folder}/thumb_${baseName}.webp`;
    await writeToStorage(thumbKey, thumbBuffer, "image/webp");
    thumbnailUrl = thumbKey;
  }

  return {
    url: key,
    thumbnailUrl,
    key,
    size: processedBuffer.length,
    mimeType: finalMime,
  };
}

// ── Delete file ──

export async function deleteFile(key: string): Promise<void> {
  if (USE_SUPABASE) {
    const { error } = await getSupabase().storage.from(BUCKET).remove([key]);
    if (error) {
      logger.warn(`[storage] Failed to delete Supabase object: ${key}`, error);
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

// Public bucket: every object is reachable at a stable public URL.
// Kept for API compatibility with callers that imported getSignedUrl.
export async function getSignedUrl(
  key: string,
  _expiresInMinutes = 60,
): Promise<string> {
  if (!USE_SUPABASE) return `/uploads/${key}`;
  return publicUrlForKey(key);
}

// ── Internal: write to Supabase or local disk ──

async function writeToStorage(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  if (USE_SUPABASE) {
    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(key, buffer, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    if (error) throw error;
    return;
  }

  // Local fallback
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buffer);
}

/**
 * Write a raw buffer to storage at an exact key (no image processing).
 * Use for server-generated artifacts like PDFs. Returns the bare key.
 */
export async function writeBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await writeToStorage(key, buffer, contentType);
  return key;
}

// ── Helpers ──

/**
 * True when the reference is a bare storage key (e.g. "documents/abc.pdf"),
 * as opposed to a full http(s) URL or a local /uploads/ path. Bare keys are
 * streamed through the backend by some controllers.
 */
export function isStorageKey(urlOrKey: string): boolean {
  if (!urlOrKey) return false;
  if (urlOrKey.startsWith("http")) return false;
  if (urlOrKey.startsWith("/uploads/")) return false;
  return true;
}

/**
 * Resolve a stored file reference to an accessible URL.
 * - Empty: returned as-is.
 * - Full http(s) URL (legacy GCS, external, or already-public): pass through.
 * - Local /uploads/ path: pass through (dev static serving).
 * - Bare key (e.g. "photos/abc.webp"): build the Supabase public URL.
 */
export async function resolveFileUrl(
  urlOrKey: string,
  _expiresInMinutes = 60,
): Promise<string> {
  if (!urlOrKey) return urlOrKey;
  if (urlOrKey.startsWith("http")) return urlOrKey;
  if (urlOrKey.startsWith("/uploads/")) return urlOrKey;
  if (USE_SUPABASE) return publicUrlForKey(urlOrKey);
  return urlOrKey;
}

export async function streamFileBuffer(key: string): Promise<Buffer> {
  if (!USE_SUPABASE) {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    return readFile(join(process.cwd(), "uploads", key));
  }
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .download(key);
  if (error || !data) throw error ?? new Error(`Download failed: ${key}`);
  return Buffer.from(await data.arrayBuffer());
}

// ── Startup log ──

if (USE_SUPABASE) {
  logger.info(`[storage] Using Supabase Storage bucket: ${BUCKET}`);
} else {
  logger.info(
    "[storage] Supabase not configured — using local disk storage (uploads/)",
  );
}
