import { QueryTypes } from "sequelize";
import { Note, NoteOwnerType } from "./note.model";
import { sequelize } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";

export async function listNotes(queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "createdAt");

  const where: any = {};
  if (queryParams.ownerType) where.ownerType = queryParams.ownerType;
  if (queryParams.ownerId) where.ownerId = queryParams.ownerId;

  const { count, rows } = await Note.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "desc"]],
  });

  // Enrich with author names
  const noteIds = rows.map((r) => r.id);
  if (noteIds.length === 0)
    return { data: [], meta: buildMeta(0, page, limit) };

  const enriched = await sequelize.query<any>(
    `SELECT n.*, u.full_name AS author_name, u.full_name_ar AS author_name_ar
     FROM notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.id IN (:ids)
     ORDER BY n.created_at DESC`,
    { replacements: { ids: noteIds }, type: QueryTypes.SELECT },
  );

  return { data: enriched, meta: buildMeta(count, page, limit) };
}

export async function createNote(
  input: { ownerType: NoteOwnerType; ownerId: string; content: string },
  createdBy: string,
) {
  const note = await Note.create({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    content: input.content,
    createdBy,
  });
  return note;
}

export async function updateNote(id: string, content: string, userId: string) {
  const note = await Note.findByPk(id);
  if (!note) throw new AppError("Note not found", 404);
  if (note.createdBy !== userId)
    throw new AppError("You can only edit your own notes", 403);
  await note.update({ content });
  return note;
}

export async function deleteNote(id: string, userId: string, userRole: string) {
  const note = await Note.findByPk(id);
  if (!note) throw new AppError("Note not found", 404);
  // Admin can delete any note; others only their own
  if (userRole !== "Admin" && note.createdBy !== userId) {
    throw new AppError("You can only delete your own notes", 403);
  }
  await note.destroy();
  return { id };
}
