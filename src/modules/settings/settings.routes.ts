import { Router, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { AuthRequest } from "@shared/types";
import multer from "multer";
import { AppError } from "@middleware/errorHandler";
import * as settingsController from "./settings.controller";
import {
  updateProfileSchema,
  changePasswordSchema,
  teamQuerySchema,
  updateUserSchema,
  notificationPrefsSchema,
  smtpSettingsSchema,
  matchAnalysisSettingsSchema,
  testConnectionSchema,
  sidebarConfigSchema,
} from "./settings.validation";

const router = Router();
router.use(authenticate);

// ── CSV Upload Middleware ──

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".csv") ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
}).array("files", 10);

// ══════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════

router.get(
  "/profile",
  authorizeModule("settings", "read"),
  asyncHandler(settingsController.getProfile),
);

router.patch(
  "/profile",
  authorizeModule("settings", "update"),
  validate(updateProfileSchema),
  asyncHandler(settingsController.updateProfile),
);

router.post(
  "/change-password",
  authorizeModule("settings", "update"),
  validate(changePasswordSchema),
  asyncHandler(settingsController.changePassword),
);

// ══════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ══════════════════════════════════════════

router.get(
  "/notifications",
  authorizeModule("settings", "read"),
  asyncHandler(settingsController.getNotificationPrefs),
);

router.patch(
  "/notifications",
  authorizeModule("settings", "update"),
  validate(notificationPrefsSchema),
  asyncHandler(settingsController.updateNotificationPrefs),
);

// ══════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════

router.get(
  "/team",
  authorizeModule("settings", "read"),
  validate(teamQuerySchema, "query"),
  asyncHandler(settingsController.listTeam),
);

router.patch(
  "/team/:id",
  authorizeModule("settings", "update"),
  validate(updateUserSchema),
  asyncHandler(settingsController.updateTeamMember),
);

// ══════════════════════════════════════════
// TASK AUTOMATION RULES
// ══════════════════════════════════════════

router.get(
  "/task-rules",
  authorizeModule("settings", "read"),
  asyncHandler(settingsController.getTaskRules),
);

router.patch(
  "/task-rules",
  authorizeModule("settings", "update"),
  asyncHandler(settingsController.updateTaskRules),
);

// ══════════════════════════════════════════
// INTEGRATIONS
// ══════════════════════════════════════════

router.post(
  "/integrations/test-connection",
  authorizeModule("settings", "create"),
  validate(testConnectionSchema),
  asyncHandler(settingsController.testConnection),
);

// ══════════════════════════════════════════
// SMTP
// ══════════════════════════════════════════

router.get(
  "/smtp",
  authorizeModule("settings", "read"),
  asyncHandler(settingsController.getSmtpSettings),
);

router.patch(
  "/smtp",
  authorizeModule("settings", "update"),
  validate(smtpSettingsSchema),
  asyncHandler(settingsController.updateSmtpSettings),
);

router.post(
  "/smtp/test",
  authorizeModule("settings", "create"),
  asyncHandler(settingsController.testSmtpConnection),
);

// ══════════════════════════════════════════
// MATCH ANALYSIS PROVIDER
// ══════════════════════════════════════════

router.get(
  "/match-analysis",
  authorizeModule("settings", "read"),
  asyncHandler(settingsController.getMatchAnalysisSettings),
);

router.patch(
  "/match-analysis",
  authorizeModule("settings", "update"),
  validate(matchAnalysisSettingsSchema),
  asyncHandler(settingsController.updateMatchAnalysisSettings),
);

router.post(
  "/match-analysis/test",
  authorizeModule("settings", "create"),
  asyncHandler(settingsController.testMatchAnalysisConnection),
);

// ══════════════════════════════════════════
// SIDEBAR CONFIGURATION
// ══════════════════════════════════════════

router.get(
  "/sidebar",
  authorizeModule("settings", "read"),
  asyncHandler(settingsController.getSidebarConfig),
);

router.patch(
  "/sidebar",
  authorizeModule("settings", "update"),
  validate(sidebarConfigSchema),
  asyncHandler(settingsController.updateSidebarConfig),
);

router.put(
  "/sidebar/reset",
  authorizeModule("settings", "update"),
  asyncHandler(settingsController.resetSidebarConfig),
);

// ══════════════════════════════════════════
// CSV IMPORT
// ══════════════════════════════════════════

router.post(
  "/import-csv",
  authorizeModule("settings", "create"),
  (req: AuthRequest, res: Response, next: any) => {
    csvUpload(req as any, res, (err: any) => {
      if (err) return next(new AppError(err.message, 400));
      next();
    });
  },
  asyncHandler(settingsController.importCsv),
);

export default router;
