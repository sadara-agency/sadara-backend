import { Response } from "express";
import { AppError } from "@middleware/errorHandler";
import { sendSuccess } from "@shared/utils/apiResponse";
import { getSignedUrl, isStorageKey } from "@shared/utils/storage";
import type { AuthRequest } from "@shared/types";
import { Player } from "@modules/players/player.model";
import { aggregatePlayerData } from "./player-export.service";
import { ExportPlayerDTO, ExportFormat } from "./player-export.validation";
import { renderPdfBuffer, renderHtmlBuffer } from "./player-export.pdf";
import { renderXlsxBuffer } from "./player-export.xlsx";
import { renderCsvBuffer } from "./player-export.csv";

const MIME: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  html: "text/html; charset=utf-8",
};

const EXT: Record<ExportFormat, string> = {
  pdf: "pdf",
  xlsx: "xlsx",
  csv: "csv",
  html: "html",
};

export async function exportPlayer(req: AuthRequest, res: Response) {
  const user = req.user;
  if (!user) throw new AppError("Unauthorized", 401);

  const playerId = req.params.id;
  const { sections, format, locale } = req.body as ExportPlayerDTO;

  const data = await aggregatePlayerData(playerId, sections, user, locale);

  let buffer: Buffer;
  switch (format) {
    case "pdf":
      buffer = await renderPdfBuffer(data);
      break;
    case "xlsx":
      buffer = await renderXlsxBuffer(data);
      break;
    case "csv":
      buffer = renderCsvBuffer(data);
      break;
    case "html":
      buffer = renderHtmlBuffer(data);
      break;
  }

  const displayId =
    (data.player.displayId as string) || String(data.player.id).slice(0, 8);
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const filename = `player-${displayId}-${today}.${EXT[format]}`;

  res.setHeader("Content-Type", MIME[format]);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.send(buffer);
}

/**
 * GET /players/:id/export-data
 * Returns aggregated player data as JSON for client-side PDF rendering.
 */
export async function exportPlayerData(req: AuthRequest, res: Response) {
  const user = req.user;
  if (!user) throw new AppError("Unauthorized", 401);

  const playerId = req.params.id;
  const sections = req.query.sections
    ? (String(req.query.sections).split(",") as ExportPlayerDTO["sections"])
    : ([
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
      ] as ExportPlayerDTO["sections"]);
  const locale = (req.query.locale as "en" | "ar") ?? "en";

  const data = await aggregatePlayerData(playerId, sections, user, locale);

  // photoUrl may be stripped by field-level permissions — fetch it directly
  // so the frontend PDF renderer can always display the avatar.
  const playerRaw = await Player.findByPk(playerId, {
    attributes: ["photoUrl"],
  });
  const rawPhotoUrl = playerRaw?.get("photoUrl") as string | null | undefined;
  if (rawPhotoUrl) {
    data.player.photoUrl = isStorageKey(rawPhotoUrl)
      ? await getSignedUrl(rawPhotoUrl)
      : rawPhotoUrl;
  }

  sendSuccess(res, data);
}
