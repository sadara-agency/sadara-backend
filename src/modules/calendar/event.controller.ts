import { createCrudController } from "@shared/utils/crudController";
import * as eventService from "@modules/calendar/event.service";

const crud = createCrudController({
  service: {
    list: (query) => eventService.listEvents(query),
    getById: (id) => eventService.getEventById(id),
    create: (body, userId) => eventService.createEvent(body, userId),
    update: (id, body) => eventService.updateEvent(id, body),
    delete: (id) => eventService.deleteEvent(id),
  },
  entity: "calendar",
  cachePrefixes: [],
  label: (e) => e.title,
});

export const { list, getById, create, update, remove } = crud;
