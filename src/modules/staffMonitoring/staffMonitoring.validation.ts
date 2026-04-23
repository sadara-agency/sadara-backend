import { z } from "zod";

export const rangeQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  role: z.string().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const rankingsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  role: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type RangeQuery = z.infer<typeof rangeQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type RankingsQuery = z.infer<typeof rankingsQuerySchema>;

export function parseRange(range: string): 7 | 30 | 90 {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

export function parseRoleFilter(role?: string): string[] | undefined {
  if (!role) return undefined;
  const parts = role
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}
