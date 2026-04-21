import { z } from "zod";

const docTypes = [
  "Contract",
  "Passport",
  "Medical",
  "ID",
  "Agreement",
  "Clearance",
  "Other",
] as const;
const docStatuses = ["Active", "Valid", "Pending", "Expired"] as const;
const entityTypes = [
  "Player",
  "Contract",
  "Match",
  "Injury",
  "Club",
  "Offer",
  "Scouting",
] as const;

export const createDocumentSchema = z.object({
  entityType: z.enum(entityTypes).optional(),
  entityId: z.string().uuid().optional(),
  name: z.string().min(1).max(500),
  type: z.enum(docTypes).default("Other"),
  status: z.enum(docStatuses).default("Active"),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  entityType: z.enum(entityTypes).nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(500).optional(),
  type: z.enum(docTypes).optional(),
  status: z.enum(docStatuses).optional(),
  fileUrl: z.string().min(1).optional(),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["created_at", "updated_at", "name", "type", "status", "expiry_date"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  type: z.enum(docTypes).optional(),
  status: z.enum(docStatuses).optional(),
  entityType: z.enum(entityTypes).optional(),
  entityId: z.string().uuid().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
