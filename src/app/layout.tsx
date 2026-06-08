import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LazyOverlays } from "@/components/layout/lazy-overlays";
import "./globals.css";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jbm = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "50pick — Predict events. Not chance.",
    template: "%s · 50pick",
  },
  description: "Tanzania-licensed binary price-competition markets. Price Competition pool — winners share losers' stake. Mobile-first.",
  applicationName: "50pick",
  formatDetection: { telephone: false, email: false, address: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "50pick",
  },
  robots: { index: true, follow: true },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // viewport-fit=cover lets the app draw under the notch/home-indicator and is
  // REQUIRED for env(safe-area-inset-*) to return real values on iOS. Without it
  // the bottom-nav / sheets / menus that pad with safe-area-inset-bottom collapse
  // to 0 and sit flush against the home indicator on notched iPhones.
  viewportFit: "cover",
  themeColor: "#050817",
};

import { cookies } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const cookieLocale = jar.get("kp-locale")?.value;
  const lang = cookieLocale === "sw" || cookieLocale === "fr" ? cookieLocale : "en";
  return (
    <html lang={lang} suppressHydrationWarning className={`${sora.variable} ${inter.variable} ${jbm.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          {/* Lazy-loaded overlay components — ChatRoot + FirstVisitPrimer
              are portaled and not needed for FCP. The client wrapper uses
              dynamic() with ssr:false to defer their JS from the initial
              bundle. */}
          <Suspense fallback={null}>
            <LazyOverlays />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
