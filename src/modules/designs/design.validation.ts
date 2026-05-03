import { z } from "zod";

export const designTypeEnum = z.enum([
  "Tweet",
  "InstagramPost",
  "Story",
  "Reel",
  "Video",
  "PlayerAnnouncement",
  "News",
  "Thread",
  "Design",
]);

export const designStatusEnum = z.enum([
  "Idea",
  "Drafting",
  "DesignNeeded",
  "PendingApproval",
  "Approved",
  "Scheduled",
  "Published",
  "Postponed",
  "Rejected",
]);

const designFormatEnum = z.enum([
  "square_1080",
  "portrait_1080x1350",
  "landscape_1920x1080",
  "custom",
]);

const designPlatformEnum = z.enum([
  "X",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Snapchat",
  "YouTubeShorts",
]);

const designPriorityEnum = z.enum(["High", "Medium", "Low"]);

const contentPillarEnum = z.enum([
  "Brand",
  "Players",
  "Commercial",
  "Community",
  "Announcements",
  "Media",
]);

const mediaLinkSchema = z.object({
  kind: z.enum(["figma", "drive", "upload", "url"]),
  url: z.string().url().max(1000),
  label: z.string().max(100).optional(),
});

export const createDesignSchema = z.object({
  title: z.string().min(1).max(200),
  type: designTypeEnum,
  status: designStatusEnum.default("Drafting"),
  format: designFormatEnum.default("square_1080"),
  playerId: z.string().uuid().optional().nullable(),
  matchId: z.string().uuid().optional().nullable(),
  clubId: z.string().uuid().optional().nullable(),
  assetUrl: z.string().url().max(500).optional().nullable(),
  assetWidth: z.number().int().positive().optional().nullable(),
  assetHeight: z.number().int().positive().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional().nullable(),
  // New fields
  platforms: z.array(designPlatformEnum).max(6).optional().nullable(),
  copyAr: z.string().max(10000).optional().nullable(),
  copyEn: z.string().max(10000).optional().nullable(),
  mediaLinks: z.array(mediaLinkSchema).max(10).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  approverId: z.string().uuid().optional().nullable(),
  priority: designPriorityEnum.optional().nullable(),
  contentPillar: contentPillarEnum.optional().nullable(),
  publishedLink: z.string().url().max(500).optional().nullable(),
  reviewNotes: z.string().max(5000).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
});

export const updateDesignSchema = createDesignSchema.partial();

// Quick Content: minimal fields for fast creation
export const quickContentSchema = z.object({
  type: designTypeEnum,
  platforms: z.array(designPlatformEnum).min(1).max(6),
  copyAr: z.string().min(1).max(10000),
  scheduledAt: z.string().datetime().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  // Auto-generated title from type + date if omitted
  title: z.string().max(200).optional(),
});

export const designQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sort: z
    .enum([
      "created_at",
      "updated_at",
      "title",
      "status",
      "type",
      "scheduled_at",
    ])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: designStatusEnum.optional(),
  type: designTypeEnum.optional(),
  platform: designPlatformEnum.optional(),
  playerId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  approverId: z.string().uuid().optional(),
  contentPillar: contentPillarEnum.optional(),
  scheduledDate: z.string().optional(), // YYYY-MM-DD for Today's Publishing
  publishedFrom: z.string().optional(), // YYYY-MM-DD inclusive start for archive
  publishedTo: z.string().optional(), // YYYY-MM-DD inclusive end for archive
  isLate: z.coerce.boolean().optional(),
});

// Approval action schemas
export const reviewNotesSchema = z.object({
  reviewNotes: z.string().min(1, "Review notes are required").max(5000),
});

export const markPublishedSchema = z.object({
  publishedLink: z.string().url().max(500).optional().nullable(),
});

export type CreateDesignInput = z.infer<typeof createDesignSchema>;
export type UpdateDesignInput = z.infer<typeof updateDesignSchema>;
export type DesignQuery = z.infer<typeof designQuerySchema>;
export type QuickContentInput = z.infer<typeof quickContentSchema>;
export type ReviewNotesInput = z.infer<typeof reviewNotesSchema>;
export type MarkPublishedInput = z.infer<typeof markPublishedSchema>;
