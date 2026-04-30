import type { Response } from "express";
import { createCrudController } from "@shared/utils/crudController";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import * as assignmentService from "./playerCoachAssignment.service";
import type {
  MyAssignmentQuery,
  UpdateAssignmentStatusInput,
} from "./playerCoachAssignment.validation";

const crud = createCrudController({
  service: {
    list: (query, user) => assignmentService.listAssignments(query, user),
    getById: (id, user) => assignmentService.getAssignmentById(id, user),
    create: (body, userId) => assignmentService.createAssignment(body, userId),
    update: async () => {
      throw new Error("Assignments are immutable — delete and recreate");
    },
    delete: (id) => assignmentService.deleteAssignment(id),
  },
  entity: "player-coach-assignments",
  cachePrefixes: [],
  label: (a) => `${a.specialty} assignment`,
});

export const { list, getById, create, remove } = crud;

// ── Custom handlers ──

export async function listMine(req: AuthRequest, res: Response) {
  const result = await assignmentService.listMyAssignments(
    req.user!.id,
    req.query as unknown as MyAssignmentQuery,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const updated = await assignmentService.updateAssignmentStatus(
    req.params.id,
    req.body as UpdateAssignmentStatusInput,
    req.user!,
  );
  sendSuccess(res, updated, "Assignment status updated");
}
