import { Op } from "sequelize";
import { MediaRequest } from "./mediaRequest.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  CreateMediaRequestInput,
  UpdateMediaRequestInput,
  UpdateMediaRequestStatusInput,
} from "./mediaRequest.schema";

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
  return MediaRequest.create({ ...data, createdBy: userId });
}

// ── Update ──

export async function updateMediaRequest(
  id: string,
  data: UpdateMediaRequestInput,
) {
  const request = await MediaRequest.findByPk(id);
  if (!request) throw new AppError("Media request not found", 404);
  return request.update(data);
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

  return request.update(updatePayload);
}

// ── Delete ──

export async function deleteMediaRequest(id: string) {
  const request = await MediaRequest.findByPk(id);
  if (!request) throw new AppError("Media request not found", 404);
  await request.destroy();
  return { id };
}
