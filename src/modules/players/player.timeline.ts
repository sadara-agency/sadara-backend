import { Op } from "sequelize";
import { Injury } from "@modules/injuries/injury.model";
import { Journey } from "@modules/journey/journey.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Referral } from "@modules/referrals/referral.model";
import { logger } from "@config/logger";
import "@config/database";

// ── Timeline Event Types ──
export interface TimelineEvent {
  id: string;
  date: string;
  type: "session" | "ticket" | "medical" | "milestone" | "injury";
  title: string;
  titleAr: string | null;
  status: string;
  priority?: string | null;
  summary?: string | null;
  metadata: Record<string, unknown>;
}

// DATEONLY → "YYYY-MM-DD" string; DATE/TIMESTAMPTZ → Date object.
// Returns null for anything we can't turn into a usable date string.
function toIso(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) {
    const t = d.getTime();
    return Number.isFinite(t) ? d.toISOString() : null;
  }
  if (typeof d === "string") return d;
  return null;
}

function logSourceFailure(source: string, playerId: string, err: unknown) {
  const e = err as Error;
  logger.error("[timeline] source failed", {
    source,
    playerId,
    message: e?.message,
    stack: e?.stack,
  });
}

/**
 * Aggregates all events for a player into a single chronological feed.
 * Merges: sessions (referrals with Performance/Mental), tickets, injuries,
 * and journey stage transitions.
 *
 * Each source is isolated in its own try/catch — a failure in one source
 * (bad column, schema drift, null deref) must never take down the whole
 * feed. Failed sources are logged and reported via `warnings`.
 */
export async function getPlayerTimeline(
  playerId: string,
  options?: { limit?: number; offset?: number; types?: string[] },
): Promise<{ data: TimelineEvent[]; total: number; warnings: string[] }> {
  const { limit = 50, offset = 0, types } = options ?? {};

  const events: TimelineEvent[] = [];
  const warnings: string[] = [];

  // Determine which types to fetch
  const fetchAll = !types || types.length === 0;
  const shouldFetch = (t: string) => fetchAll || types!.includes(t);

  // ── Sessions (from referrals/playercare cases) ──
  if (shouldFetch("session")) {
    try {
      const sessions = await Referral.findAll({
        where: { playerId },
        order: [["createdAt", "DESC"]],
      });

      for (const s of sessions) {
        events.push({
          id: s.id,
          date: toIso(s.createdAt) ?? "",
          type: "session",
          title: s.triggerDesc || `${s.referralType} session`,
          titleAr: null,
          status: s.status,
          priority: s.priority,
          summary: s.triggerDesc || null,
          metadata: {
            caseType: s.referralType,
            assignedTo: s.assignedTo,
            outcome: s.outcome,
          },
        });
      }
    } catch (err) {
      logSourceFailure("sessions", playerId, err);
      warnings.push("sessions");
    }
  }

  // ── Tickets ──
  if (shouldFetch("ticket")) {
    try {
      const tickets = await Ticket.findAll({
        where: { playerId },
        order: [["createdAt", "DESC"]],
      });

      for (const t of tickets) {
        events.push({
          id: t.id,
          date: toIso(t.createdAt) ?? "",
          type: "ticket",
          title: t.title,
          titleAr: t.titleAr,
          status: t.status,
          priority: t.priority,
          summary: t.description,
          metadata: {
            ticketType: t.ticketType,
            assignedTo: t.assignedTo,
            receivingParty: t.receivingParty,
            receivingPartyAr: t.receivingPartyAr,
            dueDate: t.dueDate,
            closureDate: t.closureDate,
            journeyStageId: t.journeyStageId,
          },
        });
      }
    } catch (err) {
      logSourceFailure("tickets", playerId, err);
      warnings.push("tickets");
    }
  }

  // ── Injuries ──
  if (shouldFetch("injury")) {
    try {
      const injuries = await Injury.findAll({
        where: { playerId },
        order: [["injuryDate", "DESC"]],
      });

      for (const i of injuries) {
        events.push({
          id: i.id,
          date: toIso(i.injuryDate) ?? "",
          type: "injury",
          title: i.injuryType,
          titleAr: i.injuryTypeAr,
          status: i.status,
          priority: i.severity,
          summary: i.diagnosis,
          metadata: {
            bodyPart: i.bodyPart,
            bodyPartAr: i.bodyPartAr,
            severity: i.severity,
            cause: i.cause,
            expectedReturnDate: i.expectedReturnDate,
            actualReturnDate: i.actualReturnDate,
            isSurgeryRequired: i.isSurgeryRequired,
            isRecurring: i.isRecurring,
          },
        });
      }
    } catch (err) {
      logSourceFailure("injuries", playerId, err);
      warnings.push("injuries");
    }
  }

  // ── Medical (injury status updates as separate events) ──
  if (shouldFetch("medical")) {
    try {
      const { InjuryUpdate } = await import("@modules/injuries/injury.model");
      const injuryIds = (
        await Injury.findAll({
          where: { playerId },
          attributes: ["id"],
          raw: true,
        })
      ).map((i: any) => i.id);

      if (injuryIds.length) {
        const updates = await InjuryUpdate.findAll({
          where: { injuryId: { [Op.in]: injuryIds } },
          order: [["updateDate", "DESC"]],
        });

        for (const u of updates) {
          events.push({
            id: u.id,
            date: toIso(u.updateDate) ?? "",
            type: "medical",
            title: `Injury update: ${u.status ?? "Status update"}`,
            titleAr: u.notesAr,
            status: u.status ?? "Update",
            priority: null,
            summary: u.notes,
            metadata: {
              injuryId: u.injuryId,
              updatedBy: u.updatedBy,
            },
          });
        }
      }
    } catch (err) {
      logSourceFailure("medical", playerId, err);
      warnings.push("medical");
    }
  }

  // ── Milestones (journey stage completions) ──
  if (shouldFetch("milestone")) {
    try {
      const stages = await Journey.findAll({
        where: { playerId },
        order: [["stageOrder", "ASC"]],
      });

      for (const s of stages) {
        // Only add completed stages as milestones, or InProgress as current
        if (s.status === "Completed" && s.actualEndDate) {
          events.push({
            id: `milestone-${s.id}`,
            date: toIso(s.actualEndDate) ?? "",
            type: "milestone",
            title: `Completed: ${s.stageName}`,
            titleAr: s.stageNameAr ? `مكتمل: ${s.stageNameAr}` : null,
            status: "Completed",
            priority: null,
            summary: s.notes,
            metadata: {
              stageId: s.id,
              stageOrder: s.stageOrder,
              startDate: s.startDate,
              responsibleParty: s.responsibleParty,
            },
          });
        } else if (s.status === "InProgress" && s.startDate) {
          events.push({
            id: `milestone-start-${s.id}`,
            date: toIso(s.startDate) ?? "",
            type: "milestone",
            title: `Started: ${s.stageName}`,
            titleAr: s.stageNameAr ? `بدأ: ${s.stageNameAr}` : null,
            status: "InProgress",
            priority: null,
            summary: s.notes,
            metadata: {
              stageId: s.id,
              stageOrder: s.stageOrder,
              expectedEndDate: s.expectedEndDate,
              responsibleParty: s.responsibleParty,
            },
          });
        }
      }
    } catch (err) {
      logSourceFailure("milestones", playerId, err);
      warnings.push("milestones");
    }
  }

  // Drop events with no usable date so downstream sort + frontend grouping
  // can't crash on bad data.
  const usableEvents = events.filter(
    (e) => typeof e.date === "string" && e.date.length > 0,
  );

  // ── Sort all events by date descending ──
  usableEvents.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const total = usableEvents.length;
  const paginated = usableEvents.slice(offset, offset + limit);

  return { data: paginated, total, warnings };
}
