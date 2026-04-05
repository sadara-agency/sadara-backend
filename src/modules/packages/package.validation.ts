import { z } from "zod";

const moduleAccessSchema = z.object({
  module: z.string().min(1),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export const updatePackageConfigSchema = z.object({
  package: z.enum(["A", "B", "C"]),
  modules: z.array(moduleAccessSchema).min(1),
});

export const updatePlayerPackageSchema = z.object({
  playerPackage: z.enum(["A", "B", "C"]),
});

export type UpdatePackageConfigDTO = z.infer<typeof updatePackageConfigSchema>;
export type UpdatePlayerPackageDTO = z.infer<typeof updatePlayerPackageSchema>;
