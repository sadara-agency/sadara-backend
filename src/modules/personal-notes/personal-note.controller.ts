import { Response } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import * as svc from "./personal-note.service";
import type { PersonalNoteQuery } from "./personal-note.validation";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listPersonalNotes(
    req.user!.id,
    req.query as unknown as PersonalNoteQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const note = await svc.getPersonalNoteById(req.params.id, req.user!.id);
  sendSuccess(res, note);
}

export async function create(req: AuthRequest, res: Response) {
  const note = await svc.createPersonalNote(req.body, req.user!.id);
  sendCreated(res, note, "Note created");
}

export async function update(req: AuthRequest, res: Response) {
  const note = await svc.updatePersonalNote(
    req.params.id,
    req.body,
    req.user!.id,
  );
  sendSuccess(res, note, "Note updated");
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deletePersonalNote(req.params.id, req.user!.id);
  sendSuccess(res, result, "Note deleted");
}
