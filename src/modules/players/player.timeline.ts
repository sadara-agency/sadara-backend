import { Op } from "sequelize";
import { Injury } from "@modules/injuries/injury.model";
import { Journey } from "@modules/journey/journey.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Referral } from "@modules/referrals/referral.model";
import { sequelize } from "@config/database";

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

/**
 * Aggregates all events for a player into a single chronological feed.
 * Merges: sessions (referrals with Performance/Mental), tickets, injuries,
 * and journey stage transitions.
 */
export async function getPlayerTimeline(
  playerId: string,
  options?: { limit?: number; offset?: number; types?: string[] },
): Promise<{ data: TimelineEvent[]; total: number }> {
  const { limit = 50, offset = 0, types } = options ?? {};

  const events: TimelineEvent[] = [];

  // Determine which types to fetch
  const fetchAll = !types || types.length === 0;
  const shouldFetch = (t: string) => fetchAll || types!.includes(t);

  // ── Sessions (from referrals/playercare cases) ──
  if (shouldFetch("session")) {
    const sessions = await Referral.findAll({
      where: { playerId },
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    for (const s of sessions as any[]) {
      events.push({
        id: s.id,
        date: s.created_at || s.createdAt,
        type: "session",
        title:
          s.trigger_desc ||
          s.triggerDesc ||
          `${s.referral_type || s.referralType} session`,
        titleAr: null,
        status: s.status,
        priority: s.priority,
        summary: s.trigger_desc || s.triggerDesc || null,
        metadata: {
          caseType: s.referral_type || s.referralType,
          assignedTo: s.assigned_to || s.assignedTo,
          outcome: s.outcome,
        },
      });
    }
  }

  // ── Tickets ──
  if (shouldFetch("ticket")) {
    const tickets = await Ticket.findAll({
      where: { playerId },
      order: [["createdAt", "DESC"]],
    });

    for (const t of tickets) {
      events.push({
        id: t.id,
        date: (t.createdAt as any)?.toISOString?.() ?? String(t.createdAt),
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
  }

  // ── Injuries ──
  if (shouldFetch("injury")) {
    const injuries = await Injury.findAll({
      where: { playerId },
      order: [["injuryDate", "DESC"]],
    });

    for (const i of injuries) {
      events.push({
        id: i.id,
        date: i.injuryDate,
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
  }

  // ── Medical (injury status updates as separate events) ──
  if (shouldFetch("medical")) {
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
          date: u.updateDate,
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
  }

  // ── Milestones (journey stage completions) ──
  if (shouldFetch("milestone")) {
    const stages = await Journey.findAll({
      where: { playerId },
      order: [["stageOrder", "ASC"]],
    });

    for (const s of stages) {
      // Only add completed stages as milestones, or InProgress as current
      if (s.status === "Completed" && s.actualEndDate) {
        events.push({
          id: `milestone-${s.id}`,
          date: s.actualEndDate,
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
          date: s.startDate,
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
  }

  // ── Sort all events by date descending ──
  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const total = events.length;
  const paginated = events.slice(offset, offset + limit);

  return { data: paginated, total };
}
