// Model
export { CalendarEvent, EventAttendee } from "./event.model";
export { EVENT_TYPES, ATTENDEE_TYPES, ATTENDEE_STATUSES } from "./event.model";
export type { EventType, AttendeeType, AttendeeStatus } from "./event.model";

// Service
export * as eventService from "./event.service";

// Routes
export { default as calendarRoutes } from "./event.routes";
