import { createCrudController } from "@shared/utils/crudController";
import * as clubNeedService from "./clubNeed.service";

const crud = createCrudController({
  service: {
    list: (query, user) => clubNeedService.listClubNeeds(query, user),
    getById: (id, user) => clubNeedService.getClubNeedById(id, user),
    create: (body, userId) => clubNeedService.createClubNeed(body, userId),
    update: (id, body) => clubNeedService.updateClubNeed(id, body),
    delete: (id) => clubNeedService.deleteClubNeed(id),
  },
  entity: "club-needs",
  cachePrefixes: [],
  label: (n) => n.position,
});

export const { list, getById, create, update, remove } = crud;
