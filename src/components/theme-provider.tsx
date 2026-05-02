"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/toast";
import { CrossPageWinToast } from "@/components/betting/cross-page-win-toast";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      storageKey="kp-theme"
      disableTransitionOnChange
      {...props}
    >
      <I18nProvider>
        <ToastProvider>
          <CrossPageWinToast />
          {children}
        </ToastProvider>
      </I18nProvider>
    </NextThemesProvider>
  );
}
