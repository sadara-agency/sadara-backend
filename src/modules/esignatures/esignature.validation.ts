import { z } from "zod";

const signerSchema = z
  .object({
    signerType: z.enum(["internal", "external"]),
    userId: z.string().uuid().optional(),
    externalName: z.string().max(255).optional(),
    externalEmail: z.string().email().max(255).optional(),
    stepOrder: z.coerce.number().int().min(1),
  })
  .refine(
    (s) =>
      s.signerType === "internal"
        ? !!s.userId
        : !!s.externalName && !!s.externalEmail,
    {
      message:
        "Internal signers require userId; external signers require name and email",
    },
  );

export const createSignatureRequestSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(500),
  message: z.string().max(2000).optional(),
  signingOrder: z.enum(["sequential", "parallel"]).default("sequential"),
  dueDate: z.string().optional(),
  signers: z.array(signerSchema).min(1, "At least one signer is required"),
});

export const submitSignatureSchema = z.object({
  signatureData: z.string().min(1, "Signature data is required"),
  signingMethod: z.enum(["digital", "upload"]),
});

export const declineSignatureSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const signatureRequestQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z.enum(["created_at", "updated_at", "due_date"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z
    .enum(["Draft", "Pending", "Completed", "Cancelled", "Expired"])
    .optional(),
  documentId: z.string().uuid().optional(),
});

export type CreateSignatureRequestInput = z.infer<
  typeof createSignatureRequestSchema
>;
export type SubmitSignatureInput = z.infer<typeof submitSignatureSchema>;
export type DeclineSignatureInput = z.infer<typeof declineSignatureSchema>;
export type SignatureRequestQuery = z.infer<typeof signatureRequestQuerySchema>;
