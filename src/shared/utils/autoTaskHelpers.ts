/**
 * Shared helpers for automated task creation across all modules.
 *
 * Provides:
 *  - dueDate()              — compute YYYY-MM-DD from a day offset
 *  - findUserByRole()       — first active user with a given role
 *  - findUsersByRole()      — all active users with a given role
 *  - createAutoTaskIfNotExists() — deduplicated task creation + notification
 */

import { Op, Sequelize } from "sequelize";
import { Task } from "@modules/tasks/task.model";
import { User } from "@modules/users/user.model";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";
import { getTaskRuleConfig } from "@modules/matches/matchAutoTasks";
import { logger } from "@config/logger";

// ── Due-date helper ──

export function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// ── Find user(s) by role ──

export async function findUserByRole(role: string): Promise<User | null> {
  return User.findOne({
    where: { role, isActive: true },
    attributes: ["id", "fullName", "fullNameAr"],
    order: [["createdAt", "ASC"]],
  });
}

export async function findUsersByRole(role: string): Promise<User[]> {
  return User.findAll({
    where: { role, isActive: true },
    attributes: ["id", "fullName", "fullNameAr"],
  });
}

// ── Config helper ──

export interface RuleConfig {
  enabled: boolean;
  dueDays: number;
  threshold?: number;
}

export function cfg(ruleId: string): RuleConfig {
  const config = getTaskRuleConfig();
  const rc = config[ruleId];
  if (!rc) {
    logger.warn(
      "Auto-task rule ID not found in config — defaulting to DISABLED",
      { ruleId },
    );
    return { enabled: false, dueDays: 3 };
  }
  return rc;
}

// ── Deduplicated auto-task creation ──

export interface AutoTaskInput {
  /** Unique rule identifier (e.g. "contract_legal_review") */
  ruleId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr?: string;
  type:
    | "Match"
    | "Contract"
    | "Health"
    | "Report"
    | "Offer"
    | "General"
    | "Media";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo?: string | null;
  assignedBy?: string | null;
  playerId?: string | null;
  matchId?: string | null;
  contractId?: string | null;
  referralId?: string | null;
  dueDays?: number;
  /** Explicit due date string (YYYY-MM-DD). Takes precedence over dueDays. */
  dueDateStr?: string;
  notes?: string;
  /** Media-specific: which kind of creative content */
  mediaTaskType?: string;
  /** Media-specific: target platforms (e.g. ["instagram", "twitter"]) */
  mediaPlatforms?: string[];
}

export interface AutoTaskNotify {
  /** Roles to notify (e.g. ["Legal", "Manager"]) */
  roles?: string[];
  /** Specific user IDs to notify */
  userIds?: string[];
  /** Link for notification (e.g. "/dashboard/contracts/123") */
  link?: string;
}

/**
 * Create an auto-task if one doesn't already exist for the same
 * ruleId + entity combination.  Returns the created task or null
 * if a duplicate was found or the rule is disabled.
 */
export async function createAutoTaskIfNotExists(
  input: AutoTaskInput,
  notify?: AutoTaskNotify,
): Promise<Task | null> {
  // Check rule config
  const rc = cfg(input.ruleId);
  if (!rc.enabled) return null;

  // Duplicate check — same rule + same entity (7-day updatedAt window).
  // Uses updatedAt (not createdAt) so actively-touched Open tasks don't
  // re-spawn a duplicate after 7 days while still genuinely in progress.
  const updateCutoff = new Date();
  updateCutoff.setDate(updateCutoff.getDate() - 7);

  const dupeWhere: any = {
    triggerRuleId: input.ruleId,
    isAutoCreated: true,
    [Op.and]: [
      Sequelize.literal(`"status"::text NOT IN ('Completed', 'Canceled')`),
    ],
    updatedAt: { [Op.gte]: updateCutoff },
  };

  if (input.contractId) dupeWhere.contractId = input.contractId;
  if (input.matchId) dupeWhere.matchId = input.matchId;
  if (input.playerId) dupeWhere.playerId = input.playerId;
  if (input.referralId) dupeWhere.referralId = input.referralId;
  // For match-level tasks (no player), explicitly check null
  if (input.matchId && !input.playerId) dupeWhere.playerId = null;

  let existing: Task | null = null;
  try {
    existing = await Task.findOne({ where: dupeWhere });
  } catch (err) {
    logger.warn("Auto-task dedup check failed — proceeding with create", {
      ruleId: input.ruleId,
      error: (err as Error).message,
    });
    existing = null;
  }
  if (existing) return null;

  // Determine due date
  const finalDueDate = input.dueDateStr ?? dueDate(input.dueDays ?? rc.dueDays);

  // Create the task
  const task = await Task.create({
    title: input.title,
    titleAr: input.titleAr,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: "Open",
    assignedTo: input.assignedTo ?? null,
    assignedBy: input.assignedBy ?? null,
    playerId: input.playerId ?? null,
    matchId: input.matchId ?? null,
    contractId: input.contractId ?? null,
    referralId: input.referralId ?? null,
    dueDate: finalDueDate,
    isAutoCreated: true,
    triggerRuleId: input.ruleId,
    notes: input.notes ?? input.descriptionAr ?? null,
    mediaTaskType: input.mediaTaskType ?? null,
    mediaPlatforms: input.mediaPlatforms ?? [],
  } as any);

  // Send notifications (fire-and-forget)
  if (notify) {
    const notifPayload = {
      type: "task" as const,
      title: input.title,
      titleAr: input.titleAr,
      body: input.description,
      bodyAr: input.descriptionAr ?? input.description,
      link: notify.link ?? "/dashboard/tasks",
      sourceType: "task" as const,
      priority:
        input.priority === "critical"
          ? ("critical" as const)
          : ("normal" as const),
    };

    if (notify.roles?.length) {
      notifyByRole(notify.roles, notifPayload).catch((err) =>
        logger.warn("Auto-task role notification failed", {
          ruleId: input.ruleId,
          error: (err as Error).message,
        }),
      );
    }

    if (notify.userIds?.length) {
      for (const uid of notify.userIds) {
        notifyUser(uid, notifPayload).catch((err) =>
          logger.warn("Auto-task user notification failed", {
            ruleId: input.ruleId,
            userId: uid,
            error: (err as Error).message,
          }),
        );
      }
    }

    // Also notify assignee if not already in the list
    if (input.assignedTo && !notify.userIds?.includes(input.assignedTo)) {
      notifyUser(input.assignedTo, notifPayload).catch((err) =>
        logger.warn("Auto-task assignee notification failed", {
          ruleId: input.ruleId,
          error: (err as Error).message,
        }),
      );
    }
  }

  return task;
}
