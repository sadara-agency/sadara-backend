import { z } from "zod";

export const createVoiceMemoSchema = z.object({
  ownerType: z.enum(["Watchlist"]),
  ownerId: z.string().uuid(),
  durationSeconds: z.coerce.number().int().min(1).max(300), // max 5 minutes
});

export const voiceMemoQuerySchema = z.object({
  ownerType: z.enum(["Watchlist"]),
  ownerId: z.string().uuid(),
});
