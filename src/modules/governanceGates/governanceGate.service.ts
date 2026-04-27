import GovernanceGate from "./governanceGate.model";
import type { TriggerGateDTO } from "./governanceGate.validation";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";

export async function listGates(query: {
  status?: string;
  gateType?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = query;
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.gateType) where.gateType = query.gateType;
  if (query.entityType) where.entityType = query.entityType;

  const { rows, count } = await GovernanceGate.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getGateById(id: string) {
  const gate = await GovernanceGate.findByPk(id);
  if (!gate) throw new AppError("Governance gate not found", 404);
  return gate;
}

export async function triggerGate(data: TriggerGateDTO, user: AuthUser) {
  return GovernanceGate.create({
    ...data,
    status: "pending",
    triggeredBy: user.id,
    triggeredByRole: user.role,
  });
}

export async function resolveGate(
  id: string,
  action: "approve" | "reject" | "bypass",
  reviewerNotes: string | undefined,
  user: AuthUser,
) {
  const gate = await getGateById(id);
  if (gate.status !== "pending") {
    throw new AppError("Gate is already resolved", 409);
  }
  const statusMap = {
    approve: "approved",
    reject: "rejected",
    bypass: "bypassed",
  } as const;
  return gate.update({
    status: statusMap[action],
    resolvedBy: user.id,
    resolvedAt: new Date(),
    reviewerNotes: reviewerNotes ?? null,
  });
}

export async function deleteGate(id: string) {
  const gate = await getGateById(id);
  await gate.destroy();
  return { id };
}
