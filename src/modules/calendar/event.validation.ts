import { z } from "zod";

const EVENT_TYPES = [
  "Training",
  "Medical",
  "ContractDeadline",
  "GateTimeline",
  "Meeting",
  "Custom",
] as const;

/** Extended types returned by the aggregated endpoint (includes virtual sources). */
const ALL_EVENT_TYPES = [
  ...EVENT_TYPES,
  "Session",
  "Match",
  "TaskDeadline",
  "ReferralDeadline",
] as const;

const SOURCE_TYPES = [
  "calendar",
  "session",
  "match",
  "task",
  "referral",
  "contract",
  "gate",
] as const;

const ATTENDEE_TYPES = ["player", "user"] as const;

const attendeeSchema = z.object({
  type: z.enum(ATTENDEE_TYPES),
  id: z.string().uuid(),
});

// ── Create Event ──
export const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    titleAr: z.string().optional(),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    eventType: z.enum(EVENT_TYPES).default("Custom"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    allDay: z.boolean().default(false),
    location: z.string().optional(),
    locationAr: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex code")
      .optional(),
    recurrenceRule: z.string().optional(),
    reminderMinutes: z.number().int().positive().optional(),
    timezone: z.string().default("Asia/Riyadh"),
    attendees: z.array(attendeeSchema).optional(),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

// ── Update Event ──
export const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  titleAr: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().nullable().optional(),
  locationAr: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  recurrenceRule: z.string().nullable().optional(),
  reminderMinutes: z.number().int().positive().nullable().optional(),
  timezone: z.string().optional(),
  attendees: z.array(attendeeSchema).optional(),
});

// ── Query / List Events ──
export const eventQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(100),
  sort: z
    .enum(["start_date", "end_date", "created_at", "event_type", "title"])
    .default("start_date"),
  order: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
  eventType: z.enum(ALL_EVENT_TYPES).optional(),
  sourceType: z.enum(SOURCE_TYPES).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  playerId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

// ── Inferred types ──
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQuery = z.infer<typeof eventQuerySchema>;
