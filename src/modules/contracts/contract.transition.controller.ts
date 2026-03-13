// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.transition.controller.ts
//
// FIXED from contract audit:
//  1. agent_sign_digital / agent_sign_upload → AwaitingPlayer (not Active)
//  2. Added AwaitingPlayer step with return_review action
//  3. Agent signatures stored in agentSignatureData/agentSignedAt/agentSigningMethod
//  4. Player signatures stay in signedDocumentUrl/signedAt/signingMethod
// ─────────────────────────────────────────────────────────────
import { Response } from "express";
import { logger } from "@config/logger";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { AppError } from "@middleware/errorHandler";
import { Contract } from "@modules/contracts/contract.model";
import { transaction } from "@config/database";
import {
  createApprovalRequest,
  resolveApprovalByEntity,
  isApprovalChainResolved,
} from "@modules/approvals/approval.service";
import { regenerateSignedPdf } from "@modules/contracts/contract.signing.service";
import { generateContractTransitionTask } from "@modules/contracts/contractAutoTasks";

// ── Allowed transitions map (5-step dual-signing flow) ──
const TRANSITION_MAP: Record<string, Record<string, string>> = {
  Draft: {
    submit_review: "Review",
  },
  Review: {
    approve: "Signing",
    reject_to_draft: "Draft",
  },
  Signing: {
    agent_sign_digital: "AwaitingPlayer", // Agent signs → awaiting player
    agent_sign_upload: "AwaitingPlayer", // Agent uploads → awaiting player
    return_review: "Review",
  },
  AwaitingPlayer: {
    return_review: "Review", // Admin can pull back
  },
  // Note: AwaitingPlayer → Active happens via player portal (portal.service.ts)
};

// ── Controller ──

export async function transitionContract(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { action, signatureData, signedDocumentUrl, notes } = req.body;

  if (!action || typeof action !== "string") {
    throw new AppError("action is required", 400);
  }

  // ── Guard: contract approve/reject requires completed approval chain ──
  if (action === "approve") {
    const chain = await isApprovalChainResolved("contract", id);
    if (!chain.resolved) {
      throw new AppError(
        "Cannot approve contract: the approval chain has not been fully resolved. " +
          "All approval steps must be completed first.",
        409,
      );
    }
    if (chain.status === "Rejected") {
      throw new AppError(
        "Cannot approve contract: the approval chain was rejected.",
        409,
      );
    }
  }

  if (action === "reject_to_draft") {
    const chain = await isApprovalChainResolved("contract", id);
    if (!chain.resolved && chain.status === "Pending") {
      throw new AppError(
        "Cannot reject contract: the approval chain is still pending. " +
          "Reject it through the Approvals page first.",
        409,
      );
    }
  }

  // Wrap in transaction with row-level lock to prevent race conditions
  const { contract, currentStatus, nextStatus } = await transaction(
    async (t) => {
      // SELECT ... FOR UPDATE — blocks concurrent transitions on the same row
      const locked = await Contract.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!locked) throw new AppError("Contract not found", 404);

      const curStatus = locked.status;
      const allowedActions = TRANSITION_MAP[curStatus];

      if (!allowedActions) {
        throw new AppError(
          `Contract in status '${curStatus}' cannot be transitioned`,
          400,
        );
      }

      const nxtStatus = allowedActions[action];
      if (!nxtStatus) {
        throw new AppError(
          `Action '${action}' is not valid for status '${curStatus}'. Allowed: ${Object.keys(allowedActions).join(", ")}`,
          400,
        );
      }

      // Build update payload
      const updatePayload: Record<string, unknown> = {
        status: nxtStatus,
      };

      // ── Agent digital signature → stored in agent fields ──
      if (action === "agent_sign_digital") {
        if (!signatureData) {
          throw new AppError(
            "signatureData is required for digital signing",
            400,
          );
        }
        updatePayload.agentSignatureData = signatureData; // base64 image
        updatePayload.agentSignedAt = new Date();
        updatePayload.agentSigningMethod = "digital";
      }

      // ── Agent upload signature → stored in agent fields ──
      if (action === "agent_sign_upload") {
        if (!signedDocumentUrl) {
          throw new AppError(
            "signedDocumentUrl is required for upload signing",
            400,
          );
        }
        updatePayload.agentSignatureData = signedDocumentUrl;
        updatePayload.agentSignedAt = new Date();
        updatePayload.agentSigningMethod = "upload";
      }

      // Add notes if provided
      if (notes) {
        const existing = locked.notes || "";
        const timestamp = new Date().toISOString().split("T")[0];
        updatePayload.notes = existing
          ? `${existing}\n[${timestamp}] ${action}: ${notes}`
          : `[${timestamp}] ${action}: ${notes}`;
      }

      await locked.update(updatePayload, { transaction: t });

      return {
        contract: locked,
        currentStatus: curStatus,
        nextStatus: nxtStatus,
      };
    },
  );

  // Invalidate cached contract data + dashboard KPIs
  await invalidateMultiple([CachePrefix.CONTRACTS, CachePrefix.DASHBOARD]);

  // ── Regenerate signed PDF with agent signature embedded ──
  if (action === "agent_sign_digital" || action === "agent_sign_upload") {
    try {
      const signedPdfUrl = await regenerateSignedPdf(id);
      await Contract.update({ documentUrl: signedPdfUrl }, { where: { id } });
    } catch (err: any) {
      logger.error("Failed to generate signed PDF after agent signing", {
        error: err.message,
      });
      // Non-blocking — contract transition already succeeded
    }
  }

  // Audit log (outside transaction — non-critical)
  await logAudit(
    "UPDATE",
    "contracts",
    id,
    buildAuditContext(req.user!, req.ip),
    `Contract transitioned: ${currentStatus} → ${nextStatus} (action: ${action})`,
  );

  // ── Approval hooks (fire-and-forget, outside transaction) ──
  if (action === "submit_review") {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    createApprovalRequest({
      entityType: "contract",
      entityId: id,
      entityTitle: `Contract: ${contract.title || `#${id.slice(0, 8)}`}`,
      action: "review",
      requestedBy: req.user!.id,
      assignedRole: "Manager",
      priority: "high",
      dueDate: due.toISOString().split("T")[0],
    }).catch((err) =>
      logger.warn("Contract transition notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  if (action === "approve" || action === "reject_to_draft") {
    resolveApprovalByEntity(
      "contract",
      id,
      req.user!.id,
      action === "approve" ? "Approved" : "Rejected",
    ).catch((err) =>
      logger.warn("Contract transition notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  // Fire-and-forget: auto-create tasks based on new status
  generateContractTransitionTask(id, nextStatus, req.user!.id).catch((err) =>
    logger.warn("Contract transition auto-task failed", {
      contractId: id,
      nextStatus,
      error: (err as Error).message,
    }),
  );

  sendSuccess(res, contract, `Contract transitioned to ${nextStatus}`);
}
