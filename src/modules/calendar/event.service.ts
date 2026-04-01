import { Op } from "sequelize";
import { CalendarEvent, EventAttendee } from "@modules/calendar/event.model";
import { User } from "@modules/users/user.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow, destroyById } from "@shared/utils/serviceHelpers";
import { sequelize } from "@config/database";
import type {
  CreateEventInput,
  UpdateEventInput,
} from "@modules/calendar/event.validation";

// ── Shared includes ──
const EVENT_INCLUDES = [
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName", "fullNameAr"],
  },
  {
    model: EventAttendee,
    as: "attendees",
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
        required: false,
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "fullName", "fullNameAr"],
        required: false,
      },
    ],
  },
];

// ── List Events ──
export async function listEvents(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "start_date",
  );

  const where: any = {};

  if (queryParams.eventType) where.eventType = queryParams.eventType;

  // Date range filter: events that overlap with the given range
  if (queryParams.startDate || queryParams.endDate) {
    if (queryParams.startDate && queryParams.endDate) {
      where.startDate = { [Op.lte]: new Date(queryParams.endDate) };
      where.endDate = { [Op.gte]: new Date(queryParams.startDate) };
    } else if (queryParams.startDate) {
      where.endDate = { [Op.gte]: new Date(queryParams.startDate) };
    } else if (queryParams.endDate) {
      where.startDate = { [Op.lte]: new Date(queryParams.endDate) };
    }
  }

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: pattern } },
      { titleAr: { [Op.iLike]: pattern } },
      { description: { [Op.iLike]: pattern } },
    ];
  }

  // Filter by attendee (player or user)
  const includesForQuery = [...EVENT_INCLUDES];
  if (queryParams.playerId || queryParams.userId) {
    const attendeeWhere: any = {};
    if (queryParams.playerId) {
      attendeeWhere.attendeeType = "player";
      attendeeWhere.attendeeId = queryParams.playerId;
    } else {
      attendeeWhere.attendeeType = "user";
      attendeeWhere.attendeeId = queryParams.userId;
    }

    // Replace the attendees include to add a where clause
    includesForQuery[1] = {
      ...includesForQuery[1],
      where: attendeeWhere,
      required: true,
    } as any;
  }

  const { count, rows } = await CalendarEvent.findAndCountAll({
    where,
    include: includesForQuery,
    limit,
    offset,
    order: [[sort, order]],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Event by ID ──
export async function getEventById(id: string) {
  const event = await CalendarEvent.findByPk(id, {
    include: EVENT_INCLUDES,
  });
  if (!event) throw new AppError("Event not found", 404);
  return event;
}

// ── Create Event ──
export async function createEvent(input: CreateEventInput, createdBy: string) {
  const transaction = await sequelize.transaction();

  try {
    const event = await CalendarEvent.create(
      {
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        eventType: input.eventType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        allDay: input.allDay,
        location: input.location,
        locationAr: input.locationAr,
        color: input.color,
        recurrenceRule: input.recurrenceRule,
        reminderMinutes: input.reminderMinutes,
        createdBy,
      },
      { transaction },
    );

    if (input.attendees?.length) {
      await EventAttendee.bulkCreate(
        input.attendees.map((a) => ({
          eventId: event.id,
          attendeeType: a.type,
          attendeeId: a.id,
        })),
        { transaction, ignoreDuplicates: true },
      );
    }

    await transaction.commit();
    return getEventById(event.id);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ── Update Event ──
export async function updateEvent(id: string, input: UpdateEventInput) {
  const event = await findOrThrow(CalendarEvent, id, "Event");

  const updateData: any = { ...input };
  delete updateData.attendees;

  if (updateData.startDate)
    updateData.startDate = new Date(updateData.startDate);
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

  const transaction = await sequelize.transaction();

  try {
    await event.update(updateData, { transaction });

    if (input.attendees !== undefined) {
      await EventAttendee.destroy({ where: { eventId: id }, transaction });
      if (input.attendees?.length) {
        await EventAttendee.bulkCreate(
          input.attendees.map((a) => ({
            eventId: id,
            attendeeType: a.type,
            attendeeId: a.id,
          })),
          { transaction, ignoreDuplicates: true },
        );
      }
    }

    await transaction.commit();
    return getEventById(id);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ── Delete Event ──
export async function deleteEvent(id: string) {
  return destroyById(CalendarEvent, id, "Event");
}
