import { z } from "zod";

export const executiveReportParamsSchema = z.object({
  playerId: z.string().uuid(),
});

export const executiveReportQuerySchema = z.object({
  locale: z.enum(["ar", "en"]).default("ar"),
});

export type ExecutiveReportParams = z.infer<typeof executiveReportParamsSchema>;
export type ExecutiveReportQuery = z.infer<typeof executiveReportQuerySchema>;
