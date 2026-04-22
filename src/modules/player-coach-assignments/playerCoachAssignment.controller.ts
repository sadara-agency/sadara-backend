import { createCrudController } from "@shared/utils/crudController";
import * as assignmentService from "./playerCoachAssignment.service";

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
