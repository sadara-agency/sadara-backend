import { Op } from "sequelize";
import { MediaContact } from "./mediaContact.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  CreateMediaContactInput,
  UpdateMediaContactInput,
} from "./mediaContact.validation";

// ── List ──

export async function listMediaContacts(queryParams: Record<string, unknown>) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "created_at",
  );

  const where: Record<string, unknown> = {};

  if (queryParams.outlet) {
    where.outlet = { [Op.iLike]: `%${queryParams.outlet}%` };
  }

  if (search) {
    where[Op.or as unknown as string] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { outlet: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await MediaContact.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      {
        model: User,
        as: "creator",
        attributes: ["id", "fullName"],
        required: false,
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getMediaContactById(id: string) {
  const contact = await MediaContact.findByPk(id, {
    include: [
      {
        model: User,
        as: "creator",
        attributes: ["id", "fullName"],
        required: false,
      },
    ],
  });
  if (!contact) throw new AppError("Media contact not found", 404);
  return contact;
}

// ── Create ──

export async function createMediaContact(
  data: CreateMediaContactInput,
  userId: string,
) {
  return MediaContact.create({ ...data, createdBy: userId });
}

// ── Update ──

export async function updateMediaContact(
  id: string,
  data: UpdateMediaContactInput,
) {
  const contact = await MediaContact.findByPk(id);
  if (!contact) throw new AppError("Media contact not found", 404);
  return contact.update(data);
}

// ── Delete ──

export async function deleteMediaContact(id: string) {
  const contact = await MediaContact.findByPk(id);
  if (!contact) throw new AppError("Media contact not found", 404);
  await contact.destroy();
  return { id };
}
