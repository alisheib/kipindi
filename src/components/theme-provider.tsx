"use client";

/**
 * 50pick providers — i18n + toast + the mid-tier-Android motion throttle.
 *
 * Single dark-royal theme by invariant (no light mode — see DESIGN_AUTHORITY
 * B3). `color-scheme: dark` lives on :root in globals.css, so there is NO theme
 * switching here. This component only: provides locale + toast, and applies the
 * user's reduce-motion choice + a `data-motion` throttle for low-end devices.
 */

import { useEffect, type ReactNode } from "react";
import { I18nProvider, LocaleChangeOverlay, type Locale } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";
import { getPrefs } from "@/lib/haptics";

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "sw" || v === "zh" ? v : "en";
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

export function ThemeProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
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
