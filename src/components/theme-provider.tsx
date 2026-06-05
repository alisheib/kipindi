"use client";

/**
 * Custom 50pick theme + i18n provider — replaces next-themes to keep React 19
 * happy (next-themes injects a <script> into the React tree, which trips
 * React 19's "script tag while rendering" warning).
 *
 * Strategy:
 *   - Theme is "dark" or "light" only. Default = "dark" — first-time visitors
 *     always land in dark mode regardless of OS preference.
 *   - Stored in `kp-theme` cookie + localStorage; only flipped by an explicit
 *     toggle action.
 *   - The actual class is applied to <html> via a tiny boot-script in
 *     RootLayout's <head> (NOT inside React) before paint, so there's no FOUC.
 *   - This component only synchronises React-side state for the toggle.
 */

import { useEffect, type ReactNode } from "react";
import { I18nProvider, type Locale } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";
import { getPrefs } from "@/lib/haptics";

type Theme = "dark" | "light";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const m = document.cookie.match(/(?:^|; )kp-theme=([^;]*)/);
  if (m) {
    const v = decodeURIComponent(m[1]);
    if (v === "light" || v === "dark") return v;
  }
  try {
    const ls = localStorage.getItem("kp-theme");
    if (ls === "light" || ls === "dark") return ls as Theme;
  } catch { /* localStorage blocked */ }
  return "dark";
}

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("dark", t === "dark");
  html.classList.toggle("light", t === "light");
  html.setAttribute("data-theme", t);
}

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "sw" || v === "fr" ? v : "en";
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Theme is purely a side-effect — the boot-script already applied the
  // class before paint. Just keep the React tree in sync after hydration.
  useEffect(() => {
    applyTheme(readTheme());
    // Apply the user's in-app "Reduce motion" choice app-wide (only when they
    // explicitly chose "off" — "system" is already handled by the media query).
    try {
      const prefs = getPrefs();
      const userOff = prefs.motion === "off";
      document.documentElement.classList.toggle("kp-reduce-motion", userOff);
      // data-motion throttle for mid-tier Android: "full" | "reduced" | "minimal".
      // User explicit off → "minimal"; low-end device → "reduced"; else "full".
      const motionLevel = userOff
        ? "minimal"
        : detectLowEnd()
          ? "reduced"
          : "full";
      document.documentElement.setAttribute("data-motion", motionLevel);
    } catch { /* ignore */ }
  }, []);

  return (
    <I18nProvider initial={readInitialLocale()}>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}

/**
 * Boot-script that the layout renders into <head>. Apply the theme class
 * synchronously, BEFORE first paint, to prevent flash-of-wrong-theme.
 * Default = dark. We never fall back to OS preference, by design — dark is
 * the canonical 50pick mode.
 */
export const themeBootScript = `(function(){try{var t=document.cookie.match(/(?:^|; )kp-theme=([^;]*)/);t=t?decodeURIComponent(t[1]):null;if(!t){try{t=localStorage.getItem('kp-theme')}catch(e){}};if(t!=='light')t='dark';var h=document.documentElement;h.classList.toggle('dark',t==='dark');h.classList.toggle('light',t==='light');h.setAttribute('data-theme',t);}catch(e){}})();`;

/** Public theme API for the toggle component. */
export function setStoredTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.cookie = `kp-theme=${t}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  try { localStorage.setItem("kp-theme", t); } catch { /* blocked */ }
  applyTheme(t);
}

export function getStoredTheme(): Theme {
  return readTheme();
}
