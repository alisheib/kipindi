"use client";

/**
 * Custom 50pick theme + i18n provider — replaces next-themes to keep React 19
 * happy (next-themes injects a <script> into the React tree, which trips
 * React 19's "script tag while rendering" warning).
 *
 * Strategy:
 *   - Theme is stored in `kp-theme` cookie + localStorage. Default = "dark".
 *   - The actual class is applied to <html> via a tiny boot-script in
 *     RootLayout's <head> (NOT inside React) before paint, so there's no FOUC.
 *   - This component only synchronises React-side state for the toggle.
 */

import { useEffect, type ReactNode } from "react";
import { I18nProvider, type Locale } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";

type Theme = "dark" | "light" | "system";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const m = document.cookie.match(/(?:^|; )kp-theme=([^;]*)/);
  if (m) {
    const v = decodeURIComponent(m[1]);
    if (v === "light" || v === "dark" || v === "system") return v;
  }
  try {
    const ls = localStorage.getItem("kp-theme");
    if (ls === "light" || ls === "dark" || ls === "system") return ls as Theme;
  } catch { /* localStorage blocked */ }
  return "dark";
}

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const resolved =
    t === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : t;
  const html = document.documentElement;
  html.classList.toggle("dark", resolved === "dark");
  html.classList.toggle("light", resolved === "light");
  html.setAttribute("data-theme", resolved);
}

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "sw" || v === "fr" ? v : "en";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Theme is purely a side-effect — the boot-script already applied the
  // class before paint. We just listen for OS-theme changes on "system".
  useEffect(() => {
    applyTheme(readTheme());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
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
 */
export const themeBootScript = `(function(){try{var t=document.cookie.match(/(?:^|; )kp-theme=([^;]*)/);t=t?decodeURIComponent(t[1]):null;if(!t){try{t=localStorage.getItem('kp-theme')}catch(e){}};if(!t)t='dark';var r=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var h=document.documentElement;h.classList.toggle('dark',r==='dark');h.classList.toggle('light',r==='light');h.setAttribute('data-theme',r);}catch(e){}})();`;

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
