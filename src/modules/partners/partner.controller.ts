import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import * as partnerService from "./partner.service";

const crud = createCrudController({
  service: {
    list: (query) => partnerService.listPartners(query),
    getById: (id) => partnerService.getPartnerById(id),
    create: (body, userId) => partnerService.createPartner(body, userId),
    update: (id, body) => partnerService.updatePartner(id, body),
    delete: (id) => partnerService.deletePartner(id),
  },
  entity: "partners",
  cachePrefixes: [CachePrefix.PARTNERS],
  label: (item) => item.nameEn ?? item.id,
});

export const { list, getById, create, update, remove } = crud;
