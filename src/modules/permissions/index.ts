// Models
export { RolePermission } from "./permission.model";
export type { RolePermissionAttributes } from "./permission.model";
export { RoleFieldPermission } from "./fieldPermission.model";
export type { RoleFieldPermissionAttributes } from "./fieldPermission.model";

// Config
export { CONFIGURABLE_FIELDS } from "./fieldPermission.config";
export type { ConfigurableField } from "./fieldPermission.config";

// Service
export * as permissionService from "./permission.service";

// Routes
export { default as permissionRoutes } from "./permission.routes";
