import { Request, Response, NextFunction } from "express";
import { i18next } from "@config/i18n";

export function locale(req: Request, _res: Response, next: NextFunction): void {
  const headerLang = req.headers["accept-language"]
    ?.split(",")[0]
    ?.split("-")[0]
    ?.toLowerCase();

  const lang = headerLang === "ar" ? "ar" : "en";

  (req as any).locale = lang;
  (req as any).t = (key: string, params?: Record<string, unknown>): string =>
    i18next.t(key, { lng: lang, ...(params ?? {}) }) as string;

  next();
}
