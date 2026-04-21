import { Response } from "express";
import { AppError } from "@middleware/errorHandler";
import type { AuthRequest } from "@shared/types";
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
