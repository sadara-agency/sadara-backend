import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Type Constants ──

export const SIGNATURE_REQUEST_STATUSES = [
  "Draft",
  "Pending",
  "Completed",
  "Cancelled",
  "Expired",
] as const;
export type SignatureRequestStatus =
  (typeof SIGNATURE_REQUEST_STATUSES)[number];

export const SIGNING_ORDERS = ["sequential", "parallel"] as const;
export type SigningOrder = (typeof SIGNING_ORDERS)[number];

export const SIGNER_TYPES = ["internal", "external"] as const;
export type SignerType = (typeof SIGNER_TYPES)[number];

export const SIGNER_STATUSES = [
  "Pending",
  "Active",
  "Signed",
  "Declined",
  "Expired",
] as const;
export type SignerStatus = (typeof SIGNER_STATUSES)[number];

export const AUDIT_ACTIONS = [
  "created",
  "sent",
  "viewed",
  "signed",
  "declined",
  "cancelled",
  "completed",
  "reminded",
  "expired",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ══════════════════════════════════════════════════════════════
// SignatureRequest
// ══════════════════════════════════════════════════════════════

interface SignatureRequestAttributes {
  id: string;
  documentId: string;
  title: string;
  message: string | null;
  status: SignatureRequestStatus;
  signingOrder: SigningOrder;
  dueDate: string | null;
  signedDocumentUrl: string | null;
  createdBy: string;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SignatureRequestCreation extends Optional<
  SignatureRequestAttributes,
  | "id"
  | "message"
  | "status"
  | "signingOrder"
  | "dueDate"
  | "signedDocumentUrl"
  | "completedAt"
  | "cancelledAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SignatureRequest
  extends Model<SignatureRequestAttributes, SignatureRequestCreation>
  implements SignatureRequestAttributes
{
  declare id: string;
  declare documentId: string;
  declare title: string;
  declare message: string | null;
  declare status: SignatureRequestStatus;
  declare signingOrder: SigningOrder;
  declare dueDate: string | null;
  declare signedDocumentUrl: string | null;
  declare createdBy: string;
  declare completedAt: Date | null;
  declare cancelledAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

SignatureRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "document_id",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Draft",
    },
    signingOrder: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "sequential",
      field: "signing_order",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      field: "due_date",
    },
    signedDocumentUrl: {
      type: DataTypes.TEXT,
      field: "signed_document_url",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
    completedAt: {
      type: DataTypes.DATE,
      field: "completed_at",
    },
    cancelledAt: {
      type: DataTypes.DATE,
      field: "cancelled_at",
    },
  },
  {
    sequelize,
    tableName: "signature_requests",
    underscored: true,
    timestamps: true,
  },
);

// ══════════════════════════════════════════════════════════════
// SignatureSigner
// ══════════════════════════════════════════════════════════════

interface SignatureSignerAttributes {
  id: string;
  signatureRequestId: string;
  signerType: SignerType;
  userId: string | null;
  externalName: string | null;
  externalEmail: string | null;
  stepOrder: number;
  status: SignerStatus;
  signatureData: string | null;
  signingMethod: string | null;
  signedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  token: string | null;
  tokenExpiresAt: Date | null;
  declinedReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SignatureSignerCreation extends Optional<
  SignatureSignerAttributes,
  | "id"
  | "userId"
  | "externalName"
  | "externalEmail"
  | "status"
  | "signatureData"
  | "signingMethod"
  | "signedAt"
  | "ipAddress"
  | "userAgent"
  | "token"
  | "tokenExpiresAt"
  | "declinedReason"
  | "createdAt"
  | "updatedAt"
> {}

export class SignatureSigner
  extends Model<SignatureSignerAttributes, SignatureSignerCreation>
  implements SignatureSignerAttributes
{
  declare id: string;
  declare signatureRequestId: string;
  declare signerType: SignerType;
  declare userId: string | null;
  declare externalName: string | null;
  declare externalEmail: string | null;
  declare stepOrder: number;
  declare status: SignerStatus;
  declare signatureData: string | null;
  declare signingMethod: string | null;
  declare signedAt: Date | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare token: string | null;
  declare tokenExpiresAt: Date | null;
  declare declinedReason: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

SignatureSigner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    signatureRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "signature_request_id",
    },
    signerType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "internal",
      field: "signer_type",
    },
    userId: {
      type: DataTypes.UUID,
      field: "user_id",
    },
    externalName: {
      type: DataTypes.STRING(255),
      field: "external_name",
    },
    externalEmail: {
      type: DataTypes.STRING(255),
      field: "external_email",
    },
    stepOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "step_order",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Pending",
    },
    signatureData: {
      type: DataTypes.TEXT,
      field: "signature_data",
    },
    signingMethod: {
      type: DataTypes.STRING(20),
      field: "signing_method",
    },
    signedAt: {
      type: DataTypes.DATE,
      field: "signed_at",
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: "user_agent",
    },
    token: {
      type: DataTypes.STRING(128),
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      field: "token_expires_at",
    },
    declinedReason: {
      type: DataTypes.TEXT,
      field: "declined_reason",
    },
  },
  {
    sequelize,
    tableName: "signature_signers",
    underscored: true,
    timestamps: true,
  },
);

// ══════════════════════════════════════════════════════════════
// SignatureAuditTrail
// ══════════════════════════════════════════════════════════════

interface SignatureAuditTrailAttributes {
  id: string;
  signatureRequestId: string;
  signerId: string | null;
  action: AuditAction;
  actorId: string | null;
  actorName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any>;
  createdAt?: Date;
}

interface SignatureAuditTrailCreation extends Optional<
  SignatureAuditTrailAttributes,
  | "id"
  | "signerId"
  | "actorId"
  | "actorName"
  | "ipAddress"
  | "userAgent"
  | "metadata"
  | "createdAt"
> {}

export class SignatureAuditTrail
  extends Model<SignatureAuditTrailAttributes, SignatureAuditTrailCreation>
  implements SignatureAuditTrailAttributes
{
  declare id: string;
  declare signatureRequestId: string;
  declare signerId: string | null;
  declare action: AuditAction;
  declare actorId: string | null;
  declare actorName: string | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare metadata: Record<string, any>;
  declare createdAt: Date;
}

SignatureAuditTrail.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    signatureRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "signature_request_id",
    },
    signerId: {
      type: DataTypes.UUID,
      field: "signer_id",
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    actorId: {
      type: DataTypes.UUID,
      field: "actor_id",
    },
    actorName: {
      type: DataTypes.STRING(255),
      field: "actor_name",
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: "user_agent",
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: "signature_audit_trail",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
