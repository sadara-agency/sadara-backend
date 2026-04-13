import { Op } from "sequelize";
import { MediaRequest } from "./mediaRequest.model";
import { MediaContact } from "@modules/media/media-contacts/mediaContact.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { createNotification } from "@modules/notifications/notification.service";
import { createEvent } from "@modules/calendar/event.service";
import { logger } from "@config/logger";
import {
  CreateMediaRequestInput,
  UpdateMediaRequestInput,
  UpdateMediaRequestStatusInput,
} from "./mediaRequest.validation";

// ── Valid status transitions ──

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "declined"],
  approved: ["scheduled", "declined"],
  scheduled: ["completed", "declined"],
  completed: [],
  declined: ["pending"],
};

// ── List ──

export async function listMediaRequests(queryParams: Record<string, unknown>) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "created_at",
  );

  const where: Record<string, unknown> = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.requestType) where.requestType = queryParams.requestType;
  if (queryParams.priority) where.priority = queryParams.priority;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.assignedTo) where.assignedTo = queryParams.assignedTo;

  if (search) {
    where[Op.or as unknown as string] = [
      { journalistName: { [Op.iLike]: `%${search}%` } },
      { outlet: { [Op.iLike]: `%${search}%` } },
      { subject: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await MediaRequest.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      {
        model: Player,
        as: "player",
        attributes: ["id", "firstName", "lastName", "photoUrl"],
        required: false,
      },
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl"],
        required: false,
      },
      {
        model: User,
        as: "assignee",
        attributes: ["id", "fullName"],
        required: false,
      },
      {
        model: User,
        as: "creator",
        attributes: ["id", "fullName"],
        required: false,
      },
      {
        model: MediaContact,
        as: "mediaContact",
        attributes: [
          "id",
          "name",
          "nameAr",
          "outlet",
          "outletAr",
          "email",
          "phone",
        ],
        required: false,
      },
    ],
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getMediaRequestById(id: string) {
  const request = await MediaRequest.findByPk(id, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: ["id", "firstName", "lastName", "photoUrl"],
        required: false,
      },
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl"],
        required: false,
      },
      {
        model: User,
        as: "assignee",
        attributes: ["id", "fullName"],
        required: false,
      },
      {
        model: User,
        as: "creator",
        attributes: ["id", "fullName"],
        required: false,
      },
      {
        model: MediaContact,
        as: "mediaContact",
        attributes: [
          "id",
          "name",
          "nameAr",
          "outlet",
          "outletAr",
          "email",
          "phone",
        ],
        required: false,
      },
    ],
  });
  if (!request) throw new AppError("Media request not found", 404);
  return request;
}

// ── Create ──

export async function createMediaRequest(
  data: CreateMediaRequestInput,
  userId: string,
) {
  // Auto-fill journalist fields from media contact if provided
  let fillData = { ...data };
  if (data.mediaContactId) {
    const contact = await MediaContact.findByPk(data.mediaContactId);
    if (contact) {
      fillData = {
        ...fillData,
        journalistName: data.journalistName || contact.name,
        journalistNameAr: data.journalistNameAr || contact.nameAr || undefined,
        outlet: data.outlet || contact.outlet,
        outletAr: data.outletAr || contact.outletAr || undefined,
        journalistEmail: data.journalistEmail || contact.email || undefined,
        journalistPhone: data.journalistPhone || contact.phone || undefined,
      };
    }
  }

  return MediaRequest.create({
    ...fillData,
    deadline: fillData.deadline ? new Date(fillData.deadline) : undefined,
    scheduledAt: fillData.scheduledAt
      ? new Date(fillData.scheduledAt)
      : undefined,
    createdBy: userId,
  });
}

// ── Update ──

export async function updateMediaRequest(
  id: string,
  data: UpdateMediaRequestInput,
) {
  const request = await MediaRequest.findByPk(id);
  if (!request) throw new AppError("Media request not found", 404);
  return request.update({
    ...data,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
  });
}

// ── Update Status ──

export async function updateMediaRequestStatus(
  id: string,
  data: UpdateMediaRequestStatusInput,
) {
  const request = await MediaRequest.findByPk(id);
  if (!request) throw new AppError("Media request not found", 404);

  const allowed = STATUS_TRANSITIONS[request.status];
  if (!allowed || !allowed.includes(data.status)) {
    throw new AppError(
      `Cannot transition from '${request.status}' to '${data.status}'`,
      400,
    );
  }

  const updatePayload: Record<string, unknown> = { status: data.status };
  if (data.declineReason) updatePayload.declineReason = data.declineReason;
  if (data.scheduledAt) updatePayload.scheduledAt = data.scheduledAt;

  await request.update(updatePayload);

  // Fire-and-forget notifications
  const statusLabelAr: Record<string, string> = {
    approved: "تمت الموافقة",
    declined: "مرفوض",
    scheduled: "مجدول",
    completed: "مكتمل",
    pending: "قيد الانتظار",
  };

  const notifyUser = (userId: string) =>
    createNotification({
      userId,
      type: "system",
      title: `Media request ${data.status}: ${request.subject}`,
      titleAr: `طلب إعلامي ${statusLabelAr[data.status] || data.status}: ${request.subjectAr || request.subject}`,
      link: "/dashboard/media/requests",
      sourceType: "media_request",
      sourceId: request.id,
      priority: "normal",
    }).catch((err) => logger.warn("Media request notification failed", err));

  // Auto-create calendar event when scheduled
  if (data.status === "scheduled" && request.scheduledAt) {
    const scheduledDate = new Date(request.scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000); // +1 hour
    createEvent(
      {
        title: `Media: ${request.subject}`,
        titleAr: request.subjectAr || `إعلامي: ${request.subject}`,
        eventType: "Meeting",
        startDate: scheduledDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: false,
        timezone: "UTC",
        description: request.description || undefined,
        descriptionAr: request.descriptionAr || undefined,
      },
      request.createdBy,
    )
      .then((event) => {
        request.update({ calendarEventId: event.id }).catch(() => {});
      })
      .catch((err) => logger.warn("Media request calendar sync failed", err));
  }

  if (data.status === "approved" && request.assignedTo) {
    notifyUser(request.assignedTo);
  } else if (data.status === "declined") {
    notifyUser(request.createdBy);
  } else if (data.status === "scheduled") {
    notifyUser(request.createdBy);
    if (request.assignedTo && request.assignedTo !== request.createdBy) {
      notifyUser(request.assignedTo);
    }
  } else if (data.status === "completed") {
    notifyUser(request.createdBy);
  }

  return request;
}

// ── Delete ──

export async function deleteMediaRequest(id: string) {
  const request = await MediaRequest.findByPk(id);
  if (!request) throw new AppError("Media request not found", 404);
  await request.destroy();
  return { id };
}
