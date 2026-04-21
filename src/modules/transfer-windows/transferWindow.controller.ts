import { createCrudController } from "@shared/utils/crudController";
import * as transferWindowService from "./transferWindow.service";

const crud = createCrudController({
  service: {
    list: (query, user) =>
      transferWindowService.listTransferWindows(query, user),
    getById: (id, user) =>
      transferWindowService.getTransferWindowById(id, user),
    create: (body, userId) =>
      transferWindowService.createTransferWindow(body, userId),
    update: (id, body) => transferWindowService.updateTransferWindow(id, body),
    delete: (id) => transferWindowService.deleteTransferWindow(id),
  },
  entity: "transfer-windows",
  cachePrefixes: [],
  label: (item) => item.season ?? item.id,
});

export const { list, getById, create, update, remove } = crud;
