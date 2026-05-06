import AgendaTask from "./agenda-task.model";
import type { EventType } from "@modules/calendar/event.model";
import { logger } from "@config/logger";

const AGENDA_EVENT_TYPE: EventType = "AgendaTask";

/**
 * Creates or updates a CalendarEvent for a timed AgendaTask.
 * A task without dueTime stays virtual (no event row).
 */
export async function createOrUpdateEventForTask(task: AgendaTask) {
  if (!task.dueTime) return;

  // Guard against infinite hook loops
  if ((task as unknown as Record<string, unknown>)._skipSync) return;

  const { CalendarEvent } = await import("@modules/calendar/event.model");

  const [datePart] = task.dueDate.split("T");
  const startDate = new Date(`${datePart}T${task.dueTime}`);
  const endDate = task.durationMinutes
    ? new Date(startDate.getTime() + task.durationMinutes * 60000)
    : new Date(startDate.getTime() + 60 * 60000); // default 1h

  const eventData = {
    title: task.title,
    titleAr: task.titleAr,
    eventType: AGENDA_EVENT_TYPE,
    startDate,
    endDate,
    allDay: false,
    timezone: task.timezone,
    sourceType: "agenda_task",
    sourceId: task.id,
    isAutoCreated: true,
    reminderMinutes: 15,
    color: null as string | null,
    createdBy: task.userId,
  };

  if (task.calendarEventId) {
    const existing = await CalendarEvent.findByPk(task.calendarEventId);
    if (existing) {
      // Mark _skipSync so event.service won't reverse-sync back
      (existing as unknown as Record<string, unknown>)._skipSync = true;
      await existing.update(eventData);
      return;
    }
  }

  // Create new event
  const event = await CalendarEvent.create(eventData);

  // Store the eventId back on the task without re-triggering calendar sync
  (task as unknown as Record<string, unknown>)._skipSync = true;
  await task.update({ calendarEventId: event.id });
  logger.info("[AGENDA] Created calendar event for task", {
    taskId: task.id,
    eventId: event.id,
  });
}

/**
 * Deletes a CalendarEvent when an agenda task is removed or loses its dueTime.
 */
export async function deleteEventForTask(eventId: string) {
  const { CalendarEvent } = await import("@modules/calendar/event.model");
  const event = await CalendarEvent.findByPk(eventId);
  if (event) {
    await event.destroy();
    logger.info("[AGENDA] Deleted calendar event", { eventId });
  }
}
