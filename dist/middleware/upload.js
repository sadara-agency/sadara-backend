"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIR_PATH = exports.uploadSingle = void 0;
// ─────────────────────────────────────────────────────────────
// src/shared/middleware/upload.ts — Multer file upload middleware
// ─────────────────────────────────────────────────────────────
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
// ── Upload directory ──
const UPLOAD_DIR = path_1.default.resolve(process.cwd(), 'uploads', 'documents');
// Ensure directory exists at startup
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// ── Allowed MIME types ──
const ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
// ── Storage config ──
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueName = `${crypto_1.default.randomUUID()}${ext}`;
        cb(null, uniqueName);
    },
});
// ── File filter ──
const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed: PDF, images, Word, Excel, text.`));
    }
};
// ── Export configured multer instance ──
exports.uploadSingle = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
}).single('file');
exports.UPLOAD_DIR_PATH = UPLOAD_DIR;
//# sourceMappingURL=upload.js.map