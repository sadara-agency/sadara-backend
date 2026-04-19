import i18next from "i18next";
import enErrors from "../i18n/en/errors.json";
import arErrors from "../i18n/ar/errors.json";

i18next.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["errors"],
  defaultNS: "errors",
  resources: {
    en: { errors: enErrors },
    ar: { errors: arErrors },
  },
  interpolation: { escapeValue: false },
});

export { i18next };

/** Translate a namespace:key string into the given language.
 *  Returns undefined if the key has no translation (prevents leaking key strings). */
export function translateKey(
  key: string,
  lng: string,
  params?: Record<string, unknown>,
): string | undefined {
  const result = i18next.t(key, { lng, ...params }) as string;
  return result === key ? undefined : result;
}
