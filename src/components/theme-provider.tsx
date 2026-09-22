"use client";

/**
 * 50pick providers — i18n + toast + the mid-tier-Android motion throttle.
 *
 * Single dark-royal theme by invariant (no light mode — see DESIGN_AUTHORITY
 * B3). `color-scheme: dark` lives on :root in globals.css, so there is NO theme
 * switching here. This component only: provides locale + toast, and applies the
 * user's reduce-motion choice + a `data-motion` throttle for low-end devices.
 */

import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { I18nProvider, LocaleChangeOverlay, type Locale } from "@/lib/i18n";
import { syncCardSpacingFromCookie } from "@/lib/card-spacing";
import { DEFAULT_LOCALE, localeOrDefault } from "@/lib/i18n-dict";
import { ToastProvider } from "@/components/ui/toast";
import { getPrefs } from "@/lib/haptics";

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  return localeOrDefault(m ? decodeURIComponent(m[1]) : null);
}

/** Heuristic: mid-tier Android ≤4 cores or ≤4GB RAM or explicit Save-Data. */
function detectLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) return true;
  if (nav.deviceMemory && nav.deviceMemory <= 4) return true;
  return false;
}

export function ThemeProvider({ children, initialLocale, initialDensity }: {
  children: ReactNode;
  initialLocale?: Locale;
  /** The card-spacing value the layout stamped on `<html>` this render (Mobile Visual Plan U2). */
  initialDensity?: "comfortable";
}) {
  // Card spacing: every commit that brings a new server value re-reads the cookie before paint, so a
  // `router.refresh()` that was in flight while the player switched can never put the old choice back
  // (`src/lib/card-spacing.ts` syncCardSpacingFromCookie explains the race).
  useLayoutEffect(() => {
    syncCardSpacingFromCookie();
  }, [initialDensity]);

  useEffect(() => {
    // Apply the user's in-app "Reduce motion" choice + the mid-tier-Android
    // throttle. "off" → minimal; low-end device → reduced; else full.
    try {
      const prefs = getPrefs();
      const userOff = prefs.motion === "off";
      document.documentElement.classList.toggle("kp-reduce-motion", userOff);
      const motionLevel = userOff ? "minimal" : detectLowEnd() ? "reduced" : "full";
      document.documentElement.setAttribute("data-motion", motionLevel);
    } catch { /* ignore */ }
  }, []);

  return (
    <I18nProvider initial={initialLocale ?? readInitialLocale()}>
      <ToastProvider>{children}</ToastProvider>
      <LocaleChangeOverlay />
    </I18nProvider>
  );
}
