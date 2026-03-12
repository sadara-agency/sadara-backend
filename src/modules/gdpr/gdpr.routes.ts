import { Router, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import * as gdprService from "@modules/gdpr/gdpr.service";

const router = Router();
router.use(authenticate);

// ── Right to Access (data export) ──

router.get(
  "/players/:id/export",
  authorizeModule("settings", "read"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await gdprService.exportPlayerData(req.params.id);

    await logAudit(
      "GDPR_EXPORT",
      "players",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `GDPR data export for player ${req.params.id}`,
    );

    sendSuccess(res, data, "Player data exported successfully");
  }),
);

// ── Right to Erasure (anonymization) ──

router.post(
  "/players/:id/anonymize",
  authorizeModule("settings", "delete"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await gdprService.anonymizePlayerData(req.params.id);

    await logAudit(
      "GDPR_ANONYMIZE",
      "players",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `GDPR anonymization completed. Tables: ${result.anonymizedTables.join(", ")}`,
    );

    await invalidateMultiple([
      CachePrefix.PLAYERS,
      CachePrefix.PLAYER,
      CachePrefix.CONTRACTS,
      CachePrefix.FINANCE,
      CachePrefix.OFFERS,
      CachePrefix.MATCHES,
      CachePrefix.REFERRALS,
      CachePrefix.DASHBOARD,
      CachePrefix.REPORTS,
    ]);

    sendSuccess(res, result, "Player data anonymized successfully");
  }),
);

export default router;
