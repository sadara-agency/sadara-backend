// ─────────────────────────────────────────────────────────────
// src/middleware/upload.ts — Multer file upload middleware
// Uses memory storage so buffers can be processed by Sharp
// and uploaded to GCS (or local fallback) via storage.ts
// ─────────────────────────────────────────────────────────────
import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { logger } from "@config/logger";

// Legacy export: signing services write PDFs directly to this directory
export const UPLOAD_DIR_PATH = path.resolve(
  process.cwd(),
  "uploads",
  "documents",
);

// ── Allowed MIME types ──

const ALLOWED_MIMES = [
  // Images (including HEIC from iPhones)
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// ── Memory storage (buffers, no disk writes) ──

const storage = multer.memoryStorage();

// ── File filter ──

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  // Normalize HEIC/HEIF (some browsers/OS report different casing)
  const mime = file.mimetype.toLowerCase();
  if (ALLOWED_MIMES.includes(mime)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type '${file.mimetype}' is not allowed. Allowed: images (JPEG, PNG, WebP, HEIC), PDF, Word, Excel, text.`,
      ),
    );
  }
};

// ── Export configured multer instance ──

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("file");

// ── Magic byte verification middleware ──
// Checks actual file content (now from buffer, not disk) to prevent MIME type spoofing.

const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47] }],
  "image/webp": [{ bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF
  "image/heic": [
    { bytes: [0x00, 0x00, 0x00], offset: 0 }, // ftyp box (offset 4 has "ftyp")
  ],
  "image/heif": [{ bytes: [0x00, 0x00, 0x00], offset: 0 }],
  "application/msword": [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }], // OLE2
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP/PK
  ],
  "application/vnd.ms-excel": [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
  ],
};

export async function verifyFileType(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;
  if (!file) return next();

  const mime = file.mimetype.toLowerCase();
  const signatures = MAGIC_BYTES[mime];

  // Text/CSV files have no reliable magic bytes — allow them through
  if (!signatures) return next();

  // HEIC/HEIF: check for "ftyp" at byte offset 4 (ISO base media format)
  if (mime === "image/heic" || mime === "image/heif") {
    const ftypTag = file.buffer.slice(4, 8).toString("ascii");
    if (ftypTag === "ftyp") return next();
    res.status(400).json({
      success: false,
      message: "File content does not match its declared HEIC/HEIF type.",
    });
    return;
  }

  // Standard magic byte check (from buffer, not disk)
  const buf = file.buffer;
  const match = signatures.some((sig) => {
    const offset = sig.offset || 0;
    return sig.bytes.every((b, i) => buf[offset + i] === b);
  });

  if (!match) {
    // Images are re-encoded by Sharp during upload, which validates them anyway.
    // Log a warning and allow through — Sharp will reject truly invalid files.
    if (mime.startsWith("image/")) {
      logger.warn(
        `[upload] Magic byte mismatch for ${mime} (file: ${file.originalname}, size: ${buf.length}, first bytes: ${buf.slice(0, 8).toString("hex")}) — allowing through for Sharp validation`,
      );
      return next();
    }

    res.status(400).json({
      success: false,
      message: "File content does not match its declared type.",
    });
    return;
  }

  next();
}
