import { Readable } from "stream";
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { AppError } from "@middleware/errorHandler";

let _scannerPromise: Promise<unknown> | null = null;
let _warnedDisabled = false;

function getScanner(): Promise<unknown> {
  if (!_scannerPromise) {
    _scannerPromise = (async () => {
      // Dynamic require keeps clamscan out of the startup bundle on envs where it's disabled.
      const NodeClam = require("clamscan");
      return new NodeClam().init({
        removeInfected: false,
        clamdscan: {
          host: env.clamav.host,
          port: env.clamav.port,
          timeout: 10_000,
          active: true,
        },
        preference: "clamdscan",
      });
    })().catch((err: Error) => {
      _scannerPromise = null; // allow retry on next request
      throw err;
    });
  }
  return _scannerPromise;
}

export async function virusScan(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!env.clamav.enabled) {
    if (!_warnedDisabled) {
      logger.warn("[virusScan] CLAMAV_ENABLED=false — virus scanning is OFF");
      _warnedDisabled = true;
    }
    return next();
  }

  const file = req.file;
  if (!file) return next();

  try {
    const scanner = (await getScanner()) as {
      scanStream: (
        s: Readable,
      ) => Promise<{ isInfected: boolean; viruses: string[] }>;
    };
    const stream = Readable.from(file.buffer);
    const { isInfected, viruses } = await scanner.scanStream(stream);

    if (isInfected) {
      logger.error("[virusScan] Infected file rejected", {
        filename: file.originalname,
        viruses,
      });
      Sentry.captureMessage(
        `Infected file upload attempt: ${file.originalname}`,
        {
          level: "error",
          extra: { viruses },
        },
      );
      throw AppError.localized(
        "File failed virus scan",
        422,
        "errors:uploadInfected",
      );
    }

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    logger.error("[virusScan] AV service error", {
      error: (err as Error).message,
    });
    next(
      AppError.localized(
        "AV service unavailable",
        503,
        "errors:avServiceUnavailable",
      ),
    );
  }
}
