import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import { env } from "@config/env";
import { errorHandler } from "@middleware/errorHandler";
import { apiLimiter, authLimiter } from "@middleware/rateLimiter";
import { authenticate, authorizeModule } from "@middleware/auth";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import { setupAssociations } from "./models/associations";
import { sequelize } from "@config/database";
import { isRedisConnected, getRedisClient } from "@config/redis";

// Route imports
import authRoutes from "@modules/auth/auth.routes";
import playerRoutes from "@modules/players/player.routes";
import clubRoutes from "@modules/clubs/club.routes";
import contractRoutes from "@modules/contracts/contract.routes";
import taskRoutes from "@modules/tasks/task.routes";
import dashboardRoutes from "@modules/dashboard/dashboard.routes";
import userRoutes from "@modules/users/user.routes";
import offerRoutes from "@modules/offers/offer.routes";
import matchRoutes from "@modules/matches/match.routes";
import gateRoutes from "@modules/gates/gate.routes";
import referralRoutes from "@modules/referrals/referral.routes";
import scoutingRoutes from "@modules/scouting/scouting.routes";
import financeRoutes from "@modules/finance/finance.routes";
import documentRoutes from "@modules/documents/document.routes";
import settingsRoutes from "@modules/settings/settings.routes";
import injuryRoutes from "@modules/injuries/injury.routes";
import trainingRoutes from "@modules/training/training.routes";
import saffRoutes from "@modules/saff/saff.routes";
import notificationRoutes from "@modules/notifications/notification.routes";
import cronRoutes from "./cron/cron.routes";
import portalRoutes from "@modules/portal/portal.routes";
import auditRoutes from "@modules/audit/audit.routes";
import splRoutes from "@modules/spl/spl.routes";
import noteRoutes from "@modules/notes/note.routes";
import reportRoutes from "@modules/reports/report.routes";
import approvalRoutes from "@modules/approvals/approval.routes";
import gdprRoutes from "@modules/gdpr/gdpr.routes";
import permissionRoutes from "@modules/permissions/permission.routes";
import sportmonksRoutes from "@modules/sportmonks/sportmonks.routes";
import gymRoutes from "@modules/gym/gym.routes";
import competitionRoutes from "@modules/competitions/competition.routes";
import clearanceRoutes from "@modules/clearances/clearance.routes";
import calendarRoutes from "@modules/calendar/event.routes";
import esignatureRoutes from "@modules/esignatures/esignature.routes";
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

      // Allow localhost in development
      if (
        env.nodeEnv !== "production" &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }

      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

// Rate limiting
app.use("/api/v1", apiLimiter);
app.use("/api/v1/auth", authLimiter);

// ── Serve player photos (no auth — profile pictures are not confidential) ──
const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads", "documents");
app.get("/uploads/photos/:filename", (req, res) => {
  const filename = path.basename(req.params.filename); // strip traversal
  // Only allow image extensions
  const ext = path.extname(filename).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".jfif"].includes(ext)) {
    return res.status(403).json({ success: false, message: "Not allowed" });
  }
  const filePath = path.join(UPLOADS_ROOT, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Photo not found" });
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(filePath);
});

// ── Serve uploaded files (authenticated + role-checked, path-traversal safe) ──
app.get(
  "/uploads/documents/:filename",
  authenticate,
  authorizeModule("documents", "read"),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const filename = path.basename(authReq.params.filename); // strip any traversal
    const filePath = path.join(UPLOADS_ROOT, filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    // Audit log (fire-and-forget)
    if (authReq.user) {
      logAudit(
        "DOWNLOAD",
        "documents",
        null,
        buildAuditContext(authReq.user, authReq.ip),
        `Downloaded: ${filename}`,
      );
    }
    res.sendFile(filePath);
  },
);

// ── Serve signed contract PDFs (authenticated, contracts read permission) ──
const SIGNED_CONTRACTS_ROOT = path.resolve(
  process.cwd(),
  "uploads",
  "signed-contracts",
);
app.get(
  "/uploads/signed-contracts/:filename",
  authenticate,
  authorizeModule("contracts", "read"),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const filename = path.basename(authReq.params.filename);
    const filePath = path.join(SIGNED_CONTRACTS_ROOT, filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }
    if (authReq.user) {
      logAudit(
        "DOWNLOAD",
        "contracts",
        null,
        buildAuditContext(authReq.user, authReq.ip),
        `Downloaded signed contract: ${filename}`,
      );
    }
    res.sendFile(filePath);
  },
);

// ── Health Check ──
app.get("/api/health", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = {};

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

  const allOk = Object.values(checks).every((v) => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    service: "sadara-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    checks,
  });
});

setupAssociations();

// ── API Routes ──
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/players", playerRoutes);
app.use("/api/v1/clubs", clubRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/gates", gateRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use("/api/v1/scouting", scoutingRoutes);
app.use("/api/v1/finance", financeRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/injuries", injuryRoutes);
app.use("/api/v1/training", trainingRoutes);
app.use("/api/v1/saff", saffRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/cron", cronRoutes);
app.use("/api/v1/portal", portalRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/spl", splRoutes);
app.use("/api/v1/notes", noteRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/approvals", approvalRoutes);
app.use("/api/v1/gdpr", gdprRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/sportmonks", sportmonksRoutes);
app.use("/api/v1/gym", gymRoutes);
app.use("/api/v1/competitions", competitionRoutes);
app.use("/api/v1/clearances", clearanceRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/esignatures", esignatureRoutes);

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

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error Handler ──
app.use(errorHandler);

export default app;
