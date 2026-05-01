import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import { cacheRoute } from "@middleware/cache.middleware";
import { CachePrefix, CacheTTL } from "@shared/utils/cache";
import * as portalController from "@modules/portal/portal.controller";
import * as authController from "@modules/auth/auth.controller";

const router = Router();

// ── Validation Schemas ──
const completeRegistrationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const generateInviteSchema = z.object({
  playerId: z.string().uuid("Invalid player ID format"),
});

const updateProfileSchema = z.object({
  phone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianRelation: z.string().optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(200).optional(),
});

const signContractSchema = z.object({
  action: z.enum(["sign_digital", "sign_upload"]),
  signatureData: z.string().optional(),
  signedDocumentUrl: z.string().optional(),
});

// ── Public route: complete registration via invite token ──
router.post(
  "/register",
  validate(completeRegistrationSchema),
  asyncHandler(portalController.completeRegistration),
);

// ── All other portal routes require authentication ──
router.use(authenticate);
router.use(dynamicFieldAccess("portal"));

// ── Player-only routes (role: Player) ──
router.get(
  "/me",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(portalController.getMyProfile),
);
router.patch(
  "/me",
  authorize("Player"),
  validate(updateProfileSchema),
  asyncHandler(portalController.updateMyProfile),
);
router.post(
  "/me/request-link",
  authorize("Player"),
  asyncHandler(portalController.requestProfileLink),
);
router.post(
  "/me/avatar",
  authorize("Player"),
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
  asyncHandler(authController.uploadAvatar),
);
router.get(
  "/injuries",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.SHORT, { perUser: true }),
  asyncHandler(portalController.getMyInjuries),
);
/**
 * @swagger
 * /portal/schedule:
 *   get:
 *     summary: "[DEPRECATED] Get player schedule"
 *     description: "Deprecated — use GET /calendar/aggregated?viewMode=player instead. Will be removed after player portal migrates to the unified calendar."
 *     deprecated: true
 *     tags: [Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player schedule
 */
router.get(
  "/schedule",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.SHORT, { perUser: true }),
  asyncHandler(portalController.getMySchedule),
);
/**
 * @swagger
 * /portal/sessions:
 *   get:
 *     summary: "[DEPRECATED] Get player sessions"
 *     description: "Deprecated — use GET /calendar/aggregated?viewMode=player instead. Will be removed after player portal migrates to the unified calendar."
 *     deprecated: true
 *     tags: [Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player sessions
 */
router.get(
  "/sessions",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.SHORT, { perUser: true }),
  asyncHandler(portalController.getMySessions),
);
router.get(
  "/documents",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(portalController.getMyDocuments),
);
router.post(
  "/documents/upload",
  authorize("Player"),
  uploadSingle,
  verifyFileType,
  asyncHandler(portalController.uploadMyDocument),
);
router.get(
  "/contracts",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(portalController.getMyContracts),
);
router.post(
  "/contracts/:id/sign/upload",
  authorize("Player"),
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
  asyncHandler(portalController.uploadSignedContractFile),
);
router.post(
  "/contracts/:id/sign",
  authorize("Player"),
  validate(signContractSchema),
  asyncHandler(portalController.signMyContract),
);
router.get(
  "/development",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(portalController.getMyDevelopment),
);
router.get(
  "/stats",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(portalController.getMyStats),
);
router.get(
  "/programs",
  authorize("Player"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.SHORT, { perUser: true }),
  asyncHandler(portalController.getMyPrograms),
);

// ── Admin/Manager routes: generate invite links ──
router.post(
  "/invite",
  authorize("Admin", "Manager"),
  validate(generateInviteSchema),
  asyncHandler(portalController.generateInvite),
);

// ── Admin/Manager routes: player account management ──
router.get(
  "/accounts",
  authorize("Admin", "Manager"),
  cacheRoute(CachePrefix.PORTAL, CacheTTL.MEDIUM),
  asyncHandler(portalController.listPlayerAccounts),
);
router.patch(
  "/accounts/:id",
  authorize("Admin", "Manager"),
  validate(
    z.object({
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    }),
  ),
  asyncHandler(portalController.updatePlayerAccount),
);
router.delete(
  "/accounts/:id",
  authorize("Admin", "Manager"),
  asyncHandler(portalController.deletePlayerAccount),
);
router.post(
  "/accounts/:id/resend-invite",
  authorize("Admin", "Manager"),
  asyncHandler(portalController.resendInvite),
);

export default router;
