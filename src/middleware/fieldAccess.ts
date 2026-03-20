import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "@shared/types";
import { getHiddenFields } from "@modules/permissions/permission.service";
import { logger } from "@config/logger";

/**
 * Field-level access control middleware.
 *
 * Strips specified fields from the response JSON based on the
 * authenticated user's role. Applies to `res.json()` calls only.
 *
 * Usage:
 *   router.get('/players', fieldAccess(PLAYER_HIDDEN_FIELDS), asyncHandler(ctrl.list));
 *
 * Config format:
 *   { fieldName: [roles that CANNOT see it] }
 */

type HiddenFieldsConfig = Record<string, UserRole[]>;

export function fieldAccess(config: HiddenFieldsConfig) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role) {
      next();
      return;
    }

    // Collect fields to strip for this role
    const fieldsToStrip = Object.entries(config)
      .filter(([, deniedRoles]) => deniedRoles.includes(role))
      .map(([field]) => field);

    if (fieldsToStrip.length === 0) {
      next();
      return;
    }

    // Intercept res.json to strip fields before sending
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (body && typeof body === "object") {
        stripFields(body, fieldsToStrip);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Recursively strip fields from the response payload.
 * Handles { data: {...} }, { data: [...] }, and nested structures.
 */
function stripFields(obj: any, fields: string[]): void {
  if (!obj || typeof obj !== "object") return;

  // If it has a `data` wrapper (our standard API response), process inside
  if (obj.data) {
    if (Array.isArray(obj.data)) {
      for (const item of obj.data) {
        removeKeys(item, fields);
      }
    } else if (typeof obj.data === "object") {
      removeKeys(obj.data, fields);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      removeKeys(item, fields);
    }
  } else {
    removeKeys(obj, fields);
  }
}

function removeKeys(obj: any, fields: string[]): void {
  if (!obj || typeof obj !== "object") return;
  for (const field of fields) {
    if (field in obj) {
      obj[field] = "[REDACTED]";
    }
  }
}

/**
 * Dynamic field access middleware — reads hidden fields from DB/cache.
 * Replaces the static fieldAccess() for DB-driven field-level permissions.
 */
export function dynamicFieldAccess(module: string) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const role = req.user?.role;
    if (!role || role === "Admin") {
      next();
      return;
    }

    try {
      const fieldsToStrip = await getHiddenFields(role, module);
      if (fieldsToStrip.length > 0) {
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
          if (body && typeof body === "object") {
            stripFields(body, fieldsToStrip);
          }
          return originalJson(body);
        };
      }
      next();
    } catch (err) {
      logger.warn("Field permission lookup failed — allowing request through", {
        module,
        role,
        error: (err as Error).message,
      });
      next();
    }
  };
}

// Deprecated hardcoded field configs removed.
// Field-level permissions are now fully DB-driven via role_field_permissions table
// and administered through the FieldPermissionsTab in Settings UI.
