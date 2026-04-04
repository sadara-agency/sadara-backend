import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentQuerySchema,
} from "@modules/documents/document.validation";
import { uploadSingle, verifyFileType, sanitizeCsv } from "@middleware/upload";
import { uploadLimiter } from "@middleware/rateLimiter";
import * as ctrl from "@modules/documents/document.controller";

const router = Router();
router.use(authenticate);

// List & detail
router.get(
  "/",
  authorizeModule("documents", "read"),
  validate(documentQuerySchema, "query"),
  asyncHandler(ctrl.list),
);
router.get(
  "/:id",
  authorizeModule("documents", "read"),
  asyncHandler(ctrl.getById),
);
router.get(
  "/:id/download",
  authorizeModule("documents", "read"),
  asyncHandler(ctrl.download),
);

// Upload real file (multipart/form-data) — metadata in form fields
router.post(
  "/upload",
  uploadLimiter,
  authorizeModule("documents", "create"),
  (req, res, next) => {
    uploadSingle(req, res, (err: any) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large. Maximum size is 25MB."
            : err.message || "Upload failed";
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  verifyFileType,
  sanitizeCsv,
  asyncHandler(ctrl.upload),
);

// Create via JSON (external URL, no file upload)
router.post(
  "/",
  authorizeModule("documents", "create"),
  validate(createDocumentSchema),
  asyncHandler(ctrl.create),
);

// Update & delete
router.patch(
  "/:id",
  authorizeModule("documents", "update"),
  validate(updateDocumentSchema),
  asyncHandler(ctrl.update),
);
router.delete(
  "/:id",
  authorizeModule("documents", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
