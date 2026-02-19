import { z } from 'zod';

// ── Create Gate ──

export const createGateSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
  gateNumber: z.enum(['0', '1', '2', '3']),
  status: z.enum(['Pending', 'InProgress', 'Completed']).default('Pending'),
  notes: z.string().optional(),
});

// ── Update Gate ──

export const updateGateSchema = z.object({
  status: z.enum(['Pending', 'InProgress', 'Completed']).optional(),
  notes: z.string().optional(),
});

// ── Advance Gate (start / complete) ──

export const advanceGateSchema = z.object({
  action: z.enum(['start', 'complete']),
  notes: z.string().optional(),
});

// ── Checklist Item ──

export const createChecklistItemSchema = z.object({
  item: z.string().min(1, 'Item text is required').max(500),
  isMandatory: z.boolean().default(true),
  assignedTo: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const toggleChecklistItemSchema = z.object({
  isCompleted: z.boolean(),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

// ── Query Gates ──

export const gateQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
  sort: z.string().default('gate_number'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  status: z.enum(['Pending', 'InProgress', 'Completed']).optional(),
  gateNumber: z.enum(['0', '1', '2', '3']).optional(),
  playerId: z.string().uuid().optional(),
});

// ── Inferred Types ──

export type CreateGateInput = z.infer<typeof createGateSchema>;
export type UpdateGateInput = z.infer<typeof updateGateSchema>;
export type AdvanceGateInput = z.infer<typeof advanceGateSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type ToggleChecklistItemInput = z.infer<typeof toggleChecklistItemSchema>;
export type GateQuery = z.infer<typeof gateQuerySchema>;