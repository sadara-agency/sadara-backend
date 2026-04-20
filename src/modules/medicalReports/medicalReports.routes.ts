import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import { uploadLimiter } from "@middleware/rateLimiter";
import * as ctrl from "./medicalReports.controller";
import {
  idParamSchema,
  listQuerySchema,
  updateReportSchema,
  updateLabResultsSchema,
} from "./medicalReports.validation";

const router = Router();
router.use(authenticate);

// List — filter by playerId (Admin/Manager/medical roles can read)
router.get(
  "/",
  authorizeModule("medical-reports", "read"),
  validate(listQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

// Upload a new medical report (multipart/form-data). File + metadata in form fields.
router.post(
  "/upload",
  uploadLimiter,
  authorizeModule("medical-reports", "create"),
  (req, res, next) => {
    uploadSingle(req, res, (err: unknown) => {
      if (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "LIMIT_FILE_SIZE"
            ? "File too large. Maximum size is 25MB."
            : e.message || "Upload failed";
        const status = e.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({ success: false, message: msg });
      }
      next();
    });
  },
  verifyFileType,
  asyncHandler(ctrl.upload),
);

// Single report (with lab results + document)
router.get(
  "/:id",
  authorizeModule("medical-reports", "read"),
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.getById),
);

// Update metadata
router.patch(
  "/:id",
  authorizeModule("medical-reports", "update"),
  validate(idParamSchema, "params"),
  validate(updateReportSchema),
  asyncHandler(ctrl.update),
);

// Manual correction of lab result rows (sets parse_status='manual')
router.patch(
  "/:id/lab-results",
  authorizeModule("medical-reports", "update"),
  validate(idParamSchema, "params"),
  validate(updateLabResultsSchema),
  asyncHandler(ctrl.updateLabResults),
);

// Delete (cascades to lab_results + underlying document)
router.delete(
  "/:id",
  authorizeModule("medical-reports", "delete"),
  validate(idParamSchema, "params"),
  asyncHandler(ctrl.remove),
);

export default router;
