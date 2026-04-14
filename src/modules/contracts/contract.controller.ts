import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { createCrudController } from "@shared/utils/crudController";
import { AppError } from "@middleware/errorHandler";
import { uploadFile } from "@shared/utils/storage";
import * as contractService from "@modules/contracts/contract.service";

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

  await invalidateMultiple([CachePrefix.CONTRACTS, CachePrefix.DASHBOARD]);

  await logAudit(
    "UPDATE",
    "contracts",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Contract terminated: ${(result as any).title || "Untitled"} — Reason: ${req.body.reason}`,
  );
  sendSuccess(res, result, "Contract terminated");
}

// ── Upload Signed Contract Document ──
export async function uploadSignedContract(req: AuthRequest, res: Response) {
  if (!req.file) {
    throw new AppError("No file provided", 400);
  }

  const result = await uploadFile({
    folder: "signed-contracts",
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
    generateThumbnail: false,
  });

  sendSuccess(res, { url: result.url }, "Signed contract uploaded");
}

// ── Contract History ──
export async function getHistory(req: AuthRequest, res: Response) {
  const history = await contractService.getContractHistory(req.params.id);
  sendSuccess(res, history);
}
