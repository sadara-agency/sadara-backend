import { z } from "zod";

export const SECTION_KEYS = [
  "personal",
  "stats",
  "contracts",
  "injuries",
  "training",
  "sessions",
  "wellness",
  "reports",
  "finance",
  "documents",
  "notes",
  "offers",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const EXPORT_FORMATS = ["pdf", "xlsx", "csv", "html"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const exportPlayerSchema = z.object({
  sections: z.array(z.enum(SECTION_KEYS)).min(1),
  format: z.enum(EXPORT_FORMATS),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type ExportPlayerDTO = z.infer<typeof exportPlayerSchema>;
