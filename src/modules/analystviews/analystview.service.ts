// ─────────────────────────────────────────────────────────────
// src/modules/analystviews/analystview.service.ts
//
// Service layer for the analyst saved-views module.
//
// Visibility rules:
//   - Owner always sees their own views.
//   - is_shared = true + share_scope = 'tenant'  → all authenticated users
//   - is_shared = true + share_scope = 'roles'   → users whose role is in
//                                                  shared_role_ids
//   - is_shared = false                          → owner only
//
// Mutations are owner-only (Admin override is intentionally NOT granted at
// the service layer; admin support can be layered on later via a role check).
// ─────────────────────────────────────────────────────────────
import { Op } from "sequelize";
import {
  AnalystView,
  AnalystPersona,
} from "@modules/analystviews/analystview.model";
import {
  CreateAnalystViewDTO,
  UpdateAnalystViewDTO,
  AnalystViewQuery,
} from "@modules/analystviews/analystview.validation";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";

function requireUser(user?: AuthUser): AuthUser {
  if (!user) throw new AppError("Authentication required", 401);
  return user;
}

export async function listAnalystViews(
  query: AnalystViewQuery,
  user?: AuthUser,
) {
  const u = requireUser(user);
  const { page, limit, sort, order, persona, pinnedOnly } = query;

  const sortField = sort.replace(/_([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );

  const visibility = {
    [Op.or]: [
      { ownerUserId: u.id },
      { isShared: true, shareScope: "tenant" },
      {
        isShared: true,
        shareScope: "roles",
        sharedRoleIds: { [Op.contains]: [u.role] },
      },
    ],
  };

  const personaFilter = persona ? { persona } : {};
  const pinnedFilter = pinnedOnly ? { isPinned: true } : {};

  const where = { ...personaFilter, ...pinnedFilter, ...visibility };

  const { rows, count } = await AnalystView.findAndCountAll({
    where,
    order: [[sortField, order]],
    limit,
    offset: (page - 1) * limit,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getAnalystViewById(id: string, user?: AuthUser) {
  const u = requireUser(user);
  const view = await AnalystView.findByPk(id);
  if (!view) throw new AppError("Analyst view not found", 404);

  const visible =
    view.ownerUserId === u.id ||
    (view.isShared && view.shareScope === "tenant") ||
    (view.isShared &&
      view.shareScope === "roles" &&
      Array.isArray(view.sharedRoleIds) &&
      view.sharedRoleIds.includes(u.role));

  if (!visible) throw new AppError("Analyst view not found", 404);
  return view;
}

export async function createAnalystView(
  data: CreateAnalystViewDTO,
  ownerUserId: string,
) {
  return AnalystView.create({
    ownerUserId,
    persona: data.persona as AnalystPersona,
    name: data.name,
    description: data.description ?? null,
    routePath: data.routePath,
    paramsJson: data.paramsJson ?? {},
    isPinned: data.isPinned ?? false,
    isShared: data.isShared ?? false,
    shareScope: data.shareScope ?? "private",
    sharedRoleIds: data.sharedRoleIds ?? null,
  });
}

export async function updateAnalystView(
  id: string,
  data: UpdateAnalystViewDTO,
  user?: AuthUser,
) {
  const u = requireUser(user);
  const view = await AnalystView.findByPk(id);
  if (!view) throw new AppError("Analyst view not found", 404);
  if (view.ownerUserId !== u.id) {
    throw new AppError("Only the owner can update this view", 403);
  }
  return view.update({
    ...(data.persona !== undefined && {
      persona: data.persona as AnalystPersona,
    }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && {
      description: data.description ?? null,
    }),
    ...(data.routePath !== undefined && { routePath: data.routePath }),
    ...(data.paramsJson !== undefined && { paramsJson: data.paramsJson }),
    ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
    ...(data.isShared !== undefined && { isShared: data.isShared }),
    ...(data.shareScope !== undefined && { shareScope: data.shareScope }),
    ...(data.sharedRoleIds !== undefined && {
      sharedRoleIds: data.sharedRoleIds ?? null,
    }),
  });
}

export async function deleteAnalystView(id: string, user?: AuthUser) {
  const u = requireUser(user);
  const view = await AnalystView.findByPk(id);
  if (!view) throw new AppError("Analyst view not found", 404);
  if (view.ownerUserId !== u.id) {
    throw new AppError("Only the owner can delete this view", 403);
  }
  await view.destroy();
  return { id };
}

export async function recordAnalystViewSeen(id: string, user?: AuthUser) {
  const view = await getAnalystViewById(id, user);
  await view.update({
    lastViewedAt: new Date(),
    viewCount: view.viewCount + 1,
  });
  return view;
}
