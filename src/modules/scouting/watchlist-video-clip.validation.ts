import { z } from "zod";

export const addVideoClipLinkSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().max(255).optional(),
});

export const addVideoClipUploadSchema = z.object({
  title: z.string().max(255).optional(),
});

export const videoClipParamSchema = z.object({
  id: z.string().uuid(),
});

export const watchlistVideoClipParamSchema = z.object({
  watchlistId: z.string().uuid(),
});

export type AddVideoClipLinkDTO = z.infer<typeof addVideoClipLinkSchema>;
export type AddVideoClipUploadDTO = z.infer<typeof addVideoClipUploadSchema>;
