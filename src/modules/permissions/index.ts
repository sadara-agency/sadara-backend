// Models
export { RolePermission } from "./permission.model";
export type { RolePermissionAttributes } from "./permission.model";
export { RoleFieldPermission } from "./fieldPermission.model";
export type { RoleFieldPermissionAttributes } from "./fieldPermission.model";
export { ConfigurableField } from "./configurableField.model";
export type { ConfigurableFieldAttributes } from "./configurableField.model";

// Config (seed source + fallback for the configurable_fields table)
export { CONFIGURABLE_FIELDS } from "./fieldPermission.config";
export type { ConfigurableFieldDef } from "./fieldPermission.config";

// Service
export * as permissionService from "./permission.service";

// Routes
export { default as permissionRoutes } from "./permission.routes";
