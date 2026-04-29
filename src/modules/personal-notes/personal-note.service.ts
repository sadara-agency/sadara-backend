import { Op } from "sequelize";
import PersonalNote from "./personal-note.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreatePersonalNoteDTO,
  UpdatePersonalNoteDTO,
  PersonalNoteQuery,
} from "./personal-note.validation";

export async function listPersonalNotes(
  userId: string,
  query: PersonalNoteQuery,
) {
  const { page, limit, search, tag, isPinned } = query;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (search) {
    where[Op.or as unknown as string] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { body: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (tag) {
    where.tags = { [Op.contains]: [tag] };
  }

  if (isPinned !== undefined) {
    where.isPinned = isPinned === "true";
  }

  const { rows, count } = await PersonalNote.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ["isPinned", "DESC"],
      ["updatedAt", "DESC"],
    ],
  });

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getPersonalNoteById(id: string, userId: string) {
  const note = await PersonalNote.findOne({ where: { id, userId } });
  if (!note) throw new AppError("Note not found", 404);
  return note;
}

export async function createPersonalNote(
  data: CreatePersonalNoteDTO,
  userId: string,
) {
  return PersonalNote.create({ ...data, userId });
}

export async function updatePersonalNote(
  id: string,
  data: UpdatePersonalNoteDTO,
  userId: string,
) {
  const note = await getPersonalNoteById(id, userId);
  return note.update(data);
}

export async function deletePersonalNote(id: string, userId: string) {
  const note = await getPersonalNoteById(id, userId);
  await note.destroy();
  return { id };
}
