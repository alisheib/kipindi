/**
 * Server-side i18n helper — reads the kp-locale cookie and returns the
 * typed dict section for the active locale. Use in server components
 * where the client-side useT() hook is unavailable.
 *
 * Usage:
 *   import { getServerT } from "@/lib/i18n-server";
 *   const { t, locale } = await getServerT();
 */
import { cookies } from "next/headers";
import { dict, localeOrDefault, type Locale, type Dict } from "./i18n-dict";

export type { Locale, Dict };
export { dict };

export async function getServerT(): Promise<{ t: Dict; locale: Locale }> {
  const jar = await cookies();
  // No choice yet → Swahili, the platform default (`localeOrDefault`).
  const locale: Locale = localeOrDefault(jar.get("kp-locale")?.value);
  return { t: dict[locale] as Dict, locale };
}
