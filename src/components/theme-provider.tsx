"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";
import { I18nProvider, type Locale } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";
import { CrossPageWinToast } from "@/components/betting/cross-page-win-toast";

/**
 * Read the locale from the kp-locale cookie at first client paint so the
 * provider's initial state matches the server-rendered <html lang>. Without this
 * the provider boots in EN, then flips to the cookie value on the first effect
 * run, causing a flash of un-translated content.
 */
function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!match) return "en";
  const v = decodeURIComponent(match[1]);
  return v === "sw" || v === "fr" ? v : "en";
}

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="kp-theme"
      disableTransitionOnChange
      {...props}
    >
      <I18nProvider initial={readInitialLocale()}>
        <ToastProvider>
          <CrossPageWinToast />
          {children}
        </ToastProvider>
      </I18nProvider>
    </NextThemesProvider>
  );
}
