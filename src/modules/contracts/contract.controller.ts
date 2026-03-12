import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { sendSuccess, sendCreated } from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "../../shared/utils/cache";
import { createCrudController } from "../../shared/utils/crudController";
import * as contractService from "./contract.service";

const crud = createCrudController({
  service: {
    list: (query) => contractService.listContracts(query),
    getById: (id) => contractService.getContractById(id),
    create: (body, userId) => contractService.createContract(body, userId),
    update: (id, body) => contractService.updateContract(id, body),
    delete: (id) => contractService.deleteContract(id),
  },
  entity: "contracts",
  cachePrefixes: [CachePrefix.CONTRACTS, CachePrefix.DASHBOARD],
  label: (c) => c.title || "Untitled",
});

export const { list, getById, create, update, remove } = crud;

// ── Terminate Contract (custom) ──
export async function terminate(req: AuthRequest, res: Response) {
  const result = await contractService.terminateContract(
    req.params.id,
    req.body,
    req.user!.id,
  );

  await invalidateMultiple([
    CachePrefix.CONTRACTS,
    CachePrefix.DASHBOARD,
    CachePrefix.CLEARANCES,
  ]);

  if (req.body.method === "clearance" && "clearance" in result) {
    await logAudit(
      "CREATE",
      "clearances",
      result.clearance.id,
      buildAuditContext(req.user!, req.ip),
      `Clearance created for contract — Reason: ${req.body.reason}`,
    );
    sendCreated(
      res,
      result,
      "Clearance created — contract will terminate upon completion",
    );
  } else {
    await logAudit(
      "UPDATE",
      "contracts",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `Contract terminated: ${(result as any).title || "Untitled"} — Reason: ${req.body.reason}`,
    );
    sendSuccess(res, result, "Contract terminated");
  }
}

// ── Contract History ──
export async function getHistory(req: AuthRequest, res: Response) {
  const history = await contractService.getContractHistory(req.params.id);
  sendSuccess(res, history);
}
