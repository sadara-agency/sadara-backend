// ─────────────────────────────────────────────────────────────
// src/modules/contracts/contract.signing.service.ts
//
// Regenerates the contract PDF with signatures embedded in the
// correct positions and saves to disk.
//
// Agent signature  → First Party area  (right side in RTL)
// Player signature → Second Party area (left side in RTL)
// ─────────────────────────────────────────────────────────────
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Contract } from "@modules/contracts/contract.model";
import { generateContractPdfBuffer } from "@modules/contracts/contract.pdf.controller";
import { UPLOAD_DIR_PATH } from "@middleware/upload";

const SIGNED_DIR = path.resolve(UPLOAD_DIR_PATH, "..", "signed-contracts");
if (!fs.existsSync(SIGNED_DIR)) {
  fs.mkdirSync(SIGNED_DIR, { recursive: true });
}

/**
 * Regenerate the contract PDF with the current signature state
 * (agent and/or player) and save it to disk.
 *
 * Returns the relative URL path to serve the file (e.g. /uploads/signed-contracts/xxx.pdf).
 */
export async function regenerateSignedPdf(contractId: string): Promise<string> {
  // Fetch the latest contract data (with signatures already saved to DB)
  const contract = await Contract.findByPk(contractId, {
    include: [{ association: "player" }, { association: "club" }],
  });

  if (!contract) throw new Error(`Contract ${contractId} not found`);

  // Generate the full PDF — getData() now reads both agent & player signatures
  const { buffer } = await generateContractPdfBuffer(contract);

  // Save to disk with a unique filename
  const fileName = `contract-${contractId}-${crypto.randomUUID().slice(0, 8)}.pdf`;
  const filePath = path.join(SIGNED_DIR, fileName);
  await fs.promises.writeFile(filePath, buffer);

  // Clean up previous signed PDF for this contract (avoid file accumulation)
  const existingUrl = contract.documentUrl || "";
  if (existingUrl.includes("/signed-contracts/")) {
    const oldFile = path.join(SIGNED_DIR, path.basename(existingUrl));
    if (oldFile !== filePath) {
      try {
        await fs.promises.unlink(oldFile);
      } catch {
        // Best-effort cleanup — old file may not exist
      }
    }
  }

  return `/uploads/signed-contracts/${fileName}`;
}
