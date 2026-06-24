import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(20000),
      }),
    )
    .max(40)
    .default([]),
});

export type ChatDTO = z.infer<typeof chatSchema>;
