import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import bcrypt from "bcryptjs";
import { User } from "@modules/users/user.model";
import { Player } from "@modules/players/player.model";
import { Referral } from "@modules/referrals/referral.model";
import { Session } from "@modules/sessions/session.model";
import { Gate } from "@modules/gates/gate.model";
import { AppError } from "@middleware/errorHandler";
import { getAppSetting, setAppSetting } from "@shared/utils/appSettings";
import { resolveSmtpSecurity, resetTransporter } from "@shared/utils/mail";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { parseCsvBuffer } from "../../database/csv-import/parse-csv";
import {
  mapPlayerRow,
  resolveClubIds,
  resolveCreatedBy,
} from "../../database/csv-import/mappers/player.mapper";
import { mapSessionRow } from "../../database/csv-import/mappers/session.mapper";
import { mapTrainingSessionRow } from "../../database/csv-import/mappers/ticket.mapper";
import { mapGateRow } from "../../database/csv-import/mappers/journey.mapper";
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  TeamQuery,
  UpdateUserInput,
  NotificationPrefsInput,
  SmtpSettingsInput,
  MatchAnalysisSettingsInput,
} from "./settings.validation";

// ── Constants ──

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

// ══════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════

export async function getProfile(userId: string) {
  const user = await User.findByPk(userId, {
    attributes: [...SAFE_ATTRS],
  });

  if (!user) {
    return null; // caller handles fallback
  }

  const [tfRow] = (await sequelize.query(
    `SELECT two_factor_enabled FROM users WHERE id = $1`,
    { bind: [userId], type: QueryTypes.SELECT },
  )) as any[];

  return {
    ...user.toJSON(),
    twoFactorEnabled: tfRow?.two_factor_enabled ?? false,
  };
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);
  await user.update(data);
  return user;
}

export async function changePassword(
  userId: string,
  data: ChangePasswordInput,
) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 401);

  const hash = await bcrypt.hash(data.newPassword, 12);
  await user.update({ passwordHash: hash } as any);
}

// ══════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ══════════════════════════════════════════

export async function getNotificationPrefs(userId: string) {
  const user = await User.findByPk(userId, {
    attributes: ["id", "notificationPreferences"],
  });
  return user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS;
}

export async function updateNotificationPrefs(
  userId: string,
  data: NotificationPrefsInput,
) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);

  const currentPrefs =
    user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS;
  const updatedPrefs = { ...currentPrefs, ...data };

  await user.update({ notificationPreferences: updatedPrefs });
  return updatedPrefs;
}

// ══════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════

export async function listTeam(query: TeamQuery) {
  const { limit, offset, page } = parsePagination(query as any, "createdAt");
  const where: any = {};
  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${query.search}%` } },
      { fullNameAr: { [Op.iLike]: `%${query.search}%` } },
      { email: { [Op.iLike]: `%${query.search}%` } },
    ];
  }
  const { count, rows } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [["created_at", "DESC"]],
    attributes: [...SAFE_ATTRS],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function updateTeamMember(id: string, data: UpdateUserInput) {
  const user = await User.findByPk(id);
  if (!user) throw new AppError("User not found", 404);
  await user.update(data);
  return user;
}

// ══════════════════════════════════════════
// TASK AUTOMATION RULES
// ══════════════════════════════════════════

export async function getTaskRules() {
  const { getTaskRuleConfig } = await import("../matches/matchAutoTasks");
  return getTaskRuleConfig();
}

export async function updateTaskRules(data: any) {
  const { updateTaskRuleConfig, saveTaskRuleConfigToDB, getTaskRuleConfig } =
    await import("../matches/matchAutoTasks");
  updateTaskRuleConfig(data);
  await saveTaskRuleConfigToDB();
  return getTaskRuleConfig();
}

// ══════════════════════════════════════════
// INTEGRATIONS
// ══════════════════════════════════════════

export async function testIntegrationConnection(providerName: string) {
  const { getProvider, listProviders } =
    await import("../integrations/matchAnalysis.service");
  const provider = getProvider(providerName);

  if (!provider) {
    return {
      connected: false,
      provider: providerName,
      message: `Provider "${providerName}" is not configured. Available: ${listProviders().join(", ") || "none"}`,
    };
  }

  try {
    const connected = await provider.testConnection();
    return {
      connected,
      provider: providerName,
      message: connected
        ? `${providerName} connection successful`
        : `${providerName} connection failed — check your API key`,
    };
  } catch (err: any) {
    return {
      connected: false,
      provider: providerName,
      message: err.message || "Connection test failed",
    };
  }
}

// ══════════════════════════════════════════
// SMTP
// ══════════════════════════════════════════

export async function getSmtpSettings() {
  const settings = await getAppSetting("smtp_config");
  if (settings?.password) {
    settings.password = "••••••••";
  }
  return (
    settings || {
      host: "",
      port: 587,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
    }
  );
}

export async function updateSmtpSettings(data: SmtpSettingsInput) {
  const current = (await getAppSetting("smtp_config")) || {};
  const updated = { ...current, ...data };
  if (data.password === "••••••••") {
    updated.password = current.password;
  }
  await setAppSetting("smtp_config", updated);
  // Reset the cached nodemailer transporter so the next email uses the new config.
  resetTransporter();
  return {
    ...updated,
    password: updated.password ? "••••••••" : "",
  };
}

export async function testSmtpConnection() {
  const settings = await getAppSetting("smtp_config");
  if (!settings?.host) {
    return { success: false, message: "SMTP not configured" };
  }
  try {
    const nodemailer = require("nodemailer");
    const port = Number(settings.port) || 587;
    const { secure, requireTLS } = resolveSmtpSecurity(port);
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port,
      secure,
      requireTLS,
      auth: { user: settings.username, pass: settings.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
    await transporter.verify();
    return {
      success: true,
      message: `SMTP connection successful (${secure ? "SSL" : "STARTTLS"} on port ${port})`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed" };
  }
}

// ══════════════════════════════════════════
// MATCH ANALYSIS
// ══════════════════════════════════════════

export async function getMatchAnalysisSettings() {
  const settings = await getAppSetting("match_analysis_config");
  if (settings?.apiKey) {
    settings.apiKey = settings.apiKey.substring(0, 4) + "••••••••";
  }
  return (
    settings || {
      provider: "Wyscout",
      apiKey: "",
      baseUrl: "",
      enabled: false,
    }
  );
}

export async function updateMatchAnalysisSettings(
  data: MatchAnalysisSettingsInput,
) {
  const current = (await getAppSetting("match_analysis_config")) || {};
  const updated = { ...current, ...data };
  if (data.apiKey && data.apiKey.includes("••••••••")) {
    updated.apiKey = current.apiKey;
  }
  await setAppSetting("match_analysis_config", updated);
  const response = { ...updated };
  if (response.apiKey)
    response.apiKey = response.apiKey.substring(0, 4) + "••••••••";
  return response;
}

export async function testMatchAnalysisConnection() {
  const settings = await getAppSetting("match_analysis_config");
  if (!settings?.apiKey || !settings?.provider) {
    return { connected: false, message: "Provider not configured" };
  }
  const { getProvider } = await import("../integrations/matchAnalysis.service");
  const provider = getProvider(settings.provider);
  if (!provider) {
    return {
      connected: false,
      message: `Provider "${settings.provider}" not available`,
    };
  }
  try {
    const connected = await provider.testConnection();
    return {
      connected,
      message: connected ? "Connection successful" : "Connection failed",
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err.message || "Connection test failed",
    };
  }
}

// ══════════════════════════════════════════
// SIDEBAR CONFIG (v4 — portal × role × user)
// ══════════════════════════════════════════
//
// Resolution order at runtime: portal default → role override → user override.
// Each layer's `tree` (v2 schema) wholly replaces the prior layer's tree if
// present and non-empty; `customLabels` shallow-merge layer-by-layer so deeper
// layers can rename items without losing labels from upper layers.

type SidebarConfigPayload = Record<string, unknown>;

interface SidebarV4 {
  version: 4;
  default: Record<string, SidebarConfigPayload>;
  byRole: Record<string, Record<string, SidebarConfigPayload>>;
  byUser: Record<string, SidebarConfigPayload>;
}

const V4_KEY = "sidebar_config_v4";
const V3_KEY = "sidebar_config_v3";
const V2_KEY = "sidebar_config";

const EMPTY_CONFIG: SidebarConfigPayload = { hiddenItems: [] };

async function loadSidebarV4(): Promise<SidebarV4> {
  const stored = await getAppSetting(V4_KEY);
  if (stored?.version === 4) {
    return {
      version: 4,
      default: stored.default ?? {},
      byRole: stored.byRole ?? {},
      byUser: stored.byUser ?? {},
    };
  }
  // First read: migrate v3 → v4 (per-portal map becomes `default`).
  const v3 = await getAppSetting(V3_KEY);
  if (v3?.version === 3) {
    const migrated: SidebarV4 = {
      version: 4,
      default: v3.byPortal ?? {},
      byRole: {},
      byUser: {},
    };
    await setAppSetting(V4_KEY, migrated);
    return migrated;
  }
  // No v3 either: try v2 single-blob → seed as the dashboard default.
  const v2 = await getAppSetting(V2_KEY);
  const migrated: SidebarV4 = {
    version: 4,
    default: v2 ? { dashboard: v2 } : {},
    byRole: {},
    byUser: {},
  };
  await setAppSetting(V4_KEY, migrated);
  return migrated;
}

function hasTree(c: SidebarConfigPayload | undefined): boolean {
  return Boolean(
    c &&
    Array.isArray((c as { tree?: unknown[] }).tree) &&
    (c as { tree: unknown[] }).tree.length > 0,
  );
}

function mergeLayers(
  ...layers: (SidebarConfigPayload | undefined)[]
): SidebarConfigPayload {
  // Find the deepest layer that actually defines a tree — that becomes the
  // base structure. Each shallower layer merges its customLabels on top.
  let base: SidebarConfigPayload | undefined;
  for (let i = layers.length - 1; i >= 0; i--) {
    if (hasTree(layers[i])) {
      base = layers[i];
      break;
    }
  }
  const customLabels: Record<string, unknown> = {};
  const hiddenSet = new Set<string>();
  for (const layer of layers) {
    if (!layer) continue;
    const labels = (layer as { customLabels?: Record<string, unknown> })
      .customLabels;
    if (labels) Object.assign(customLabels, labels);
    const hidden = (layer as { hiddenItems?: string[] }).hiddenItems;
    if (Array.isArray(hidden)) hidden.forEach((h) => hiddenSet.add(h));
  }
  if (!base) {
    return { hiddenItems: Array.from(hiddenSet), customLabels };
  }
  return {
    ...base,
    customLabels: {
      ...((base as { customLabels?: object }).customLabels ?? {}),
      ...customLabels,
    },
    hiddenItems: Array.from(hiddenSet),
  };
}

/** Admin editor: read the raw layer for a (portal, role?) pair. */
export async function getSidebarConfig(portalId: string, role?: string) {
  const v4 = await loadSidebarV4();
  if (role) {
    return v4.byRole[portalId]?.[role] ?? EMPTY_CONFIG;
  }
  return v4.default[portalId] ?? EMPTY_CONFIG;
}

/** Runtime: returns the merged config a specific user should see. */
export async function getMergedSidebarForUser(
  portalId: string,
  role: string,
  userId: string,
) {
  const v4 = await loadSidebarV4();
  return mergeLayers(
    v4.default[portalId],
    v4.byRole[portalId]?.[role],
    v4.byUser[userId],
  );
}

/** Personal editor: read the user's own override (raw, not merged). */
export async function getUserSidebar(userId: string) {
  const v4 = await loadSidebarV4();
  return v4.byUser[userId] ?? EMPTY_CONFIG;
}

export async function saveUserSidebar(
  userId: string,
  config: SidebarConfigPayload,
) {
  const v4 = await loadSidebarV4();
  v4.byUser[userId] = config;
  await setAppSetting(V4_KEY, v4);
  return config;
}

export async function clearUserSidebar(userId: string) {
  const v4 = await loadSidebarV4();
  delete v4.byUser[userId];
  await setAppSetting(V4_KEY, v4);
  return EMPTY_CONFIG;
}

export async function updateSidebarConfig(
  portalId: string,
  config: SidebarConfigPayload,
  role?: string,
) {
  const v4 = await loadSidebarV4();
  if (role) {
    if (!v4.byRole[portalId]) v4.byRole[portalId] = {};
    v4.byRole[portalId][role] = config;
  } else {
    v4.default[portalId] = config;
  }
  await setAppSetting(V4_KEY, v4);
  return config;
}

export async function resetSidebarConfig(portalId?: string, role?: string) {
  if (!portalId || portalId === "all") {
    await setAppSetting(V4_KEY, {
      version: 4,
      default: {},
      byRole: {},
      byUser: {},
    });
    return EMPTY_CONFIG;
  }
  const v4 = await loadSidebarV4();
  if (role) {
    if (v4.byRole[portalId]) delete v4.byRole[portalId][role];
  } else {
    delete v4.default[portalId];
  }
  await setAppSetting(V4_KEY, v4);
  return EMPTY_CONFIG;
}

// ══════════════════════════════════════════
// CSV IMPORT
// ══════════════════════════════════════════

export interface ImportResult {
  entity: string;
  type: string;
  fileName: string;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

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

export async function importCsv(
  files: Express.Multer.File[],
  mode: string,
  adminId: string,
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  // Sort files: players first (others depend on them)
  const sorted = [...files].sort((a, b) => {
    const aRows = parseCsvBuffer(a.buffer);
    const bRows = parseCsvBuffer(b.buffer);
    const aType = detectCsvType(aRows.length > 0 ? Object.keys(aRows[0]) : []);
    const bType = detectCsvType(bRows.length > 0 ? Object.keys(bRows[0]) : []);
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

    if (type === "players") {
      results.push(await importPlayers(rows, file.originalname));
    }

    if (type === "sessions" || type === "training") {
      results.push(
        await importSessions(rows, file.originalname, type, adminId),
      );
    }

    if (type === "gates") {
      results.push(await importGates(rows, file.originalname));
    }
  }

  return results;
}

async function importPlayers(
  rows: any[],
  fileName: string,
): Promise<ImportResult> {
  const filtered = rows.filter((r) => (r["أسم_الاعب"] || "").trim() !== "");
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
  return {
    entity: "players",
    type: "players",
    fileName,
    total: filtered.length,
    imported,
    skipped: filtered.length - imported,
    errors: mapped.flatMap((m) => m.errors).slice(0, 5),
  };
}

async function importSessions(
  rows: any[],
  fileName: string,
  type: "sessions" | "training",
  adminId: string,
): Promise<ImportResult> {
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
  return {
    entity: isSession ? "sessions" : "training_sessions",
    type,
    fileName,
    total: filtered.length,
    imported,
    skipped: filtered.length - imported,
    errors: mapped.flatMap((m) => m.errors).slice(0, 5),
  };
}

async function importGates(
  rows: any[],
  fileName: string,
): Promise<ImportResult> {
  const playerMap = await buildPlayerMap();
  const filtered = rows.filter(
    (r) => (r["اسم_المرحلة_stage_name"] || "").trim() !== "",
  );
  const mapped = filtered.map((row, i) => mapGateRow(row, i + 2));
  for (const m of mapped) {
    const pid = resolvePlayer(m.playerName, playerMap);
    if (pid) m.data.playerId = pid;
  }
  const valid = mapped.filter((m) => m.errors.length === 0 && m.data.playerId);
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
  return {
    entity: "gates",
    type: "gates",
    fileName,
    total: filtered.length,
    imported,
    skipped: filtered.length - imported,
    errors: mapped.flatMap((m) => m.errors).slice(0, 5),
  };
}
