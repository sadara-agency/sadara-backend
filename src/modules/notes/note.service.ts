import { Op, QueryTypes } from "sequelize";
import { Note, NoteOwnerType } from "@modules/notes/note.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { hasPermission } from "@modules/permissions/permission.service";

/**
 * Maps NoteOwnerType to the backend permission module name.
 * Notes on entities the user's role cannot read are excluded.
 */
const OWNER_TYPE_TO_MODULE: Record<string, string> = {
  Player: "players",
  Contract: "contracts",
  Match: "matches",
  Injury: "injuries",
  Club: "clubs",
  Offer: "offers",
};

export async function listNotes(queryParams: any, userRole?: string) {
  const { limit, offset, page } = parsePagination(queryParams, "createdAt");

  const where: any = {};
  if (queryParams.ownerType) where.ownerType = queryParams.ownerType;
  if (queryParams.ownerId) where.ownerId = queryParams.ownerId;

  // RBAC: Exclude notes attached to entities the role cannot read
  if (userRole && userRole !== "Admin") {
    const excludedOwnerTypes: string[] = [];
    for (const [ownerType, mod] of Object.entries(OWNER_TYPE_TO_MODULE)) {
      const canRead = await hasPermission(userRole, mod, "read");
      if (!canRead) excludedOwnerTypes.push(ownerType);
    }
    if (excludedOwnerTypes.length > 0) {
      where.ownerType = {
        ...(where.ownerType ? { [Op.eq]: where.ownerType } : {}),
        [Op.notIn]: excludedOwnerTypes,
      };
    }
  }

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
  try {
    const note = await Note.create({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      content: input.content,
      createdBy,
    });
    return note;
  } catch (err: any) {
    throw new AppError(
      err.message?.includes("does not exist")
        ? "Notes feature is temporarily unavailable"
        : "Failed to create note",
      500,
    );
  }
}

export async function updateNote(id: string, content: string, userId: string) {
  const note = await findOrThrow(Note, id, "Note");
  if (note.createdBy !== userId)
    throw new AppError("You can only edit your own notes", 403);
  await note.update({ content });
  return note;
}

export async function deleteNote(id: string, userId: string, userRole: string) {
  const note = await findOrThrow(Note, id, "Note");
  // Admin can delete any note; others only their own
  if (userRole !== "Admin" && note.createdBy !== userId) {
    throw new AppError("You can only delete your own notes", 403);
  }
  await note.destroy();
  return { id };
}
