import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { AppError } from "../../middleware/errorHandler";
import * as scoutingService from "./scouting.service";
import { generateScoutingPackPdf } from "./scouting.pdf";

export async function generatePackPdf(req: AuthRequest, res: Response) {
  const screening = await scoutingService.getScreeningCase(req.params.id);
  if (!screening) throw new AppError("Screening case not found", 404);
  if (!screening.isPackReady)
    throw new AppError("Pack must be ready before PDF can be generated", 400);

  const watchlist = (screening as any).watchlist;
  if (!watchlist) throw new AppError("Watchlist entry not found", 404);

  const pdfBuffer = await generateScoutingPackPdf(
    watchlist.get ? watchlist.get({ plain: true }) : watchlist,
    screening.get ? screening.get({ plain: true }) : screening,
  );

  const name = `scouting_pack_${screening.caseNumber}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", pdfBuffer.length);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  );
  res.end(pdfBuffer);
}
