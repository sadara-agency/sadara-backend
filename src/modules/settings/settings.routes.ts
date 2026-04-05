import { Router, Response } from "express";
import { asyncHandler, AppError } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { User } from "@modules/users/user.model";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { getAppSetting, setAppSetting } from "@shared/utils/appSettings";

const router = Router();
router.use(authenticate);

// ── Schemas ──

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const teamQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  role: z
    .enum([
      "Admin",
      "Manager",
      "Analyst",
      "Scout",
      "Player",
      "Legal",
      "Finance",
      "Coach",
      "Media",
      "Executive",
    ])
    .optional(),
  isActive: z.boolean().optional(),
});

const notificationPrefsSchema = z.object({
  contracts: z.boolean().optional(),
  offers: z.boolean().optional(),
  matches: z.boolean().optional(),
  tasks: z.boolean().optional(),
  injuries: z.boolean().optional(),
  payments: z.boolean().optional(),
  documents: z.boolean().optional(),
  referrals: z.boolean().optional(),
  system: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
});

const DEFAULT_NOTIFICATION_PREFS = {
  contracts: true,
  offers: true,
  matches: true,
  tasks: true,
  injuries: true,
  payments: true,
  documents: true,
  referrals: true,
  system: true,
  email: true,
  push: false,
  sms: false,
};

const SAFE_ATTRS = [
  "id",
  "email",
  "fullName",
  "fullNameAr",
  "role",
  "avatarUrl",
  "isActive",
  "lastLogin",
  "createdAt",
] as const;

// ══════════════════════════════════════════
// PROFILE (current user)
// ══════════════════════════════════════════

router.get(
  "/profile",
  authorizeModule("settings", "read"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    let user = await User.findByPk(req.user!.id, {
      attributes: [...SAFE_ATTRS],
    });

    // If user was deleted/DB reseeded, return JWT payload as fallback
    if (!user) {
      sendSuccess(res, {
        id: req.user!.id,
        email: req.user!.email,
        fullName: req.user!.fullName,
        fullNameAr: null,
        role: req.user!.role,
        avatarUrl: null,
        isActive: true,
        twoFactorEnabled: false,
      });
      return;
    }

    const [tfRow] = (await sequelize.query(
      `SELECT two_factor_enabled FROM users WHERE id = $1`,
      { bind: [req.user!.id], type: QueryTypes.SELECT },
    )) as any[];

    const result = {
      ...user.toJSON(),
      twoFactorEnabled: tfRow?.two_factor_enabled ?? false,
    };
    sendSuccess(res, result);
  }),
);

router.patch(
  "/profile",
  authorizeModule("settings", "update"),
  validate(updateProfileSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);
    await user.update(req.body);
    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      "Profile updated",
    );
    sendSuccess(res, user, "Profile updated");
  }),
);

router.post(
  "/change-password",
  authorizeModule("settings", "update"),
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);

    const valid = await bcrypt.compare(
      req.body.currentPassword,
      user.passwordHash,
    );
    if (!valid) throw new AppError("Current password is incorrect", 401);

    const hash = await bcrypt.hash(req.body.newPassword, 12);
    await user.update({ passwordHash: hash } as any);
    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      "Password changed",
    );
    sendSuccess(res, null, "Password changed successfully");
  }),
);

// ══════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ══════════════════════════════════════════

router.get(
  "/notifications",
  authorizeModule("settings", "read"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id, {
      attributes: ["id", "notificationPreferences"],
    });

    sendSuccess(
      res,
      user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS,
    );
  }),
);

router.patch(
  "/notifications",
  authorizeModule("settings", "update"),
  validate(notificationPrefsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);

    const currentPrefs =
      user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS;
    const updatedPrefs = { ...currentPrefs, ...req.body };

    await user.update({ notificationPreferences: updatedPrefs });

    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      "Notification preferences updated",
    );

    sendSuccess(res, updatedPrefs, "Notification preferences updated");
  }),
);

// ══════════════════════════════════════════
// TEAM (users list — Admin/Manager only)
// ══════════════════════════════════════════

router.get(
  "/team",
  authorizeModule("settings", "read"),
  validate(teamQuerySchema, "query"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit, offset, page } = parsePagination(
      req.query as any,
      "createdAt",
    );
    const where: any = {};
    if ((req.query as any).role) where.role = (req.query as any).role;
    if ((req.query as any).isActive !== undefined)
      where.isActive = (req.query as any).isActive;
    if ((req.query as any).search) {
      const s = (req.query as any).search;
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${s}%` } },
        { fullNameAr: { [Op.iLike]: `%${s}%` } },
        { email: { [Op.iLike]: `%${s}%` } },
      ];
    }
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      attributes: [...SAFE_ATTRS],
    });
    sendPaginated(res, rows, buildMeta(count, page, limit));
  }),
);

router.patch(
  "/team/:id",
  authorizeModule("settings", "update"),
  validate(updateUserSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    await user.update(req.body);
    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      `Team member updated: ${user.fullName}`,
    );
    sendSuccess(res, user, "User updated");
  }),
);

// ══════════════════════════════════════════
// TASK AUTOMATION RULES (Admin only)
// ══════════════════════════════════════════

router.get(
  "/task-rules",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const { getTaskRuleConfig } = await import("../matches/matchAutoTasks");
    sendSuccess(res, getTaskRuleConfig());
  }),
);

router.patch(
  "/task-rules",
  authorizeModule("settings", "update"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { updateTaskRuleConfig, saveTaskRuleConfigToDB, getTaskRuleConfig } =
      await import("../matches/matchAutoTasks");
    updateTaskRuleConfig(req.body);
    await saveTaskRuleConfigToDB();
    await logAudit(
      "UPDATE",
      "settings",
      "task-rules",
      buildAuditContext(req.user!, req.ip),
      "Task automation rules updated",
    );
    sendSuccess(res, getTaskRuleConfig(), "Task rules updated");
  }),
);

// ══════════════════════════════════════════
// INTEGRATIONS (test connection — Admin only)
// ══════════════════════════════════════════

const testConnectionSchema = z.object({
  provider: z.string().min(1),
});

router.post(
  "/integrations/test-connection",
  authorizeModule("settings", "create"),
  validate(testConnectionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { getProvider, listProviders } =
      await import("../integrations/matchAnalysis.service");
    const { provider: providerName } = req.body;
    const provider = getProvider(providerName);

    if (!provider) {
      sendSuccess(res, {
        connected: false,
        provider: providerName,
        message: `Provider "${providerName}" is not configured. Available: ${listProviders().join(", ") || "none"}`,
      });
      return;
    }

    try {
      const connected = await provider.testConnection();
      sendSuccess(res, {
        connected,
        provider: providerName,
        message: connected
          ? `${providerName} connection successful`
          : `${providerName} connection failed — check your API key`,
      });
    } catch (err: any) {
      sendSuccess(res, {
        connected: false,
        provider: providerName,
        message: err.message || "Connection test failed",
      });
    }
  }),
);

// ══════════════════════════════════════════
// SMTP SETTINGS (Admin only)
// ══════════════════════════════════════════

const smtpSettingsSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.coerce.number().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  secure: z.boolean().optional(),
});

router.get(
  "/smtp",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("smtp_config");
    // Mask password in response
    if (settings?.password) {
      settings.password = "••••••••";
    }
    sendSuccess(
      res,
      settings || {
        host: "",
        port: 587,
        username: "",
        password: "",
        fromEmail: "",
        fromName: "",
        secure: true,
      },
    );
  }),
);

router.patch(
  "/smtp",
  authorizeModule("settings", "update"),
  validate(smtpSettingsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const current = (await getAppSetting("smtp_config")) || {};
    const updated = { ...current, ...req.body };
    // If password is masked, keep the old one
    if (req.body.password === "••••••••") {
      updated.password = current.password;
    }
    await setAppSetting("smtp_config", updated);
    await logAudit(
      "UPDATE",
      "settings",
      "smtp",
      buildAuditContext(req.user!, req.ip),
      "SMTP settings updated",
    );
    // Return with masked password
    const response = {
      ...updated,
      password: updated.password ? "••••••••" : "",
    };
    sendSuccess(res, response, "SMTP settings updated");
  }),
);

router.post(
  "/smtp/test",
  authorizeModule("settings", "create"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("smtp_config");
    if (!settings?.host) {
      sendSuccess(res, { success: false, message: "SMTP not configured" });
      return;
    }
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port || 587,
        secure: settings.secure ?? true,
        auth: { user: settings.username, pass: settings.password },
      });
      await transporter.verify();
      sendSuccess(res, {
        success: true,
        message: "SMTP connection successful",
      });
    } catch (err: any) {
      sendSuccess(res, {
        success: false,
        message: err.message || "Connection failed",
      });
    }
  }),
);

// ══════════════════════════════════════════
// MATCH ANALYSIS PROVIDER SETTINGS (Admin only)
// ══════════════════════════════════════════

const matchAnalysisSettingsSchema = z.object({
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  enabled: z.boolean().optional(),
});

router.get(
  "/match-analysis",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("match_analysis_config");
    // Mask API key
    if (settings?.apiKey) {
      settings.apiKey = settings.apiKey.substring(0, 4) + "••••••••";
    }
    sendSuccess(
      res,
      settings || {
        provider: "Wyscout",
        apiKey: "",
        baseUrl: "",
        enabled: false,
      },
    );
  }),
);

router.patch(
  "/match-analysis",
  authorizeModule("settings", "update"),
  validate(matchAnalysisSettingsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const current = (await getAppSetting("match_analysis_config")) || {};
    const updated = { ...current, ...req.body };
    // If apiKey is masked, keep the old one
    if (req.body.apiKey && req.body.apiKey.includes("••••••••")) {
      updated.apiKey = current.apiKey;
    }
    await setAppSetting("match_analysis_config", updated);
    await logAudit(
      "UPDATE",
      "settings",
      "match-analysis",
      buildAuditContext(req.user!, req.ip),
      "Match analysis settings updated",
    );
    const response = { ...updated };
    if (response.apiKey)
      response.apiKey = response.apiKey.substring(0, 4) + "••••••••";
    sendSuccess(res, response, "Match analysis settings updated");
  }),
);

router.post(
  "/match-analysis/test",
  authorizeModule("settings", "create"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("match_analysis_config");
    if (!settings?.apiKey || !settings?.provider) {
      sendSuccess(res, {
        connected: false,
        message: "Provider not configured",
      });
      return;
    }
    const { getProvider } =
      await import("../integrations/matchAnalysis.service");
    const provider = getProvider(settings.provider);
    if (!provider) {
      sendSuccess(res, {
        connected: false,
        message: `Provider "${settings.provider}" not available`,
      });
      return;
    }
    try {
      const connected = await provider.testConnection();
      sendSuccess(res, {
        connected,
        message: connected ? "Connection successful" : "Connection failed",
      });
    } catch (err: any) {
      sendSuccess(res, {
        connected: false,
        message: err.message || "Connection test failed",
      });
    }
  }),
);

// ══════════════════════════════════════════════════════════
// Sidebar Configuration (Admin controls which nav items appear)
// ══════════════════════════════════════════════════════════

const sidebarConfigSchema = z.object({
  hiddenItems: z.array(z.string()),
});

router.get(
  "/sidebar",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const config = await getAppSetting("sidebar_config");
    sendSuccess(res, config ?? { hiddenItems: [] });
  }),
);

router.patch(
  "/sidebar",
  authorizeModule("settings", "update"),
  validate(sidebarConfigSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const config = req.body;
    await setAppSetting("sidebar_config", config);

    await logAudit(
      "UPDATE",
      "settings",
      "sidebar_config",
      buildAuditContext(req.user!, req.ip),
      "Updated sidebar navigation configuration",
    );

    sendSuccess(res, config, "Sidebar configuration updated");
  }),
);

// ── CSV Data Import (Admin-only, file upload) ──

import multer from "multer";
import { parseCsvBuffer } from "../../database/csv-import/parse-csv";
import {
  mapPlayerRow,
  resolveClubIds,
  resolveCreatedBy,
} from "../../database/csv-import/mappers/player.mapper";
import { mapSessionRow } from "../../database/csv-import/mappers/session.mapper";
import { mapTrainingSessionRow } from "../../database/csv-import/mappers/ticket.mapper";
import { mapGateRow } from "../../database/csv-import/mappers/journey.mapper";
import { Player } from "@modules/players/player.model";
import { Referral } from "@modules/referrals/referral.model";
import { Session } from "@modules/sessions/session.model";
import { Gate } from "@modules/gates/gate.model";

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

// Detect CSV type from headers
function detectCsvType(
  headers: string[],
): "players" | "sessions" | "training" | "gates" | "unknown" {
  const joined = headers.join(",").toLowerCase();
  if (joined.includes("أسم_الاعب") || joined.includes("أسم الاعب"))
    return "players";
  if (joined.includes("session_title") || joined.includes("عنوان_الجلسة"))
    return "sessions";
  if (joined.includes("ticket_title") || joined.includes("عنوان_التذكرة"))
    return "training";
  if (joined.includes("stage_name") || joined.includes("اسم_المرحلة"))
    return "gates";
  return "unknown";
}

// Build player name → ID map
async function buildPlayerMap(): Promise<Map<string, string>> {
  const players = await Player.findAll({
    attributes: ["id", "firstName", "lastName", "firstNameAr", "lastNameAr"],
  });
  const map = new Map<string, string>();
  for (const p of players) {
    const fullAr =
      `${p.firstNameAr ?? p.firstName} ${p.lastNameAr ?? p.lastName}`.trim();
    const fullEn = `${p.firstName} ${p.lastName}`.trim();
    if (fullAr) map.set(fullAr, p.id);
    if (fullEn && fullEn !== fullAr) map.set(fullEn, p.id);
    if (p.firstNameAr) map.set(p.firstNameAr, p.id);
  }
  return map;
}

function resolvePlayer(name: string, map: Map<string, string>): string | null {
  if (!name) return null;
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (map.has(cleaned)) return map.get(cleaned)!;
  for (const [key, id] of map) {
    if (key.includes(cleaned) || cleaned.includes(key)) return id;
  }
  return null;
}

interface ImportResult {
  entity: string;
  type: string;
  fileName: string;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

router.post(
  "/import-csv",
  authorizeModule("settings", "create"),
  (req: AuthRequest, res: Response, next: any) => {
    csvUpload(req as any, res, (err: any) => {
      if (err) return next(new AppError(err.message, 400));
      next();
    });
  },
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = (req as any).files as Express.Multer.File[];
    const mode = (req.query.mode as string) || "import";

    if (!files || files.length === 0) {
      throw new AppError("No CSV files uploaded", 400);
    }

    const results: ImportResult[] = [];
    const adminId = (req as any).user?.id;

    // Sort files: players first (others depend on them)
    const sorted = [...files].sort((a, b) => {
      const aRows = parseCsvBuffer(a.buffer);
      const bRows = parseCsvBuffer(b.buffer);
      const aType = detectCsvType(
        aRows.length > 0 ? Object.keys(aRows[0]) : [],
      );
      const bType = detectCsvType(
        bRows.length > 0 ? Object.keys(bRows[0]) : [],
      );
      const order = {
        players: 0,
        sessions: 1,
        training: 2,
        gates: 3,
        unknown: 4,
      };
      return (order[aType] ?? 4) - (order[bType] ?? 4);
    });

    for (const file of sorted) {
      const rows = parseCsvBuffer(file.buffer);
      if (rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      const type = detectCsvType(headers);

      if (type === "unknown") {
        results.push({
          entity: "unknown",
          type: "unknown",
          fileName: file.originalname,
          total: rows.length,
          imported: 0,
          skipped: rows.length,
          errors: ["Could not detect CSV type from headers"],
        });
        continue;
      }

      // Preview mode — just return counts
      if (mode === "preview") {
        results.push({
          entity: type,
          type,
          fileName: file.originalname,
          total: rows.length,
          imported: 0,
          skipped: 0,
          errors: [],
        });
        continue;
      }

      // Import mode
      if (type === "players") {
        const filtered = rows.filter(
          (r) => (r["أسم_الاعب"] || "").trim() !== "",
        );
        const mapped = filtered.map((row, i) => mapPlayerRow(row, i + 2));
        await resolveClubIds(mapped);
        await resolveCreatedBy(mapped);
        const valid = mapped.filter((m) => m.errors.length === 0);
        let imported = 0;
        const tx = await sequelize.transaction();
        try {
          for (const m of valid) {
            const [, created] = await Player.findOrCreate({
              where: {
                firstName: m.data.firstName as string,
                lastName: m.data.lastName as string,
              },
              defaults: m.data as any,
              transaction: tx,
            });
            if (created) imported++;
          }
          await tx.commit();
        } catch {
          await tx.rollback();
        }
        results.push({
          entity: "players",
          type,
          fileName: file.originalname,
          total: filtered.length,
          imported,
          skipped: filtered.length - imported,
          errors: mapped.flatMap((m) => m.errors).slice(0, 5),
        });
      }

      if (type === "sessions" || type === "training") {
        const playerMap = await buildPlayerMap();
        const isSession = type === "sessions";

        const filterKey = isSession
          ? "عنوان_الجلسة_session_title"
          : "عنوان_التذكرة_ticket_title";
        const filtered = rows.filter((r) => (r[filterKey] || "").trim() !== "");
        const mapped = isSession
          ? filtered.map((row, i) => mapSessionRow(row, i + 2))
          : filtered.map((row, i) => mapTrainingSessionRow(row, i + 2));

        for (const m of mapped) {
          const pid = resolvePlayer(m.playerName, playerMap);
          if (pid) {
            m.referralData.playerId = pid;
            m.sessionData.playerId = pid;
          }
          m.referralData.createdBy = adminId;
          m.sessionData.createdBy = adminId;
          if ((m.sessionData as any)._resultingTicketName) {
            delete (m.sessionData as any)._resultingTicketName;
          }
        }
        const valid = mapped.filter(
          (m) => m.errors.length === 0 && m.referralData.playerId,
        );
        let imported = 0;
        const tx = await sequelize.transaction();
        try {
          for (const m of valid) {
            const [referral] = await Referral.findOrCreate({
              where: {
                triggerDesc: m.referralData.triggerDesc as string,
                playerId: m.referralData.playerId as string,
                referralType: m.referralData.referralType as string,
              },
              defaults: m.referralData as any,
              transaction: tx,
            });
            m.sessionData.referralId = referral.id;
            const [, created] = await Session.findOrCreate({
              where: {
                title: m.sessionData.title as string,
                playerId: m.sessionData.playerId as string,
                referralId: referral.id,
              },
              defaults: m.sessionData as any,
              transaction: tx,
            });
            if (created) imported++;
          }
          await tx.commit();
        } catch {
          await tx.rollback();
        }
        results.push({
          entity: isSession ? "sessions" : "training_sessions",
          type,
          fileName: file.originalname,
          total: filtered.length,
          imported,
          skipped: filtered.length - imported,
          errors: mapped.flatMap((m) => m.errors).slice(0, 5),
        });
      }

      if (type === "gates") {
        const playerMap = await buildPlayerMap();
        const filtered = rows.filter(
          (r) => (r["اسم_المرحلة_stage_name"] || "").trim() !== "",
        );
        const mapped = filtered.map((row, i) => mapGateRow(row, i + 2));
        for (const m of mapped) {
          const pid = resolvePlayer(m.playerName, playerMap);
          if (pid) m.data.playerId = pid;
        }
        const valid = mapped.filter(
          (m) => m.errors.length === 0 && m.data.playerId,
        );
        const playerGateCount = new Map<string, number>();
        for (const m of valid) {
          const pid = m.data.playerId as string;
          const gateNum = playerGateCount.get(pid) ?? 0;
          m.data.gateNumber = String(gateNum);
          playerGateCount.set(pid, gateNum + 1);
        }
        let imported = 0;
        const tx = await sequelize.transaction();
        try {
          for (const m of valid) {
            const [, created] = await Gate.findOrCreate({
              where: {
                playerId: m.data.playerId as string,
                gateNumber: m.data.gateNumber as string,
              },
              defaults: m.data as any,
              transaction: tx,
            });
            if (created) imported++;
          }
          await tx.commit();
        } catch {
          await tx.rollback();
        }
        results.push({
          entity: "gates",
          type,
          fileName: file.originalname,
          total: filtered.length,
          imported,
          skipped: filtered.length - imported,
          errors: mapped.flatMap((m) => m.errors).slice(0, 5),
        });
      }
    }

    sendSuccess(
      res,
      results,
      mode === "preview" ? "CSV preview" : "CSV import completed",
    );
  }),
);

export default router;
