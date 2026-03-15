import { QueryTypes, Op } from "sequelize";
import { sequelize } from "@config/database";
import {
  notifyUser,
} from "@modules/notifications/notification.service";
import { CalendarEvent, EventAttendee } from "@modules/calendar/event.model";
import { Notification } from "@modules/notifications/notification.model";

// ══════════════════════════════════════════════════════════════
// Calendar Reminder Notifications
// Checks events starting within their reminder window and sends
// notifications to the creator and all attendees.
// ══════════════════════════════════════════════════════════════

export async function checkCalendarReminders() {
  const now = new Date();
  let sent = 0;

  // Find events with reminders that are upcoming
  const events = await CalendarEvent.findAll({
    where: {
      reminderMinutes: { [Op.ne]: null },
      startDate: { [Op.gt]: now },
      isAutoCreated: false,
    },
    include: [
      {
        model: EventAttendee,
        as: "attendees",
        attributes: ["attendeeType", "attendeeId"],
      },
    ],
  });

  for (const event of events) {
    const reminderTime = new Date(
      new Date(event.startDate).getTime() -
        (event.reminderMinutes || 0) * 60 * 1000,
    );

    // Only fire if reminder time is within the last 10 minutes (cron window)
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    if (reminderTime < tenMinAgo || reminderTime > now) continue;

    // Check if we already sent a notification for this event
    const existing = await Notification.findOne({
      where: {
        sourceType: "calendar_reminder",
        sourceId: event.id,
      },
    });
    if (existing) continue;

    // Notify the event creator
    await notifyUser(event.createdBy, {
      type: "calendar",
      title: `Reminder: ${event.title}`,
      titleAr: event.titleAr
        ? `تذكير: ${event.titleAr}`
        : `تذكير: ${event.title}`,
      body: `Starting at ${new Date(event.startDate).toLocaleTimeString()}`,
      link: `/dashboard/calendar`,
      sourceType: "calendar_reminder",
      sourceId: event.id,
      priority: "normal",
    });
    sent++;

    // Notify attendees (users only — player accounts may not have notifications)
    const attendees = (event as any).attendees || [];
    for (const att of attendees) {
      if (att.attendeeType === "user" && att.attendeeId !== event.createdBy) {
        await notifyUser(att.attendeeId, {
          type: "calendar",
          title: `Reminder: ${event.title}`,
          titleAr: event.titleAr
            ? `تذكير: ${event.titleAr}`
            : `تذكير: ${event.title}`,
          link: `/dashboard/calendar`,
          sourceType: "calendar_reminder",
          sourceId: event.id,
          priority: "normal",
        });
        sent++;
      }
    }
  }

  return { reminders: sent };
}

// ══════════════════════════════════════════════════════════════
// Auto-create calendar events from contract deadlines & gates
// Runs daily, upserts events with source_type tracking
// ══════════════════════════════════════════════════════════════

interface ContractDeadlineRow {
  id: string;
  end_date: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  club_name: string | null;
  club_name_ar: string | null;
  created_by: string;
}

interface GateDeadlineRow {
  id: string;
  gate_number: number;
  label: string;
  label_ar: string | null;
  target_date: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
}

export async function syncAutoCalendarEvents() {
  let created = 0;

  // ── Contract deadlines (next 90 days) ──
  const ninetyDaysOut = new Date();
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
  const ninetyStr = ninetyDaysOut.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const contracts = await sequelize.query<ContractDeadlineRow>(
    `
    SELECT c.id, c.end_date, c.created_by,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
           cl.name as club_name, cl.name_ar as club_name_ar
    FROM contracts c
    JOIN players p ON p.id = c.player_id
    LEFT JOIN clubs cl ON cl.id = c.club_id
    WHERE c.status IN ('Active', 'Expiring Soon')
      AND c.end_date BETWEEN :today AND :ninetyDaysOut
    `,
    {
      replacements: { today, ninetyDaysOut: ninetyStr },
      type: QueryTypes.SELECT,
    },
  );

  for (const c of contracts) {
    const existing = await CalendarEvent.findOne({
      where: { sourceType: "contract", sourceId: c.id },
    });
    if (existing) continue;

    const playerName = `${c.first_name} ${c.last_name}`.trim();
    const playerNameAr =
      c.first_name_ar && c.last_name_ar
        ? `${c.first_name_ar} ${c.last_name_ar}`.trim()
        : playerName;

    await CalendarEvent.create({
      title: `Contract expiry: ${playerName}`,
      titleAr: `انتهاء عقد: ${playerNameAr}`,
      eventType: "ContractDeadline",
      startDate: new Date(`${c.end_date}T00:00:00`),
      endDate: new Date(`${c.end_date}T23:59:59`),
      allDay: true,
      sourceType: "contract",
      sourceId: c.id,
      isAutoCreated: true,
      reminderMinutes: 1440, // 1 day before
      createdBy: c.created_by,
    });
    created++;
  }

  // ── Gate deadlines ──
  const gates = await sequelize.query<GateDeadlineRow>(
    `
    SELECT g.id, g.gate_number, g.label, g.label_ar, g.target_date,
           p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
    FROM gates g
    JOIN players p ON p.id = g.player_id
    WHERE g.status IN ('Pending', 'InProgress')
      AND g.target_date IS NOT NULL
      AND g.target_date BETWEEN :today AND :ninetyDaysOut
    `,
    {
      replacements: { today, ninetyDaysOut: ninetyStr },
      type: QueryTypes.SELECT,
    },
  );

  for (const g of gates) {
    const existing = await CalendarEvent.findOne({
      where: { sourceType: "gate", sourceId: g.id },
    });
    if (existing) continue;

    const playerName = `${g.first_name} ${g.last_name}`.trim();
    const playerNameAr =
      g.first_name_ar && g.last_name_ar
        ? `${g.first_name_ar} ${g.last_name_ar}`.trim()
        : playerName;

    await CalendarEvent.create({
      title: `Gate ${g.gate_number}: ${g.label || playerName}`,
      titleAr: `بوابة ${g.gate_number}: ${g.label_ar || g.label || playerNameAr}`,
      eventType: "GateTimeline",
      startDate: new Date(`${g.target_date}T00:00:00`),
      endDate: new Date(`${g.target_date}T23:59:59`),
      allDay: true,
      sourceType: "gate",
      sourceId: g.id,
      isAutoCreated: true,
      createdBy: "00000000-0000-0000-0000-000000000000", // system
    });
    created++;
  }

  return { autoEventsCreated: created };
}
