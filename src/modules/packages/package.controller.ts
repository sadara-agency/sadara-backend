import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import * as packageService from "./package.service";
import type {
  UpdatePackageConfigDTO,
  UpdatePlayerPackageDTO,
} from "./package.validation";

export async function getConfigs(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const configs = await packageService.getPackageConfigs();
    sendSuccess(res, configs);
  } catch (err) {
    next(err);
  }
}

export async function updateConfigs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await packageService.updatePackageConfig(
      req.body as UpdatePackageConfigDTO,
    );
    sendSuccess(res, null, "Package config updated");
  } catch (err) {
    next(err);
  }
}

export async function getPlayers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const players = await packageService.getPlayersByPackage();
    sendSuccess(res, players);
  } catch (err) {
    next(err);
  }
}

export async function updatePlayerPackage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await packageService.updatePlayerPackage(
      req.params.id,
      req.body as UpdatePlayerPackageDTO,
    );
    sendSuccess(res, null, "Player package updated");
  } catch (err) {
    next(err);
  }
}

export async function getModules(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const modules = packageService.getAvailableModules();
    sendSuccess(res, modules);
  } catch (err) {
    next(err);
  }
}
