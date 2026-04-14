import crypto from "crypto";
import { Op, Transaction } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import {
  SignatureRequest,
  SignatureSigner,
  SignatureAuditTrail,
} from "./esignature.model";
import { Document } from "@modules/documents/document.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { checkRowAccess } from "@shared/utils/rowScope";
import type { AuthUser } from "@shared/types";
import { notifyUser } from "@modules/notifications/notification.service";
import {
  sendSignatureRequestEmail,
  sendSignatureCompletedEmail,
  sendSignatureDeclinedEmail,
  sendSignatureReminderEmail,
} from "@shared/utils/mail";
import { env } from "@config/env";
import type {
  CreateSignatureRequestInput,
  SubmitSignatureInput,
  SignatureRequestQuery,
} from "./esignature.validation";

const USER_ATTRS = ["id", "fullName", "fullNameAr", "email"] as const;
const TOKEN_EXPIRY_DAYS = 7;

// ── Includes ──

function requestIncludes() {
  return [
    {
      model: Document,
      as: "document",
      attributes: ["id", "name", "fileUrl", "mimeType"],
    },
    { model: User, as: "creator", attributes: [...USER_ATTRS] },
    {
      model: SignatureSigner,
      as: "signers",
      include: [{ model: User, as: "user", attributes: [...USER_ATTRS] }],
    },
  ];
}

// ── Audit helpers ──

async function logSignatureAudit(
  signatureRequestId: string,
  action: string,
  opts: {
    signerId?: string;
    actorId?: string;
    actorName?: string;
    ip?: string;
    ua?: string;
    metadata?: Record<string, any>;
  } = {},
) {
  await SignatureAuditTrail.create({
    signatureRequestId,
    signerId: opts.signerId || null,
    action: action as any,
    actorId: opts.actorId || null,
    actorName: opts.actorName || null,
    ipAddress: opts.ip || null,
    userAgent: opts.ua || null,
    metadata: opts.metadata || {},
  });
}

// ── Token helpers ──

function generateToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );
  return { raw, hash, expiresAt };
}

// ══════════════════════════════════════════════════════════════
// Create Signature Request
// ══════════════════════════════════════════════════════════════

export async function createSignatureRequest(
  input: CreateSignatureRequestInput,
  user: AuthUser,
) {
  const userId = user.id;

  const doc = await Document.findByPk(input.documentId);
  if (!doc) throw new AppError("Document not found", 404);

  // Prevent users from creating signature requests on documents they cannot access
  const allowed = await checkRowAccess("documents", doc, user);
  if (!allowed) throw new AppError("Document not found", 404);

  const creator = await User.findByPk(userId, { attributes: [...USER_ATTRS] });
  if (!creator) throw new AppError("User not found", 404);

  return sequelize.transaction(async (t) => {
    const request = await SignatureRequest.create(
      {
        documentId: input.documentId,
        title: input.title,
        message: input.message || null,
        signingOrder: input.signingOrder || "sequential",
        dueDate: input.dueDate || null,
        status: "Pending",
        createdBy: userId,
      },
      { transaction: t },
    );

    const tokenMap: Record<number, string> = {}; // stepOrder → rawToken (for emails)

    for (const s of input.signers) {
      const tokenInfo = s.signerType === "external" ? generateToken() : null;

      if (tokenInfo) {
        tokenMap[s.stepOrder] = tokenInfo.raw;
      }

      const isActive = input.signingOrder === "parallel" || s.stepOrder === 1;

      await SignatureSigner.create(
        {
          signatureRequestId: request.id,
          signerType: s.signerType,
          userId: s.userId || null,
          externalName: s.externalName || null,
          externalEmail: s.externalEmail || null,
          stepOrder: s.stepOrder,
          status: isActive ? "Active" : "Pending",
          token: tokenInfo?.hash || null,
          tokenExpiresAt: tokenInfo?.expiresAt || null,
        },
        { transaction: t },
      );
    }

    await logSignatureAudit(request.id, "created", {
      actorId: userId,
      actorName: creator.fullName,
    });

    // Commit first, then send notifications
    t.afterCommit(async () => {
      await sendSignerNotifications(
        request.id,
        tokenMap,
        creator.fullName,
        doc.name,
        input.message,
      );
    });

    return SignatureRequest.findByPk(request.id, {
      include: requestIncludes(),
    });
  });
}

// ── Send notifications to active signers ──

async function sendSignerNotifications(
  requestId: string,
  tokenMap: Record<number, string>,
  creatorName: string,
  docName: string,
  message?: string,
) {
  const signers = await SignatureSigner.findAll({
    where: { signatureRequestId: requestId, status: "Active" },
    include: [{ model: User, as: "user", attributes: [...USER_ATTRS] }],
  });

  for (const signer of signers) {
    if (signer.signerType === "internal" && signer.userId) {
      const user = (signer as any).user;
      if (!user) continue;

      await notifyUser(signer.userId, {
        type: "document",
        title: `Signature requested: ${docName}`,
        titleAr: `طلب توقيع: ${docName}`,
        body: `${creatorName} requested your signature`,
        link: `/dashboard/esignatures`,
        sourceType: "esignature",
        sourceId: requestId,
        priority: "normal",
      });

      const signingUrl = `${env.frontend.url}/dashboard/esignatures?sign=${requestId}&signer=${signer.id}`;
      await sendSignatureRequestEmail(
        user.email,
        user.fullName,
        docName,
        creatorName,
        message,
        signingUrl,
      );
    } else if (signer.signerType === "external" && signer.externalEmail) {
      const rawToken = tokenMap[signer.stepOrder];
      const signingUrl = rawToken
        ? `${env.frontend.url}/sign/${rawToken}`
        : `${env.frontend.url}/sign/invalid`;

      await sendSignatureRequestEmail(
        signer.externalEmail,
        signer.externalName || "Signer",
        docName,
        creatorName,
        message,
        signingUrl,
      );
    }

    await logSignatureAudit(requestId, "sent", { signerId: signer.id });
  }
}

// ══════════════════════════════════════════════════════════════
// Submit Signature
// ══════════════════════════════════════════════════════════════

export async function submitSignature(
  signerId: string,
  input: SubmitSignatureInput,
  ip: string,
  userAgent: string,
) {
  return sequelize.transaction(async (t) => {
    const signer = await SignatureSigner.findByPk(signerId, {
      include: [
        {
          model: SignatureRequest,
          as: "request",
          include: [
            {
              model: Document,
              as: "document",
              attributes: ["id", "name", "fileUrl"],
            },
          ],
        },
      ],
      transaction: t,
      lock: { level: Transaction.LOCK.UPDATE, of: SignatureSigner },
    });

    if (!signer) throw new AppError("Signer not found", 404);
    if (signer.status !== "Active")
      throw new AppError("This signer is not currently active", 400);

    const request = (signer as any).request as SignatureRequest;
    if (!request || request.status !== "Pending")
      throw new AppError("Signature request is not pending", 400);

    // Save signature
    await signer.update(
      {
        signatureData: input.signatureData,
        signingMethod: input.signingMethod,
        signedAt: new Date(),
        ipAddress: ip,
        userAgent,
        status: "Signed",
      },
      { transaction: t },
    );

    await logSignatureAudit(request.id, "signed", {
      signerId: signer.id,
      actorId: signer.userId || undefined,
      actorName: signer.externalName || undefined,
      ip,
      ua: userAgent,
    });

    // Check if all signers are done
    const remainingCount = await SignatureSigner.count({
      where: {
        signatureRequestId: request.id,
        status: { [Op.notIn]: ["Signed", "Declined", "Expired"] },
      },
      transaction: t,
    });

    if (remainingCount === 0) {
      // All signed — finalize
      t.afterCommit(async () => {
        await finalizeRequest(request.id);
      });
    } else if (request.signingOrder === "sequential") {
      // Activate next signer
      const nextSigner = await SignatureSigner.findOne({
        where: {
          signatureRequestId: request.id,
          status: "Pending",
        },
        order: [["stepOrder", "ASC"]],
        transaction: t,
      });

      if (nextSigner) {
        // Generate token for external signers that don't have one yet
        let newTokenMap: Record<number, string> = {};
        if (nextSigner.signerType === "external" && !nextSigner.token) {
          const tokenInfo = generateToken();
          await nextSigner.update(
            {
              status: "Active",
              token: tokenInfo.hash,
              tokenExpiresAt: tokenInfo.expiresAt,
            },
            { transaction: t },
          );
          newTokenMap[nextSigner.stepOrder] = tokenInfo.raw;
        } else {
          await nextSigner.update({ status: "Active" }, { transaction: t });
        }

        const doc = (request as any).document;
        const creator = await User.findByPk(request.createdBy, {
          attributes: [...USER_ATTRS],
        });

        t.afterCommit(async () => {
          await sendSignerNotifications(
            request.id,
            newTokenMap,
            creator?.fullName || "System",
            doc?.name || request.title,
          );
        });
      }
    }

    return signer;
  });
}

// ══════════════════════════════════════════════════════════════
// Decline Signature
// ══════════════════════════════════════════════════════════════

export async function declineSignature(
  signerId: string,
  reason: string | undefined,
  ip: string,
  userAgent: string,
) {
  return sequelize.transaction(async (t) => {
    const signer = await SignatureSigner.findByPk(signerId, {
      include: [
        {
          model: SignatureRequest,
          as: "request",
          include: [
            { model: Document, as: "document", attributes: ["id", "name"] },
          ],
        },
      ],
      transaction: t,
      lock: { level: Transaction.LOCK.UPDATE, of: SignatureSigner },
    });

    if (!signer) throw new AppError("Signer not found", 404);
    if (signer.status !== "Active")
      throw new AppError("This signer is not currently active", 400);

    const request = (signer as any).request as SignatureRequest;

    await signer.update(
      {
        status: "Declined",
        declinedReason: reason || null,
        ipAddress: ip,
        userAgent,
      },
      { transaction: t },
    );

    // Cancel the entire request
    await request.update(
      { status: "Cancelled", cancelledAt: new Date() },
      { transaction: t },
    );

    // Expire remaining pending signers
    await SignatureSigner.update(
      { status: "Expired" },
      {
        where: {
          signatureRequestId: request.id,
          status: { [Op.in]: ["Pending", "Active"] },
          id: { [Op.ne]: signer.id },
        },
        transaction: t,
      },
    );

    const declinedByName =
      signer.externalName ||
      (signer.userId
        ? (await User.findByPk(signer.userId, { attributes: ["fullName"] }))
            ?.fullName
        : "Unknown");

    await logSignatureAudit(request.id, "declined", {
      signerId: signer.id,
      actorId: signer.userId || undefined,
      actorName: declinedByName || undefined,
      ip,
      ua: userAgent,
      metadata: reason ? { reason } : {},
    });

    // Notify creator
    t.afterCommit(async () => {
      const doc = (request as any).document;
      await notifyUser(request.createdBy, {
        type: "document",
        title: `Signature declined: ${doc?.name || request.title}`,
        titleAr: `تم رفض التوقيع: ${doc?.name || request.title}`,
        body: `${declinedByName} declined to sign${reason ? `: ${reason}` : ""}`,
        link: `/dashboard/esignatures`,
        sourceType: "esignature",
        sourceId: request.id,
        priority: "high",
      });

      const creator = await User.findByPk(request.createdBy, {
        attributes: [...USER_ATTRS],
      });
      if (creator?.email) {
        await sendSignatureDeclinedEmail(
          creator.email,
          creator.fullName,
          doc?.name || request.title,
          declinedByName || "A signer",
          reason,
        );
      }
    });

    return signer;
  });
}

// ══════════════════════════════════════════════════════════════
// Finalize (all signed → generate PDF)
// ══════════════════════════════════════════════════════════════

async function finalizeRequest(requestId: string) {
  const request = await SignatureRequest.findByPk(requestId, {
    include: [
      {
        model: Document,
        as: "document",
        attributes: ["id", "name", "fileUrl", "mimeType"],
      },
      { model: User, as: "creator", attributes: [...USER_ATTRS] },
      {
        model: SignatureSigner,
        as: "signers",
        where: { status: "Signed" },
        include: [{ model: User, as: "user", attributes: [...USER_ATTRS] }],
      },
    ],
  });

  if (!request) return;

  let signedUrl: string | null = null;

  // Generate signed PDF only for PDF documents
  const doc = (request as any).document;
  if (doc?.mimeType === "application/pdf" && doc?.fileUrl) {
    try {
      const { generateSignedDocument } =
        await import("./esignature.signing.service");
      signedUrl = await generateSignedDocument(request);
    } catch (err: any) {
      // Log but don't fail — the signatures are already captured
      logger.error("[E-Sign] PDF generation failed:", { error: err.message });
    }
  }

  await request.update({
    status: "Completed",
    completedAt: new Date(),
    signedDocumentUrl: signedUrl,
  });

  await logSignatureAudit(requestId, "completed", {
    actorId: request.createdBy,
    metadata: signedUrl ? { signedDocumentUrl: signedUrl } : {},
  });

  // Notify all parties
  const creator = (request as any).creator;
  const signers = (request as any).signers || [];

  // Notify creator
  await notifyUser(request.createdBy, {
    type: "document",
    title: `All signatures collected: ${doc?.name || request.title}`,
    titleAr: `تم جمع جميع التوقيعات: ${doc?.name || request.title}`,
    link: `/dashboard/esignatures`,
    sourceType: "esignature",
    sourceId: requestId,
    priority: "normal",
  });

  if (creator?.email) {
    await sendSignatureCompletedEmail(
      creator.email,
      creator.fullName,
      doc?.name || request.title,
    );
  }

  // Notify each signer
  for (const signer of signers) {
    const email =
      signer.signerType === "internal"
        ? (signer as any).user?.email
        : signer.externalEmail;
    const name =
      signer.signerType === "internal"
        ? (signer as any).user?.fullName
        : signer.externalName;

    if (email && signer.userId !== request.createdBy) {
      await sendSignatureCompletedEmail(
        email,
        name || "Signer",
        doc?.name || request.title,
      );
    }

    if (signer.userId && signer.userId !== request.createdBy) {
      await notifyUser(signer.userId, {
        type: "document",
        title: `Document fully signed: ${doc?.name || request.title}`,
        titleAr: `تم توقيع المستند بالكامل: ${doc?.name || request.title}`,
        link: `/dashboard/esignatures`,
        sourceType: "esignature",
        sourceId: requestId,
        priority: "normal",
      });
    }
  }
}

// ══════════════════════════════════════════════════════════════
// Cancel Request
// ══════════════════════════════════════════════════════════════

export async function cancelRequest(requestId: string, userId: string) {
  const request = await SignatureRequest.findByPk(requestId);
  if (!request) throw new AppError("Signature request not found", 404);
  if (request.status !== "Pending")
    throw new AppError("Only pending requests can be cancelled", 400);
  if (request.createdBy !== userId)
    throw new AppError("Only the creator can cancel this request", 403);

  await sequelize.transaction(async (t) => {
    await request.update(
      { status: "Cancelled", cancelledAt: new Date() },
      { transaction: t },
    );

    await SignatureSigner.update(
      { status: "Expired" },
      {
        where: {
          signatureRequestId: requestId,
          status: { [Op.in]: ["Pending", "Active"] },
        },
        transaction: t,
      },
    );
  });

  const user = await User.findByPk(userId, { attributes: ["fullName"] });
  await logSignatureAudit(requestId, "cancelled", {
    actorId: userId,
    actorName: user?.fullName || undefined,
  });

  return request.reload({ include: requestIncludes() });
}

// ══════════════════════════════════════════════════════════════
// Remind Signer
// ══════════════════════════════════════════════════════════════

export async function remindSigner(signerId: string, userId: string) {
  const signer = await SignatureSigner.findByPk(signerId, {
    include: [
      {
        model: SignatureRequest,
        as: "request",
        include: [
          { model: Document, as: "document", attributes: ["id", "name"] },
          { model: User, as: "creator", attributes: [...USER_ATTRS] },
        ],
      },
      { model: User, as: "user", attributes: [...USER_ATTRS] },
    ],
  });

  if (!signer) throw new AppError("Signer not found", 404);
  if (signer.status !== "Active")
    throw new AppError("Can only remind active signers", 400);

  const request = (signer as any).request as SignatureRequest;
  const doc = (request as any).document;
  const creator = (request as any).creator;

  const email =
    signer.signerType === "internal"
      ? (signer as any).user?.email
      : signer.externalEmail;
  const name =
    signer.signerType === "internal"
      ? (signer as any).user?.fullName
      : signer.externalName;

  if (email) {
    let signingUrl: string;
    if (signer.signerType === "internal") {
      signingUrl = `${env.frontend.url}/dashboard/esignatures?sign=${request.id}&signer=${signer.id}`;
    } else {
      // Generate a fresh token for external signers
      const tokenInfo = generateToken();
      await signer.update({
        token: tokenInfo.hash,
        tokenExpiresAt: tokenInfo.expiresAt,
      });
      signingUrl = `${env.frontend.url}/sign/${tokenInfo.raw}`;
    }

    await sendSignatureReminderEmail(
      email,
      name || "Signer",
      doc?.name || request.title,
      signingUrl,
      request.dueDate,
    );
  }

  if (signer.signerType === "internal" && signer.userId) {
    await notifyUser(signer.userId, {
      type: "document",
      title: `Reminder: Please sign ${doc?.name || request.title}`,
      titleAr: `تذكير: يرجى التوقيع على ${doc?.name || request.title}`,
      link: `/dashboard/esignatures`,
      sourceType: "esignature",
      sourceId: request.id,
      priority: "normal",
    });
  }

  await logSignatureAudit(request.id, "reminded", {
    signerId: signer.id,
    actorId: userId,
    actorName: creator?.fullName || undefined,
  });

  return { sent: true };
}

// ══════════════════════════════════════════════════════════════
// Verify Token (external signers)
// ══════════════════════════════════════════════════════════════

export async function verifySigningToken(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const signer = await SignatureSigner.findOne({
    where: { token: tokenHash },
    include: [
      {
        model: SignatureRequest,
        as: "request",
        include: [
          {
            model: Document,
            as: "document",
            attributes: ["id", "name", "fileUrl", "mimeType"],
          },
          { model: User, as: "creator", attributes: [...USER_ATTRS] },
        ],
      },
    ],
  });

  if (!signer) throw new AppError("Invalid or expired signing link", 404);
  if (signer.tokenExpiresAt && new Date(signer.tokenExpiresAt) < new Date())
    throw new AppError("This signing link has expired", 410);
  if (signer.status !== "Active")
    throw new AppError("This signing request is no longer active", 400);

  const request = (signer as any).request as SignatureRequest;
  if (request.status !== "Pending")
    throw new AppError("This signature request is no longer pending", 400);

  // Log view
  await logSignatureAudit(request.id, "viewed", { signerId: signer.id });

  return { signer, request };
}

// ══════════════════════════════════════════════════════════════
// List & Detail
// ══════════════════════════════════════════════════════════════

export async function listRequests(
  query: SignatureRequestQuery,
  userId: string,
  userRole: string,
) {
  const { limit, offset, page } = parsePagination(
    query,
    query.sort || "created_at",
  );

  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.documentId) where.documentId = query.documentId;
  if (query.search) {
    where.title = { [Op.iLike]: `%${query.search}%` };
  }

  // Non-admin users see only their own requests or requests they're a signer on
  if (userRole !== "Admin" && userRole !== "Manager") {
    const signerRequestIds = await SignatureSigner.findAll({
      where: { userId },
      attributes: ["signatureRequestId"],
      raw: true,
    });
    const ids = signerRequestIds.map((s) => s.signatureRequestId);

    where[Op.or] = [{ createdBy: userId }, { id: { [Op.in]: ids } }];
  }

  const { rows, count } = await SignatureRequest.findAndCountAll({
    where,
    include: requestIncludes(),
    order: [[query.sort || "created_at", query.order || "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getRequestById(id: string) {
  const request = await SignatureRequest.findByPk(id, {
    include: [
      ...requestIncludes(),
      {
        model: SignatureAuditTrail,
        as: "auditTrail",
        order: [["createdAt", "ASC"]],
        separate: true,
      },
    ],
  });

  if (!request) throw new AppError("Signature request not found", 404);
  return request;
}

export async function getAuditTrail(requestId: string) {
  return SignatureAuditTrail.findAll({
    where: { signatureRequestId: requestId },
    order: [["createdAt", "ASC"]],
  });
}

// ══════════════════════════════════════════════════════════════
// My Pending Signatures
// ══════════════════════════════════════════════════════════════

export async function getMyPendingSignatures(userId: string) {
  const signers = await SignatureSigner.findAll({
    where: { userId, status: "Active" },
    include: [
      {
        model: SignatureRequest,
        as: "request",
        where: { status: "Pending" },
        include: [
          { model: Document, as: "document", attributes: ["id", "name"] },
          { model: User, as: "creator", attributes: ["id", "fullName"] },
        ],
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  return {
    count: signers.length,
    items: signers,
  };
}

// ══════════════════════════════════════════════════════════════
// Expire Overdue Requests (cron)
// ══════════════════════════════════════════════════════════════

export async function expireOverdueSignatureRequests() {
  const today = new Date().toISOString().split("T")[0];

  const expired = await SignatureRequest.findAll({
    where: {
      status: "Pending",
      dueDate: { [Op.lt]: today },
    },
  });

  let count = 0;
  for (const req of expired) {
    await sequelize.transaction(async (t) => {
      await req.update({ status: "Expired" }, { transaction: t });
      await SignatureSigner.update(
        { status: "Expired" },
        {
          where: {
            signatureRequestId: req.id,
            status: { [Op.in]: ["Pending", "Active"] },
          },
          transaction: t,
        },
      );
    });

    await logSignatureAudit(req.id, "expired", {
      metadata: { dueDate: req.dueDate },
    });
    count++;
  }

  return { expiredCount: count };
}
