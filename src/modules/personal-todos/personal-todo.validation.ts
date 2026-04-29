import { z } from "zod";

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const createPersonalTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  notes: z.string().nullable().optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  dueDate: z.string().date().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updatePersonalTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().nullable().optional(),
  isDone: z.boolean().optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().date().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const personalTodoQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(100),
  isDone: z.enum(["true", "false"]).optional(),
  priority: z.enum(PRIORITIES).optional(),
  tag: z.string().optional(),
  dueBefore: z.string().date().optional(),
  dueAfter: z.string().date().optional(),
});

export const personalTodoParamsSchema = z.object({
  id: z.string().uuid(),
});

export const reorderPersonalTodosSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(500),
});

export type CreatePersonalTodoDTO = z.infer<typeof createPersonalTodoSchema>;
export type UpdatePersonalTodoDTO = z.infer<typeof updatePersonalTodoSchema>;
export type PersonalTodoQuery = z.infer<typeof personalTodoQuerySchema>;
export type ReorderPersonalTodosDTO = z.infer<
  typeof reorderPersonalTodosSchema
>;
