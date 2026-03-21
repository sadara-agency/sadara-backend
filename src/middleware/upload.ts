// ─────────────────────────────────────────────────────────────
// src/shared/middleware/upload.ts — Multer file upload middleware
// ─────────────────────────────────────────────────────────────
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// ── Upload directory ──

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "documents");

// Ensure directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Allowed MIME types ──

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// ── Storage config ──

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    // Normalize .jfif → .jpg (JFIF is a JPEG variant common on Windows)
    if (ext === ".jfif") ext = ".jpg";
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

// ── File filter ──

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type '${file.mimetype}' is not allowed. Allowed: PDF, images, Word, Excel, text.`,
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

export const UPLOAD_DIR_PATH = UPLOAD_DIR;

// ── Magic byte verification middleware ──
// Checks actual file content to prevent MIME type spoofing.

const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47] }],
  "image/webp": [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }], // RIFF
  "application/msword": [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }], // OLE2
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
  ], // ZIP/PK
  "application/vnd.ms-excel": [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
  ],
};

import { Request, Response, NextFunction } from "express";

export async function verifyFileType(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;
  if (!file) return next();

  const mime = file.mimetype;
  const signatures = MAGIC_BYTES[mime];

  // Text/CSV files have no reliable magic bytes — allow them through
  if (!signatures) return next();

  try {
    const handle = await fs.promises.open(file.path, "r");
    try {
      const buf = Buffer.alloc(8);
      await handle.read(buf, 0, 8, 0);

      const match = signatures.some((sig) => {
        const offset = sig.offset || 0;
        return sig.bytes.every((b, i) => buf[offset + i] === b);
      });

      if (!match) {
        await handle.close();
        // Delete the spoofed file
        await fs.promises.unlink(file.path);
        res.status(400).json({
          success: false,
          message: "File content does not match its declared type.",
        });
        return;
      }
    } finally {
      await handle.close();
    }
  } catch {
    // Fail closed — if we can't verify, reject the upload
    try {
      await fs.promises.unlink(file.path);
    } catch {
      // Best-effort cleanup
    }
    res.status(400).json({
      success: false,
      message: "Unable to verify file type. Upload rejected.",
    });
    return;
  }

  next();
}
