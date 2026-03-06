import { Router, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { AuthRequest } from "../../shared/types";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import { RolePermission } from "./permission.model";
import {
  getPermissions,
  invalidatePermissionCache,
  loadPermissions,
  getFieldPermissions,
  loadFieldPermissions,
} from "./permission.service";
import { RoleFieldPermission } from "./fieldPermission.model";
import { CONFIGURABLE_FIELDS } from "./fieldPermission.config";
import { updatePermissionsSchema, updateFieldPermissionsSchema } from "./permission.schema";

const router = Router();
router.use(authenticate);

// ── GET /permissions — full matrix (any authenticated user) ──

router.get(
  "/",
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const perms = await getPermissions();
    sendSuccess(res, perms);
  }),
);

// ── PUT /permissions — bulk update (Admin only) ──

router.put(
  "/",
  authorize("Admin"),
  validate(updatePermissionsSchema.shape.body),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { permissions } = req.body;

    // Prevent modifying Admin permissions (Admin always has full access)
    const filtered = permissions.filter(
      (p: any) => p.role !== "Admin",
    );

    for (const perm of filtered) {
      await RolePermission.upsert({
        role: perm.role,
        module: perm.module,
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      });
    }

    await invalidatePermissionCache();
    const updated = await loadPermissions();

    await logAudit(
      "UPDATE",
      "role_permissions",
      "bulk",
      buildAuditContext(req.user!, req.ip),
      `Permissions updated for ${filtered.length} role-module combinations`,
    );

    sendSuccess(res, updated, "Permissions updated");
  }),
);

// ── GET /permissions/fields/config — configurable fields definition ──

router.get(
  "/fields/config",
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, CONFIGURABLE_FIELDS);
  }),
);

// ── GET /permissions/fields — field-level permissions map ──

router.get(
  "/fields",
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const perms = await getFieldPermissions();
    sendSuccess(res, perms);
  }),
);

// ── PUT /permissions/fields — bulk update field permissions (Admin only) ──

router.put(
  "/fields",
  authorize("Admin"),
  validate(updateFieldPermissionsSchema.shape.body),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fieldPermissions } = req.body;

    // Prevent modifying Admin field permissions
    const filtered = fieldPermissions.filter(
      (p: any) => p.role !== "Admin",
    );

    for (const perm of filtered) {
      await RoleFieldPermission.upsert({
        role: perm.role,
        module: perm.module,
        field: perm.field,
        hidden: perm.hidden,
      });
    }

    await invalidatePermissionCache();
    const updated = await loadFieldPermissions();

    await logAudit(
      "UPDATE",
      "role_field_permissions",
      "bulk",
      buildAuditContext(req.user!, req.ip),
      `Field permissions updated for ${filtered.length} role-module-field combinations`,
    );

    sendSuccess(res, updated, "Field permissions updated");
  }),
);

export default router;
