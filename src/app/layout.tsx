import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LazyOverlays } from "@/components/layout/lazy-overlays";
import { ScrollRestore } from "@/components/ui/scroll-restore";
import "./globals.css";
import "./state-tokens.css";
import "./micro-patterns.css";

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kipindi-production.up.railway.app";
const APP_DESC = "Tanzania-licensed prediction markets. Pick YES or NO on real events — winners share the losing pool. Mobile-first, bilingual EN/SW.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "50pick — Predict events. Not chance.",
    template: "%s · 50pick",
  },
  description: APP_DESC,
  applicationName: "50pick",
  formatDetection: { telephone: false, email: false, address: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "50pick",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-180.png", sizes: "180x180" },
  },
  robots: { index: true, follow: true },
  other: { "mobile-web-app-capable": "yes" },
  openGraph: {
    type: "website",
    siteName: "50pick",
    title: "50pick — Predict events. Not chance.",
    description: APP_DESC,
    locale: "en_US",
    images: [{ url: "/og/og-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "50pick — Predict events. Not chance.",
    description: APP_DESC,
    images: ["/og/twitter-1200x600.png"],
  },
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
  themeColor: "#0a0e33",
};

import { cookies } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const cookieLocale = jar.get("kp-locale")?.value;
  const lang = cookieLocale === "sw" || cookieLocale === "zh" ? cookieLocale : "en";
  return (
    <html lang={lang} suppressHydrationWarning className={`${sora.variable} ${inter.variable} ${jbm.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider initialLocale={lang}>
          <ScrollRestore />
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
