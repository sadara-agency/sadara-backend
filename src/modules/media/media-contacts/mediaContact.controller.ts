import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import * as mediaContactService from "./mediaContact.service";

const crud = createCrudController({
  service: {
    list: (query) => mediaContactService.listMediaContacts(query),
    getById: (id) => mediaContactService.getMediaContactById(id),
    create: (body, userId) =>
      mediaContactService.createMediaContact(body, userId),
    update: (id, body) => mediaContactService.updateMediaContact(id, body),
    delete: (id) => mediaContactService.deleteMediaContact(id),
  },
  entity: "media_contacts",
  cachePrefixes: [CachePrefix.MEDIA_CONTACTS],
  label: (c) => `${c.name} (${c.outlet})`,
});

export const { list, getById, create, update, remove } = crud;
