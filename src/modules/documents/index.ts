// Model
export { Document } from "./document.model";
export type {
  DocumentType,
  DocumentStatus,
  DocumentEntityType,
  DocumentAttributes,
} from "./document.model";

// Service
export * as documentService from "./document.service";

// Routes
export { default as documentRoutes } from "./document.routes";
