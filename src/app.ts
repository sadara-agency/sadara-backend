import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import { QueryTypes } from "sequelize";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { errorHandler } from "@middleware/errorHandler";
import { apiLimiter, authLimiter } from "@middleware/rateLimiter";
import { csrfProtection } from "@middleware/csrf";
import { authenticate, authorizeModule } from "@middleware/auth";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import { sequelize } from "@config/database";
import { isRedisConnected, getRedisClient } from "@config/redis";

// Route imports
import authRoutes from "@modules/auth/auth.routes";
import playerRoutes from "@modules/players/player.routes";
import playerExportRoutes from "@modules/player-export/player-export.routes";
import clubRoutes from "@modules/clubs/club.routes";
import contractRoutes from "@modules/contracts/contract.routes";
import taskRoutes from "@modules/tasks/task.routes";
import dashboardRoutes from "@modules/dashboard/dashboard.routes";
import userRoutes from "@modules/users/user.routes";
import offerRoutes from "@modules/offers/offer.routes";
import matchRoutes from "@modules/matches/match.routes";
import gateRoutes from "@modules/gates/gate.routes";
import referralRoutes from "@modules/referrals/referral.routes";
import playerCareRoutes from "@modules/playercare/playercare.routes";
import scoutingRoutes from "@modules/scouting/scouting.routes";
import financeRoutes from "@modules/finance/finance.routes";
import documentRoutes from "@modules/documents/document.routes";
import medicalReportRoutes from "@modules/medicalReports/medicalReports.routes";
import settingsRoutes from "@modules/settings/settings.routes";
import injuryRoutes from "@modules/injuries/injury.routes";
import trainingRoutes from "@modules/training/training.routes";
import saffRoutes from "@modules/saff/saff.routes";
import saffPlusRoutes from "@modules/saffplus/saffplus.routes";
import notificationRoutes from "@modules/notifications/notification.routes";
import cronRoutes from "./cron/cron.routes";
import portalRoutes from "@modules/portal/portal.routes";
import auditRoutes from "@modules/audit/audit.routes";
import splRoutes from "@modules/spl/spl.routes";
import splIntelligenceRoutes from "@modules/spl/spl.intelligence.routes";
import noteRoutes from "@modules/notes/note.routes";
import reportRoutes from "@modules/reports/report.routes";
import approvalRoutes from "@modules/approvals/approval.routes";
import gdprRoutes from "@modules/gdpr/gdpr.routes";
import permissionRoutes from "@modules/permissions/permission.routes";
import sportmonksRoutes from "@modules/sportmonks/sportmonks.routes";
import competitionRoutes from "@modules/competitions/competition.routes";
import calendarRoutes from "@modules/calendar/event.routes";
import esignatureRoutes from "@modules/esignatures/esignature.routes";
import wellnessRoutes from "@modules/wellness/wellness.routes";
import fitnessRoutes from "@modules/wellness/fitness.routes";
import bodyCompositionRoutes from "@modules/wellness/bodyComposition.routes";
import trainingBlockRoutes from "@modules/wellness/trainingBlock.routes";
import nutritionPrescriptionRoutes from "@modules/wellness/nutritionPrescription.routes";
import developmentProgramRoutes from "@modules/wellness/developmentProgram.routes";
import mediaRoutes from "@modules/media/media.routes";
import journeyRoutes from "@modules/journey/journey.routes";
import evolutionCycleRoutes from "@modules/evolution-cycles/evolution-cycle.routes";
import voiceMemoRoutes from "@modules/voice-memos/voice-memo.routes";
import ticketRoutes from "@modules/tickets/ticket.routes";
import sessionRoutes from "@modules/sessions/session.routes";
import messagingRoutes from "@modules/messaging/messaging.routes";
import packageRoutes from "@modules/packages/package.routes";
import tacticalRoutes from "@modules/tactical/tactical.routes";
import mentalRoutes from "@modules/mental/mental.routes";
import videoRoutes from "@modules/video/video.routes";
import saudiLeaguesRoutes from "@modules/saudiLeagues/saudiLeagues.routes";
import queueRoutes from "@modules/queues/queues.routes";
import transferWindowRoutes from "@modules/transfer-windows/transferWindow.routes";
import clubNeedRoutes from "@modules/club-needs/clubNeed.routes";
import playerCoachAssignmentRoutes from "@modules/player-coach-assignments/playerCoachAssignment.routes";
import { locale } from "@middleware/locale";
import { setupSwagger } from "@config/swagger";

const app = express();

// Trust reverse proxy (Railway, Heroku, etc.) — required for rate limiting & real IPs
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

// ── Global Middleware ──
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(locale);
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check exact matches from env (comma-separated CORS_ORIGIN)
      const allowed = Array.isArray(env.cors.origin)
        ? env.cors.origin
        : [env.cors.origin];
      if (allowed.includes(origin)) return callback(null, true);

      // Allow Vercel preview/production URLs for this project only
      // Matches: sadara-frontend.vercel.app, sadara-frontend-<git-hash>.vercel.app,
      // sadara-frontend-<branch>-<team>.vercel.app — but NOT sadara-frontend-attacker.vercel.app
      if (
        /^https:\/\/sadara-frontend(-[a-z0-9]{1,12}(-[a-z0-9-]{1,50})?)?\.vercel\.app$/.test(
          origin,
        )
      ) {
        return callback(null, true);
      }

      // Allow Cloud Run API's own origin (for Swagger UI)
      if (/^https:\/\/api-sadara-\d+\.europe-west1\.run\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (
        env.nodeEnv !== "production" &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Reject with false (returns 403) instead of Error (which causes 500)
      logger.warn(`CORS rejected: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(csrfProtection);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

// Rate limiting (auth-specific limits are applied per-route in auth.routes.ts)
app.use("/api/v1", apiLimiter);

// ── Local file serving (fallback when GCS is not configured) ──
// When GCS is active, files are served directly from storage.googleapis.com.
// These routes serve the local /uploads/ directory structure used by storage.ts.

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

// Public images: photos + avatars (no auth — profile pictures are not confidential)
for (const folder of ["photos", "avatars"] as const) {
  app.get(`/uploads/${folder}/:filename`, (req, res) => {
    const filename = path.basename(req.params.filename);
    const ext = path.extname(filename).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".jfif"].includes(ext)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    const filePath = path.join(UPLOADS_ROOT, folder, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  });
}

// Authenticated documents
app.get(
  "/uploads/documents/:filename",
  authenticate,
  authorizeModule("documents", "read"),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const filename = path.basename(authReq.params.filename);

    // Row-level check: filename must correspond to a DB record (prevents IDOR)
    type Row = { id: string };
    const [record] = await sequelize.query<Row>(
      "SELECT id FROM documents WHERE file_url LIKE :pattern LIMIT 1",
      { replacements: { pattern: `%${filename}` }, type: QueryTypes.SELECT },
    );
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    const filePath = path.join(UPLOADS_ROOT, "documents", filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    if (authReq.user) {
      logAudit(
        "DOWNLOAD",
        "documents",
        record.id,
        buildAuditContext(authReq.user, authReq.ip),
        `Downloaded: ${filename}`,
      );
    }
    res.sendFile(filePath);
  },
);

// Signed contracts
app.get(
  "/uploads/signed-contracts/:filename",
  authenticate,
  authorizeModule("contracts", "read"),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const filename = path.basename(authReq.params.filename);

    // Row-level check: filename must correspond to a DB record (prevents IDOR)
    type Row = { id: string };
    const [record] = await sequelize.query<Row>(
      `SELECT id FROM contracts
       WHERE signed_document_url LIKE :pattern
          OR document_url LIKE :pattern
       LIMIT 1`,
      { replacements: { pattern: `%${filename}` }, type: QueryTypes.SELECT },
    );
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    const filePath = path.join(UPLOADS_ROOT, "signed-contracts", filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    if (authReq.user) {
      logAudit(
        "DOWNLOAD",
        "contracts",
        record.id,
        buildAuditContext(authReq.user, authReq.ip),
        `Downloaded signed contract: ${filename}`,
      );
    }
    res.sendFile(filePath);
  },
);

// ── Health Check ──
// Cloud Run startup probe hits this — must return 200 even while initializing.
// The "ready" field tells callers whether the app is fully initialized.
app.get("/api/health", async (_req, res) => {
  // Lazy import to avoid circular dependency
  const { appReady, initError } = await import("./index");

  const checks: Record<string, "ok" | "error"> = {};

  // Always attempt checks so we can diagnose startup failures
  try {
    await sequelize.authenticate();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    if (isRedisConnected()) {
      await getRedisClient()!.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "error";
    }
  } catch {
    checks.redis = "error";
  }

  const allOk = appReady && Object.values(checks).every((v) => v === "ok");

  res.status(200).json({
    status: allOk ? "ok" : appReady ? "degraded" : "starting",
    ready: appReady,
    service: "sadara-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    checks,
    // Surface the init error so Postman/logs show exactly what failed
    ...(initError && { initError }),
  });
});

// Associations are set up lazily in initInfrastructure() (index.ts)
// AFTER model.sync() so that circular FKs (User ↔ Player) don't block
// table creation on a fresh database.

// ── API Routes ──
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/players", playerRoutes);
app.use("/api/v1/players", playerExportRoutes);
app.use("/api/v1/clubs", clubRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/gates", gateRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use("/api/v1/playercare", playerCareRoutes);
app.use("/api/v1/scouting", scoutingRoutes);
app.use("/api/v1/voice-memos", voiceMemoRoutes);
app.use("/api/v1/finance", financeRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/medical-reports", medicalReportRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/injuries", injuryRoutes);
app.use("/api/v1/training", trainingRoutes);
app.use("/api/v1/saff", saffRoutes);
app.use("/api/v1/saffplus", saffPlusRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/cron", cronRoutes);
app.use("/api/v1/portal", portalRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/spl", splRoutes);
app.use("/api/v1/spl/intelligence", splIntelligenceRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/approvals", approvalRoutes);
app.use("/api/v1/gdpr", gdprRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/sportmonks", sportmonksRoutes);
app.use("/api/v1/competitions", competitionRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/esignatures", esignatureRoutes);
app.use("/api/v1/wellness", wellnessRoutes);
app.use("/api/v1/wellness", fitnessRoutes);
app.use("/api/v1/body-compositions", bodyCompositionRoutes);
app.use("/api/v1/training-blocks", trainingBlockRoutes);
app.use("/api/v1/nutrition-prescriptions", nutritionPrescriptionRoutes);
app.use("/api/v1/development-programs", developmentProgramRoutes);
app.use("/api/v1/media", mediaRoutes);

// ── Public press release portal (no auth) ──
app.get("/api/v1/public/press-releases/:slug", async (req, res, next) => {
  try {
    const { getPressReleaseBySlug } =
      await import("@modules/media/press-releases/pressRelease.service");
    const release = await getPressReleaseBySlug(req.params.slug);
    if (release.status !== "published") {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: release });
  } catch (err) {
    next(err);
  }
});
app.use("/api/v1/journey", journeyRoutes);
app.use("/api/v1/evolution-cycles", evolutionCycleRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/messaging", messagingRoutes);
app.use("/api/v1/packages", packageRoutes);
app.use("/api/v1/tactical", tacticalRoutes);
app.use("/api/v1/mental", mentalRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/saudi-leagues", saudiLeaguesRoutes);
app.use("/api/v1/transfer-windows", transferWindowRoutes);
app.use("/api/v1/club-needs", clubNeedRoutes);
app.use("/api/v1/player-coach-assignments", playerCoachAssignmentRoutes);

// ── Signed documents — authenticated serving ──
app.get(
  "/uploads/signed-documents/:filename",
  authenticate,
  authorizeModule("documents", "read"),
  (req: AuthRequest, res, next) => {
    const { filename } = req.params;
    // Prevent path traversal: allow only safe filenames
    if (!/^[\w-]+\.(pdf|png|jpg|jpeg)$/i.test(filename)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename" });
    }
    const filePath = path.resolve("uploads/signed-documents", filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    res.sendFile(filePath);
  },
);

// ── Swagger UI ──
setupSwagger(app);

// ── Bull Board (admin queue dashboard) ──
app.use("/admin/queues", queueRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error Handler ──
app.use(errorHandler);

export default app;
